"""Package one verified hosted macOS converted-F32 warm pair; never run synthesis."""
import argparse
import csv
import hashlib
import html
import importlib.util
import io
import json
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import sys
import wave
import zipfile

spec = importlib.util.spec_from_file_location('hosted_release_transport', Path(__file__).with_name('publish-hosted.py'))
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)
require, sha, unique, run, gh = transport.require, transport.sha, transport.unique, transport.run, transport.gh
REPO, FIXTURE = transport.REPO, transport.FIXTURE
MODEL = 'sano-heart-nano-gguf-f32'


def validate_recovered_job(job, jobs, recovery, artifact, verifier):
    """Accept a failed postprocessor only after separately pinned read-only validation."""
    require(job['status'] == 'completed' and job['conclusion'] == 'failure', 'Not the reviewed failed postprocessor run')
    scored, = [j for j in jobs if j['id'] == recovery['scoringJobId']]
    steps = {s['name']: s['conclusion'] for s in scored['steps']}
    needed = ['Verify exact source and lock', 'Import and verify generated Kokopop assets',
              'Capture hosted hardware and browser', 'Dry-run exact source-bound pair plan',
              'Run sequential full-article CPU and WebGPU pair',
              'Run actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02']
    require(all(steps.get(s) == 'success' for s in needed), 'Source/plan/assets/scoring/upload did not all succeed')
    require([s['name'] for s in scored['steps'] if s['conclusion'] == 'failure']
            == ['Validate pair receipts and selected audio'], 'Unexpected failed source step')
    a, v = recovery['artifact'], recovery['verifier']
    require((artifact['id'], artifact['name'], artifact['size_in_bytes'], artifact['digest'], artifact['expired'], artifact['workflow_run']['id'])
            == (a['id'], a['name'], a['bytes'], 'sha256:'+a['sha256'], False, job['id']), 'Wrong original immutable archive')
    require((verifier['id'], verifier['status'], verifier['conclusion'], verifier['head_sha'], verifier['head_branch'], verifier['path'])
            == (v['runId'], 'completed', 'success', v['headSha'], v['branch'], v['path']), 'Recovery verifier not successful at exact pin')


def download_archive(artifact_id, expected_sha, work):
    archive = work/'original-artifact.zip'
    with archive.open('wb') as f:
        subprocess.run(['gh','api',f'repos/{REPO}/actions/artifacts/{artifact_id}/zip'], stdout=f, check=True)
    require(sha(archive) == expected_sha, 'Original artifact archive digest differs')
    target = work/'original-artifact'; target.mkdir()
    with zipfile.ZipFile(archive) as z:
        require(z.testzip() is None, 'Corrupt original archive')
        for info in z.infolist():
            require(not Path(info.filename).is_absolute() and '..' not in Path(info.filename).parts
                    and (info.external_attr >> 16) & 0o170000 != 0o120000, 'Unsafe archive member')
        z.extractall(target)
    return target


