"""Publish only a successful hosted heart-nano diagnostic; run on a hosted runner."""
import argparse
import hashlib
import html
import io
import json
import math
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import sys
import time
import urllib.request
import wave
import zipfile

REPO = 'ngelik/tts-bench'
MODEL = 'sano-heart-nano'
FIXTURE = '4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b'


def run(args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


def gh(*args):
    return json.loads(run(['gh', *args]))


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def unique(root, suffix):
    matches = [p for p in root.rglob(suffix) if p.is_file() and not p.is_symlink()]
    require(len(matches) == 1, f'Expected exactly one {suffix}: {matches}')
    return matches[0]


def verify_record(record, evidence, full_root, source):
    receipt_path = unique(evidence, record['runId']+'/result.json')
    raw = receipt_path.read_bytes()
    data = json.loads(raw)
    require(data == json.loads((unique(evidence, 'verification.json').parent/(record['label']+'-result.json')).read_bytes()),
            'Compact receipt differs from original native receipt')
    cell, = data['cells']
    scenario = 'warm' if record['label'] == 'warm-trial-5' else 'cached'
    n, warmups = (5, 1) if scenario == 'warm' else (1, 0)
    require(data['id'] == record['runId'] and data['origin'] == 'native' and data['source']['dirty'] is False
            and data['source']['gitCommit'] == source, 'Unexpected native source')
    require(data['fixture'] == {'id': 'english-20k-v1', 'sha256': FIXTURE, 'characters': 20000, 'chunks': 93}, 'Wrong article')
    require((cell['model'], cell['backendRequested'], cell['backendEffective'], cell['status'])
            == (MODEL, 'cpu', 'cpu/wasm', 'measured'), 'Wrong measured profile')
    p = data['protocol']
    require((p['scenario'], p['repetitions'], p['warmupRuns'], p['smoke']) == (scenario, n, warmups, False), 'Wrong protocol')
    require(p['id'] == f'browser-tts-{scenario}-v1'+('-resources' if scenario == 'cached' else ''), 'Wrong protocol ID')
    env = data['environment']
    require(env['headless'] is False and 'linux' in env['os'].lower() and 'hosted' in env['machineLabel'].lower(), 'Not the supplemental hosted environment')
    require(len(cell['trials']) == n and len(cell['warmup']) == warmups, 'Incomplete schedule')
    for field, prefix in [('trials', 'trial'), ('warmup', 'warmup')]:
        for i, trial in enumerate(cell[field], 1):
            require(json.loads(unique(evidence, record['runId']+f'/{prefix}-{i}.json').read_bytes()) == trial, 'Native article checkpoint differs')
            v = trial['validation']
            require(v['finitePcm'] and v['nonemptyChunks'] and v['chunkCount'] == 93
                    and trial['sampleRate'] == 24000 and trial['samples'] > 720000 and trial['generationMs'] > 0, 'Invalid full article')
    trial = cell['trials'][-1]
    full = unique(full_root, record['runId']+'/sano-heart-nano-cpu.wav')
    require(sha(full) == trial['audio']['sha256'] == record['fullWavSha256']
            and full.stat().st_size == trial['audio']['bytes'] == record['fullWavBytes'], 'Full WAV digest/size mismatch')
    clip = unique(evidence, record['prefixPath'])
    with wave.open(str(full), 'rb') as w, wave.open(str(clip), 'rb') as c:
        require((w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes(), w.getcomptype())
                == (1, 2, 24000, trial['samples'], 'NONE') and record['fullFrames'] == trial['samples'], 'Full WAV PCM mismatch')
        require((c.getnchannels(), c.getsampwidth(), c.getframerate(), c.getnframes(), c.getcomptype())
                == (1, 2, 24000, 720000, 'NONE'), 'Clip is not exactly 30 seconds')
        pcm = c.readframes(720000)
        require(pcm == w.readframes(720000) and hashlib.sha256(pcm).hexdigest() == record['prefixPcmSha256'], 'Clip changed original PCM')
    return data, raw, full, clip


def package(compact, full_root, destination, source, run_id, exporter, repo_root, receipt_hashes, workflow_evidence):
    proof_path = unique(compact, 'verification.json')
    proof = json.loads(proof_path.read_bytes())
    require(proof['sourceCommit'] == source and proof['fixtureSha256'] == FIXTURE
            and {r['label'] for r in proof['recordings']} == {'warm-trial-5', 'cached-trial-1'}
            and len(proof['recordings']) == 2, 'Wrong or duplicate diagnostic proof')
    destination.mkdir(parents=True, exist_ok=False)
    bundle = destination/'bundle'
    bundle.mkdir()
    actions = f'https://github.com/{REPO}/actions/runs/{run_id}'
    subprocess.run([sys.executable, str(exporter), str(compact), str(bundle), actions], check=True)
    tag = f'sano-heart-nano-hosted-cpu-{source[:12]}-run-{run_id}'
    base = f'https://github.com/{REPO}/releases/download/{tag}/'
    manifest = {'schemaVersion': 1, 'scope': 'Supplemental hosted Linux Chrome CPU diagnostic; excluded from M1 rankings',
                'sourceCommit': source, 'runId': run_id, 'runUrl': actions, 'fixtureSha256': FIXTURE,
                'diagnosticWorkflow': workflow_evidence,
                'recordings': [], 'warmScoredRepetitions': 5, 'warmupExcluded': 1, 'cachedObservations': 1}
    unique_waves, receipts = {}, {}
    for record in sorted(proof['recordings'], key=lambda r: r['label'] != 'warm-trial-5'):
        data, raw, full, clip = verify_record(record, compact, full_root, source)
        require(hashlib.sha256(raw).hexdigest() == receipt_hashes[data['protocol']['scenario']],
                'Original receipt does not match the independently supplied SHA-256')
        receipts[data['protocol']['scenario']] = data
        digest = record['fullWavSha256']
        if digest not in unique_waves:
            filename = 'sano-heart-nano-full.wav' if record['label'] == 'warm-trial-5' else 'sano-heart-nano-cached-full.wav'
            shutil.copyfile(full, destination/filename)
            unique_waves[digest] = filename
        clip_name = 'heart-nano-30s.wav' if record['label'] == 'warm-trial-5' else 'heart-nano-cached-30s.wav'
        warm_clip = bundle/'heart-nano-30s.wav'
        if record['label'] == 'cached-trial-1' and clip.read_bytes() == warm_clip.read_bytes():
            clip_name = 'heart-nano-30s.wav'
        else:
            shutil.copyfile(clip, bundle/clip_name)
        raw_name = data['protocol']['scenario']+'-native-result.json'
        (bundle/raw_name).write_bytes(raw)
        manifest['recordings'].append({'label': record['label'], 'resultId': data['id'], 'scenario': data['protocol']['scenario'],
            'trialIndex': 5 if data['protocol']['scenario'] == 'warm' else 1, 'sourceCommit': source,
            'receipt': raw_name, 'receiptSha256': hashlib.sha256(raw).hexdigest(),
            'environment': data['environment'], 'voice': data['cells'][0]['voice'], 'settings': data['cells'][0]['settings'],
            'clip': {'path': clip_name, 'sha256': sha(bundle/clip_name), 'bytes': (bundle/clip_name).stat().st_size, 'samples': 720000, 'sampleRate': 24000},
            'full': {'url': base+unique_waves[digest], 'sha256': digest, 'bytes': full.stat().st_size, 'samples': record['fullFrames'], 'sampleRate': 24000}})
    warm, cached = receipts['warm'], receipts['cached']
    require(warm['environment'] == cached['environment'] and warm['assets'] == cached['assets'], 'Separate cells differ in environment/assets')
    rows = warm['cells'][0]['trials']
    times = [t['generationMs']/1000 for t in rows]
    mem = cached['cells'][0]['trials'][0]
    samples = mem['memory']['samples']
    require(mem['memory']['availability'] == 'measured' and len(samples) >= 2
            and all(mem['memory']['generationStartedAtEpochMs'] <= at <= mem['memory']['finalPcmAtEpochMs'] for at, rss in samples), 'Invalid cached RSS sampling interval')
    require(math.floor(statistics.mean(rss for at, rss in samples) + 0.5) == mem['metrics']['generationMeanRssBytes'], 'Cached RSS mean differs')
    catalog = json.loads(run(['git', 'show', source+':assets.lock.json'], cwd=repo_root))['models'][MODEL]
    manifest['attribution'] = {'model': catalog['displayName'], 'modelTerms': catalog['license']['model'],
                               'runtimeTerms': catalog['license'].get('runtime'), 'sources': catalog['support']['sources']}
    env = warm['environment']
    lines = ['# SanoTTS heart-nano — supplemental hosted Chrome CPU diagnostic', '',
        '**Hosted Linux results, excluded from the Apple M1 Pro rankings.**', '',
        f"Hardware: {env['cpu']}; {env['logicalCores']} logical cores; {env['ramBytes']} bytes RAM. {env['chromeVersion']}; headed Chrome.", '',
        '| Measurement | Result |', '|---|---:|',
        f'| Warm median, five scored full articles | {statistics.median(times):.6f} s |',
        f'| Warm observed range | {min(times):.6f}–{max(times):.6f} s |',
        f"| Warm first PCM, median | {statistics.median(t['metrics']['firstPcmMs'] for t in rows):.3f} ms |",
        f"| Speech duration, median | {statistics.median(t['samples']/t['sampleRate'] for t in rows):.3f} s |",
        f"| Cached full article, separate n=1 | {mem['generationMs']/1000:.6f} s |",
        f"| Mean Chrome RSS, separate cached n=1 | {mem['metrics']['generationMeanRssBytes']/1e6:.6f} MB |", '',
        'Each article uses the same 20,000 characters and 93 spans. One complete warm-up is excluded from the five timed warm articles. First PCM includes opening text processing and synthesis. Memory includes the owned Chrome process tree.', '',
        f'[Download the listening report, exact 30-second excerpt, CSV and original receipts]({base}listen-and-measure.zip). Extract it and open `index.html`.', '',
        f'[Original workflow and artifact provenance]({actions}) · [Exact source](https://github.com/{REPO}/tree/{source}) · [SHA-256 recording manifest]({base}recordings.json)', '']
    for record in manifest['recordings']:
        lines.append(f"- {record['label']} · `{record['resultId']}` · [full WAV]({record['full']['url']}) · SHA-256 `{record['full']['sha256']}`")
    if len(unique_waves) == 1:
        lines += ['', 'The selected warm and cached recordings are byte-identical. One original full WAV is shared by both receipt references.']
    lines += ['', f"SanoTTS by Ampixa; heart-nano English (US) voice. Model terms: {catalog['license']['model']}; browser implementation: {catalog['license'].get('runtime')}. These are generated evaluation recordings; no model/runtime binaries are redistributed here.",
              *[f'- [Pinned source]({url})' for url in catalog['support']['sources']], '']
    report = '\n'.join(lines)
    (destination/'report.md').write_text(report)
    (bundle/'report.md').write_text(report)
    markup = (bundle/'listen.html').read_text()
    addition = '<p><strong>Supplemental hosted Linux CPU diagnostic; excluded from M1 rankings.</strong></p><p><a href="'+html.escape(manifest['recordings'][0]['full']['url'])+'">Original full WAV · warm trial 5</a> · <a href="report.md">Report, attribution and exact sources</a></p>'
    require('</h1>' in markup, 'Exporter HTML structure changed')
    markup = markup.replace('</h1>', '</h1>'+addition, 1)
    (bundle/'index.html').write_text(markup)
    (bundle/'listen.html').unlink()
    encoded = json.dumps(manifest, indent=2)+'\n'
    (destination/'recordings.json').write_text(encoded)
    (bundle/'recordings.json').write_text(encoded)
    shutil.copyfile(bundle/'measurements.csv', destination/'measurements.csv')
    archive = destination/'listen-and-measure.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as z:
        for path in sorted(bundle.iterdir()):
            require(path.is_file(), 'Unexpected package member')
            info = zipfile.ZipInfo(path.name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, path.read_bytes(), compresslevel=1)
    with zipfile.ZipFile(archive) as z:
        require(z.testzip() is None, 'Bad listening ZIP')
    files = sorted(p for p in destination.iterdir() if p.is_file())
    sums = {p.name: {'sha256': sha(p), 'bytes': p.stat().st_size} for p in files}
    (destination/'checksums.json').write_text(json.dumps(sums, indent=2)+'\n')
    return tag, files+[destination/'checksums.json']


def publish(tag, files, source, run_id, *, title='SanoTTS heart-nano · supplemental hosted Chrome CPU · warm n=5 + cached n=1',
            scope='hosted Linux supplemental only; no M1 results submitted'):
    result = subprocess.run(['gh', 'release', 'view', tag, '--repo', REPO, '--json', 'isDraft,assets,url'], text=True, capture_output=True)
    if result.returncode:
        run(['gh', 'release', 'create', tag, '--repo', REPO, '--target', source, '--draft', '--latest=false',
             '--title', title, '--notes-file', str(files[0].parent/'report.md')])
    release = gh('release', 'view', tag, '--repo', REPO, '--json', 'isDraft,assets,url')
    existing = {a['name']: a for a in release['assets']}
    require(set(existing) <= {p.name for p in files}, 'Unexpected assets on immutable release')
    for path in files:
        if path.name in existing:
            a = existing[path.name]
            require(a['size'] == path.stat().st_size and a.get('digest') == 'sha256:'+sha(path), 'Existing release asset differs')
        else:
            require(release['isDraft'], 'Cannot add missing content to a published immutable release')
            run(['gh', 'release', 'upload', tag, str(path), '--repo', REPO])
    # Draft readback verifies actual downloaded bytes before making the release public.
    readback = files[0].parent/'draft-readback'
    readback.mkdir(exist_ok=True)
    run(['gh', 'release', 'download', tag, '--repo', REPO, '--dir', str(readback), '--clobber'])
    for path in files:
        require(sha(readback/path.name) == sha(path) and (readback/path.name).stat().st_size == path.stat().st_size, 'Release draft readback differs')
    if release['isDraft']:
        run(['gh', 'release', 'edit', tag, '--repo', REPO, '--draft=false', '--latest=false'])
    release = gh('release', 'view', tag, '--repo', REPO, '--json', 'isDraft,assets,url')
    require(not release['isDraft'], 'Release is still a draft')
    for a in release['assets']:
        h, size = hashlib.sha256(), 0
        for attempt in range(6):
            try:
                response = urllib.request.urlopen(a['url'], timeout=120)
                break
            except Exception:
                if attempt == 5: raise
                time.sleep(5)
        with response:
            while block := response.read(1024*1024): h.update(block); size += len(block)
        local = next(p for p in files if p.name == a['name'])
        require(size == local.stat().st_size and h.hexdigest() == sha(local), 'Anonymous public readback differs')
    latest = gh('api', f'repos/{REPO}/releases/latest')
    require(latest['tag_name'] != tag, 'Supplemental release incorrectly became latest')
    proof = {'releaseUrl': release['url'], 'tag': tag, 'sourceCommit': source, 'diagnosticRunId': run_id,
             'scope': scope, 'latest': False,
             'diagnosticWorkflow': json.loads((files[0].parent/'recordings.json').read_bytes())['diagnosticWorkflow'],
             'publicAssets': [{k:a.get(k) for k in ('name', 'size', 'digest', 'url')} for a in release['assets']]}
    (files[0].parent/'public-verification.json').write_text(json.dumps(proof, indent=2)+'\n')
    print(json.dumps(proof))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run-id', type=int, required=True)
    p.add_argument('--source', required=True)
    p.add_argument('--workflow-head', required=True)
    p.add_argument('--workflow-branch', required=True)
    p.add_argument('--workflow-path', required=True)
    p.add_argument('--warm-receipt-sha', required=True)
    p.add_argument('--cached-receipt-sha', required=True)
    p.add_argument('--exporter', type=Path, required=True)
    p.add_argument('--work', type=Path, required=True)
    args = p.parse_args()
    require(re.fullmatch('[a-f0-9]{40}', args.source), 'Full source SHA required')
    require(re.fullmatch('[a-f0-9]{40}', args.workflow_head), 'Full diagnostic workflow SHA required')
    require(re.fullmatch(r'\.github/workflows/[a-z0-9._-]+\.ya?ml', args.workflow_path), 'Exact diagnostic workflow path required')
    require(all(re.fullmatch('[a-f0-9]{64}', h) for h in (args.warm_receipt_sha, args.cached_receipt_sha)), 'Independently verified receipt hashes required')
    job = gh('api', f'repos/{REPO}/actions/runs/{args.run_id}')
    require(job['conclusion'] == 'success' and job['status'] == 'completed' and job['event'] in ('workflow_dispatch', 'push')
            and job['head_sha'] == args.workflow_head and job['head_branch'] == args.workflow_branch
            and job['path'] == args.workflow_path,
            'Diagnostic has not successfully completed on the explicitly reviewed workflow source/branch')
    args.work.mkdir(parents=True, exist_ok=False)
    for short, name in [('compact', 'sano-heart-nano-hosted-diagnostic-compact'), ('full', 'sano-heart-nano-hosted-diagnostic-full-wavs')]:
        run(['gh', 'run', 'download', str(args.run_id), '--repo', REPO, '--name', name, '--dir', str(args.work/short)])
    tag, files = package(args.work/'compact', args.work/'full', args.work/'release', args.source, args.run_id,
                         args.exporter.resolve(), Path.cwd(), {'warm': args.warm_receipt_sha, 'cached': args.cached_receipt_sha},
                         {'headSha': args.workflow_head, 'branch': args.workflow_branch, 'path': args.workflow_path,
                          'event': job['event'], 'url': job['html_url'], 'conclusion': job['conclusion']})
    publish(tag, files, args.source, args.run_id)


if __name__ == '__main__': main()