def validate_receipt(compact, rid, backend, expected_hash, source, fingerprint):
    require(re.fullmatch(r'[a-z0-9][a-z0-9._-]{0,119}', rid), 'Invalid native result ID')
    path = unique(compact, rid+'/result.json')
    require(sha(path) == expected_hash, f'{backend}: native receipt changed from independent review')
    d = json.loads(path.read_bytes())
    c, = d['cells']
    require(d['id'] == rid and d['origin'] == 'native' and d['source']['dirty'] is False
            and d['source']['gitCommit'] == source and d['source']['manifestSha256'] == fingerprint, 'Wrong scoring source')
    require(d['fixture'] == {'id': 'english-20k-v1', 'sha256': FIXTURE, 'characters': 20000, 'chunks': 93}, 'Wrong full article')
    p = d['protocol']
    require((p['id'], p['scenario'], p['repetitions'], p['warmupRuns'], p['smoke'])
            == ('browser-tts-warm-v1', 'warm', 5, 1, False), 'Not the matched n5 warm protocol')
    effective = 'cpu/wasm' if backend == 'cpu' else 'webgpu+wasm'
    require((c['model'], c['backendRequested'], c['backendEffective'], c['status'])
            == (MODEL, backend, effective, 'measured'), 'Wrong converted F32 model/backend')
    e = d['environment']
    require(e['headless'] is False and e['os'].startswith('Darwin') and 'hosted' in e['machineLabel'].lower(), 'Not hosted headed macOS Chrome')
    require(len(c['trials']) == 5 and len(c['warmup']) == 1, 'Incomplete warm schedule')
    for field, prefix in [('warmup', 'warmup'), ('trials', 'trial')]:
        for i, trial in enumerate(c[field], 1):
            require(trial['index'] == i and json.loads(unique(compact, rid+f'/{prefix}-{i}.json').read_bytes()) == trial,
                    'Checkpoint differs from original receipt')
            v = trial['validation']
            require(v['finitePcm'] is True and v['nonemptyChunks'] is True and v['chunkCount'] == 93
                    and trial['sampleRate'] == 24000 and trial['samples'] > 720000 and trial['generationMs'] > 0,
                    'Incomplete or invalid full article')
            require(0 <= trial['metrics']['firstPcmMs'] <= trial['generationMs'], 'Invalid first-PCM timing')
            require(abs(trial['metrics']['realTimeFactor'] - trial['generationMs']/1000/(trial['samples']/24000)) < 1e-8, 'RTF differs')
    cap = c['capability']
    if backend == 'webgpu':
        require(cap.get('gpuDispatchVerified') is True and cap.get('dispatches', 0) > 0
                and cap.get('schedulerOperations', {}).get('MUL_MAT', 0) >= 4 and cap.get('hardwareAdapter'),
                'No actual untimed neural GPU dispatch/operator/adapter evidence')
    else:
        require(cap.get('gpuDispatchVerified') is False, 'CPU unexpectedly claims GPU dispatch')
    return path, d


def matched_pair(cpu, gpu):
    require(cpu['source'] == gpu['source'] and cpu['fixture'] == gpu['fixture'] and cpu['protocol'] == gpu['protocol'], 'Source/workload/protocol mismatch')
    inventory = lambda d: sorted((a['id'], a['bytes'], a['sha256']) for a in d['assets'])
    require(inventory(cpu) == inventory(gpu), 'Artifact closures differ')
    environment = lambda d: {k:v for k,v in d['environment'].items() if k != 'gpu'}
    require(environment(cpu) == environment(gpu), 'Pair did not run on matching host/Chrome conditions')
    a, b = cpu['cells'][0], gpu['cells'][0]
    require(all(a[k] == b[k] for k in ('model', 'voice', 'precision', 'settings')), 'Voice/precision/inference settings differ')
    medians = [statistics.median(t['generationMs']/1000 for t in c['trials']) for c in (a,b)]
    return {'cpuMedianSeconds': medians[0], 'webgpuMedianSeconds': medians[1], 'cpuOverWebgpu': medians[0]/medians[1],
            'nPerBackend': 5, 'excludedWarmupsPerBackend': 1, 'interpretation': 'Observed ratio for this converted F32 profile on this hosted macOS runner only'}


def package(compact, full_root, destination, *, source, fingerprint, workflow, run_id, selected, repo_root, recovery_proof=None):
    validated = {b: validate_receipt(compact, selected[b]['id'], b, selected[b]['sha256'], source, fingerprint) for b in ('cpu','webgpu')}
    pair = matched_pair(validated['cpu'][1], validated['webgpu'][1])
    destination.mkdir(parents=True, exist_ok=False)
    bundle = destination/'bundle'; bundle.mkdir()
    tag = f'sano-heart-nano-f32-hosted-macos-{source[:12]}-run-{run_id}'
    base = f'https://github.com/{REPO}/releases/download/{tag}/'
    manifest = {'schemaVersion': 1, 'scope': 'Supplemental hosted macOS converted F32 CPU/WebGPU pair; excluded from baseline M1 rankings',
        'model': MODEL, 'sourceCommit': source, 'sourceManifestSha256': fingerprint, 'diagnosticRunId': run_id,
        'diagnosticWorkflow': workflow, 'pair': pair, 'recordings': []}
    catalog = json.loads(run(['git','show',source+':assets.lock.json'], cwd=repo_root))['models'][MODEL]
    require(catalog['license']['model'] and catalog['support']['sources'], 'Missing source attribution')
    manifest['attribution'] = {'modelTerms': catalog['license']['model'], 'runtimeTerms': catalog['license'].get('runtime'), 'sources': catalog['support']['sources']}
    rows, waves, clips = [], {}, {}
    for backend, (receipt_path, d) in validated.items():
        c = d['cells'][0]; trial = c['trials'][-1]
        full = unique(full_root, d['id']+f'/{MODEL}-{backend}.wav')
        digest = sha(full)
        require(digest == trial['audio']['sha256'] and full.stat().st_size == trial['audio']['bytes'], 'Full scored WAV differs')
        with wave.open(str(full), 'rb') as w:
            require((w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getcomptype(),w.getnframes()) == (1,2,24000,'NONE',trial['samples']), 'Full WAV dimensions differ')
            prefix = w.readframes(720000)
            require(len(prefix) == 1440000, 'Full WAV shorter than exact30s clip')
        if digest not in waves:
            waves[digest] = f'heart-nano-f32-{backend}-full.wav'
            shutil.copyfile(full, destination/waves[digest])
        memory = io.BytesIO()
        with wave.open(memory, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(prefix)
        clip_bytes = memory.getvalue(); clip_hash = hashlib.sha256(clip_bytes).hexdigest()
        if clip_hash not in clips:
            clips[clip_hash] = f'heart-nano-f32-{backend}-30s.wav'
            (bundle/clips[clip_hash]).write_bytes(clip_bytes)
        raw_name = f'{backend}-native-result.json'
        shutil.copyfile(receipt_path,bundle/raw_name)
        # Checkpoint JSONs are tiny and retain excluded/scored evidence independently.
        for field,prefix_name in [('warmup','warmup'),('trials','trial')]:
            for i,t in enumerate(c[field],1):
                original = unique(compact,d['id']+f'/{prefix_name}-{i}.json')
                shutil.copyfile(original,bundle/f'{backend}-{prefix_name}-{i}.json')
        manifest['recordings'].append({'backend': backend, 'backendEffective': c['backendEffective'], 'resultId':d['id'], 'scenario':'warm', 'trialIndex':5,
            'sourceCommit': source,'receiptPath':raw_name,'receiptSha256':sha(receipt_path),'voice':c['voice'],'precision':c['precision'],
            'settings':c['settings'],'environment':d['environment'],'capability':c['capability'],
            'full':{'url':base+waves[digest],'sha256':digest,'bytes':full.stat().st_size,'samples':trial['samples'],'sampleRate':24000},
            'clip':{'path':clips[clip_hash],'sha256':clip_hash,'bytes':len(clip_bytes),'samples':720000,'sampleRate':24000,'pcmSha256':hashlib.sha256(prefix).hexdigest()}})
        for t in c['trials']:
            rows.append({'backend':backend,'effective_backend':c['backendEffective'],'observation':t['index'],'generation_s':t['generationMs']/1000,
                         'first_pcm_ms':t['metrics']['firstPcmMs'],'audio_s':t['samples']/24000,'rtf':t['metrics']['realTimeFactor'],
                         'result_id':d['id'],'source_commit':source})
    csv_text = io.StringIO(newline=''); writer=csv.DictWriter(csv_text,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    for out in (bundle,destination): (out/'measurements.csv').write_text(csv_text.getvalue())
    cpu, gpu = (validated[b][1] for b in ('cpu','webgpu'))
    env=cpu['environment']; cap=gpu['cells'][0]['capability']
    prose = ['# SanoTTS heart-nano converted F32 — hosted macOS CPU/WebGPU pair','',
        '**Supplemental hosted macOS results, excluded from the baseline Apple M1 Pro rankings.**','',
        f"Runner: {env['machineLabel']}; {env['cpu']}; {env['logicalCores']} logical cores; {env['ramBytes']} bytes RAM; {env['os']}; {env['chromeVersion']}; headed Chrome.",'',
        'Each backend ran one excluded full-article warm-up and five scored repetitions of the same 20,000 English characters across 93 canonical spans. No cached/RSS measurement is included.','',
        '| Backend | Median generation | Observed range | First PCM, median | Speech, median |','|---|---:|---:|---:|---:|']
    html_rows=[]
    for b in ('cpu','webgpu'):
        values=[r for r in rows if r['backend']==b]; seconds=[r['generation_s'] for r in values]
        numbers=[statistics.median(seconds),min(seconds),max(seconds),statistics.median(r['first_pcm_ms'] for r in values),statistics.median(r['audio_s'] for r in values)]
        prose.append(f'| {b} (n=5) | {numbers[0]:.6f} s | {numbers[1]:.6f}–{numbers[2]:.6f} s | {numbers[3]:.3f} ms | {numbers[4]:.3f} s |')
        html_rows.append(f'<tr><th>{b} · n=5</th><td>{numbers[0]:.6f} s</td><td>{numbers[1]:.6f}–{numbers[2]:.6f} s</td><td>{numbers[3]:.3f} ms</td><td>{numbers[4]:.3f} s</td></tr>')
    ratio=pair['cpuOverWebgpu']
    prose += ['',f'Observed CPU median / WebGPU median: **{ratio:.6f}×**. This ratio applies only to the same converted F32 profile, source, assets, voice and settings on this hosted runner. It is not a comparison with the official INT8 Sano browser profile.','',
              'F32 GGUF expands the exact pinned upstream Q8 front/model blobs; it does not recover original pre-quantization weights. Each canonical span is submitted as one offline request; the pinned Kokopop LONG_FORM runtime may normalize and split it to its internal model budget, derive internal chunk seeds, and insert pauses or crossfades. This is not an assertion of the same frontend or text handling as the official INT8 profile.','',
              f"WebGPU effective backend is `{gpu['cells'][0]['backendEffective']}`. The separate untimed probe recorded {cap['dispatches']} actual GPU dispatches and scheduler-assigned neural operations `{json.dumps(cap['schedulerOperations'],sort_keys=True)}`. WASM work remains; the probe is not an assertion that every timed operation used the GPU.",'',
              f'[Listen, CSV, original receipts and checkpoints]({base}listen-and-measure.zip) · [Exact source](https://github.com/{REPO}/tree/{source}) · [Source job]({workflow["url"]}) · [Recording manifest]({base}recordings.json)','']
    players=[]
    for r in manifest['recordings']:
        prose += [f"- {r['backend']} trial5 · `{r['resultId']}` · [Original full WAV]({r['full']['url']}) · SHA-256 `{r['full']['sha256']}`"]
        players.append(f'<section><h2>{r["backend"]} · scored trial 5</h2><audio controls preload="none" src="{r["clip"]["path"]}"></audio><p>Exact first 30 seconds, unchanged PCM. <a href="{html.escape(r["full"]["url"])}">Original full WAV</a></p></section>')
    prose += ['', '## Individual scored articles', '', '| Backend | Trial | Generation (s) | First PCM (ms) | Speech (s) |', '|---|---:|---:|---:|---:|',
              *[f"| {r['backend']} | {r['observation']} | {r['generation_s']:.6f} | {r['first_pcm_ms']:.3f} | {r['audio_s']:.3f} |" for r in rows]]
    prose += ['',f"SanoTTS by Ampixa; heartnano English (US) voice; Kokopop converted runtime. Model: {catalog['license']['model']}; runtime: {catalog['license'].get('runtime')}. Only generated evaluation recordings and receipts are distributed; no weights or runtime binaries.",
              *[f'- [Pinned attribution source]({url})' for url in catalog['support']['sources']], '']
    report='\n'.join(prose)
    if workflow.get('recovery'):
        r = workflow['recovery']
        report += ('\nThe original scoring and artifact upload steps succeeded, but its post-run verification step failed with a verifier syntax error. '
                   f'A separate [read-only artifact verifier]({r["verifierUrl"]}) subsequently passed without synthesis. '
                   f'The original archive `{r["artifact"]["id"]}` is pinned by SHA-256 `{r["artifact"]["sha256"]}`. '
                   'Both original native receipts and recordings are preserved unchanged.\n')
    for out in (bundle,destination):
        (out/'report.md').write_text(report)
        (out/'recordings.json').write_text(json.dumps(manifest,indent=2)+'\n')
        if recovery_proof: shutil.copyfile(recovery_proof,out/'recovery-verification.json')
    body='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heart-nano converted F32 · hosted macOS</title><style>body{font:1rem/1.5 system-ui,sans-serif;max-width:62rem;margin:3rem auto;padding:0 1rem}table{border-collapse:collapse}th,td{padding:.6rem;text-align:left;border-bottom:1px solid #ccc}audio{width:100%;max-width:35rem}a{color:inherit}</style><h1>Heart-nano converted F32</h1><p>Supplemental hosted macOS CPU/WebGPU pair; excluded from baseline M1 rankings.</p>'''
    body+=f'<p>{html.escape(env["cpu"])} · {env["logicalCores"]} logical cores · {html.escape(env["chromeVersion"])}</p><table><tr><th>Backend</th><th>Median</th><th>Range</th><th>First PCM</th><th>Speech duration</th></tr>'+''.join(html_rows)+'</table>'
    body+=f'<p>CPU median / WebGPU median: {ratio:.6f}×. Five scored articles per backend after an excluded full warm-up, same converted source/profile/settings.</p>'+''.join(players)
    body+='<details><summary>All ten scored articles</summary><table><tr><th>Backend</th><th>Trial</th><th>Generation</th><th>First PCM</th><th>Speech</th></tr>'+''.join(
        f"<tr><td>{r['backend']}</td><td>{r['observation']}</td><td>{r['generation_s']:.6f} s</td><td>{r['first_pcm_ms']:.3f} ms</td><td>{r['audio_s']:.3f} s</td></tr>" for r in rows)+'</table></details>'
    body+='<p><a href="report.md">Complete report, hardware/dispatch evidence and credits</a> · <a href="measurements.csv">All ten timings CSV</a> · <a href="recordings.json">Hashes and provenance</a></p></html>'
    (bundle/'index.html').write_text(body)
    archive=destination/'listen-and-measure.zip'
    with zipfile.ZipFile(archive,'w') as z:
        for path in sorted(bundle.iterdir()):
            info=zipfile.ZipInfo(path.name,date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,path.read_bytes(),compresslevel=1)
    with zipfile.ZipFile(archive) as z: require(z.testzip() is None,'Bad ZIP')
    files=sorted(p for p in destination.iterdir() if p.is_file())
    (destination/'checksums.json').write_text(json.dumps({p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in files},indent=2)+'\n')
    return tag,files+[destination/'checksums.json']


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('source','fingerprint','workflow-head','workflow-branch','workflow-path','compact-artifact','full-artifact','cpu-id','gpu-id','cpu-receipt-sha','gpu-receipt-sha'):
        p.add_argument('--'+name,required=True)
    p.add_argument('--run-id',type=int,required=True);p.add_argument('--work',type=Path,required=True)
    p.add_argument('--recovery',type=Path,help='Explicit reviewed archive and successful no-inference verifier pins')
    p.add_argument('--prepare-only',action='store_true',help='Validate/package actual artifacts without creating or modifying a release')
    a=p.parse_args()
    require(all(re.fullmatch('[a-f0-9]{40}',x) for x in (a.source,a.workflow_head)),'Exact commits required')
    require(all(re.fullmatch('[a-f0-9]{64}',x) for x in (a.fingerprint,a.cpu_receipt_sha,a.gpu_receipt_sha)),'Exact source/receipt hashes required')
    job=gh('api',f'repos/{REPO}/actions/runs/{a.run_id}')
    require((job['head_sha'],job['head_branch'],job['path'])
            == (a.workflow_head,a.workflow_branch,a.workflow_path),'Pair job workflow pin differs')
    a.work.mkdir(parents=True,exist_ok=False)
    artifact_roots = {}
    recovery = None
    if a.recovery:
        recovery = json.loads(a.recovery.read_bytes())
        jobs = gh('api',f'repos/{REPO}/actions/runs/{a.run_id}/jobs')['jobs']
        original = gh('api',f'repos/{REPO}/actions/artifacts/{recovery["artifact"]["id"]}')
        verifier = gh('api',f'repos/{REPO}/actions/runs/{recovery["verifier"]["runId"]}')
        validate_recovered_job(job,jobs,recovery,original,verifier)
        require(a.compact_artifact == a.full_artifact == recovery['artifact']['name'], 'Recovery must use only original combined archive')
        proof_root = a.work/'recovery-proof'
        run(['gh','run','download',str(recovery['verifier']['runId']),'--repo',REPO,
             '--name',recovery['verifier']['artifactName'],'--dir',str(proof_root)])
        proof = unique(proof_root,recovery['verifier']['proofPath'])
        require(sha(proof) == recovery['verifier']['proofSha256'], 'Independent verifier proof changed')
        verified = json.loads(proof.read_bytes())
        require(verified['verificationStatus'] == 'passed' and verified['kind'] == 'posthoc-artifact-verification-no-inference'
                and verified['originalRun']['id'] == a.run_id and verified['originalRun']['jobId'] == recovery['scoringJobId']
                and verified['originalArtifact']['id'] == original['id']
                and verified['originalArtifact']['digest'] == original['digest']
                and verified['source']['commit'] == a.source and verified['source']['manifestSha256'] == a.fingerprint,
                'Recovery proof does not bind the original source/archive')
        for b,rid,digest in [('cpu',a.cpu_id,a.cpu_receipt_sha),('webgpu',a.gpu_id,a.gpu_receipt_sha)]:
            require((verified['profiles'][b]['resultId'],verified['profiles'][b]['receiptSha256']) == (rid,digest), 'Recovery native receipt pin differs')
        # The exact proof bytes were independently reviewed; keep them with release evidence.
        recovery['verifierUrl'] = verifier['html_url']
        recovery['scoringJobUrl'] = next(j['html_url'] for j in jobs if j['id'] == recovery['scoringJobId'])
        artifact_roots[a.compact_artifact] = download_archive(original['id'],recovery['artifact']['sha256'],a.work)
    else:
        require((job['status'],job['conclusion']) == ('completed','success'),'Pair job is not successful')
        for short,name in [('compact',a.compact_artifact),('full',a.full_artifact)]:
            if name not in artifact_roots:
                artifact_roots[name] = a.work/short
                run(['gh','run','download',str(a.run_id),'--repo',REPO,'--name',name,'--dir',str(artifact_roots[name])])
    selected={'cpu':{'id':a.cpu_id,'sha256':a.cpu_receipt_sha},'webgpu':{'id':a.gpu_id,'sha256':a.gpu_receipt_sha}}
    workflow={k:job[k] for k in ('head_sha','head_branch','path','event')};workflow['url']=job['html_url']
    if recovery: workflow['recovery'] = recovery
    tag,files=package(artifact_roots[a.compact_artifact],artifact_roots[a.full_artifact],a.work/'release',source=a.source,fingerprint=a.fingerprint,
        workflow=workflow,run_id=a.run_id,selected=selected,repo_root=Path.cwd(),recovery_proof=proof if recovery else None)
    if recovery:
        packaged = json.loads((a.work/'release/recordings.json').read_bytes())
        for record in packaged['recordings']:
            expected = verified['profiles'][record['backend']]
            require(all(record['full'][k] == expected['selectedFinalTrialFullWav'][k] for k in ('sha256','bytes','samples','sampleRate')),
                    'Packaged original WAV differs from verified WAV')
            require(record['clip']['sha256'] == expected['selectedFinalTrialPreviewUpTo30s']['sha256'], 'Exact 30s prefix differs from independent verifier')
    if a.prepare_only:
        print(json.dumps({'prepared':True,'releaseTag':tag,'published':False}))
        return
    transport.publish(tag,files,a.source,a.run_id,title='SanoTTS heart-nano converted F32 · hosted macOS CPU/WebGPU n=5 pair',
        scope='Supplemental hosted macOS converted F32 only; excluded from baseline M1 rankings')


if __name__ == '__main__':main()
