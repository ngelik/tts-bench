"""Make the listening report from the hosted article receipts and verified WAV prefix."""
import csv
import hashlib
import html
import json
import math
import shutil
import statistics
import sys
import wave
from pathlib import Path

evidence, out = (Path(p).resolve() for p in sys.argv[1:3])
actions_url = sys.argv[3]
fixture_hash = "4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b"
proof = json.loads(next(evidence.rglob('verification.json')).read_bytes())
root = next(evidence.rglob('verification.json')).parent
results = {}
for record in proof['recordings']:
    label = record['label']
    d = json.loads((root / (label + '-result.json')).read_bytes())
    c, = d['cells']
    assert d['id'] == record['runId'] and not d['source']['dirty'] and d['source']['gitCommit'] == proof['sourceCommit']
    assert d['fixture']['sha256'] == proof['fixtureSha256'] == fixture_hash and d['fixture']['characters'] == 20000
    assert not d['protocol']['smoke'] and not d['environment']['headless']
    assert c['model'] == 'sano-heart-nano' and c['status'] == 'measured' and c['backendEffective'] == 'cpu/wasm'
    assert all(t['sampleRate'] == 24000 and t['samples'] > 0 and t['validation']['finitePcm']
               and t['validation']['nonemptyChunks'] and t['validation']['chunkCount'] == 93
               for t in c['trials'] + c['warmup'])
    assert c['trials'][-1]['audio']['sha256'] == record['fullWavSha256']
    path = root / record['prefixPath']
    with wave.open(str(path), 'rb') as wav:
        assert (wav.getnchannels(), wav.getframerate(), wav.getsampwidth(), wav.getnframes()) == (1, 24000, 2, 720000)
        pcm = wav.readframes(720000)
        assert hashlib.sha256(pcm).hexdigest() == record['prefixPcmSha256']
        assert len(set(pcm[:32000])) > 1
    results[d['protocol']['scenario']] = (d,c,path)
warm,cell,clip = results['warm']
cached,ccell,_ = results['cached']
assert warm['environment'] == cached['environment'] and warm['assets'] == cached['assets']
assert len(cell['warmup']) == 1 and len(cell['trials']) == warm['protocol']['repetitions'] == 5
assert len(ccell['warmup']) == 0 and len(ccell['trials']) == 1
resource, = ccell['trials']
assert resource['memory']['availability'] == 'measured'
assert resource['metrics']['generationRssSampleCount'] == len(resource['memory']['samples']) > 0
fields = ('scenario','observation','generation_s','first_pcm_ms','audio_s','rtf','mean_chrome_mb','sample_count','result_id')
rows = []
for d,c in ((warm,cell),(cached,ccell)):
    for t in c['trials']:
        rows.append(dict(scenario=d['protocol']['scenario'], observation=t['index'],
                         generation_s=t['generationMs']/1000, first_pcm_ms=t['metrics']['firstPcmMs'],
                         audio_s=t['samples']/t['sampleRate'], rtf=t['metrics']['realTimeFactor'],
                         mean_chrome_mb=t['metrics']['generationMeanRssBytes']/1e6 if t is resource else '',
                         sample_count=len(t['memory']['samples']) if t is resource else '', result_id=d['id']))
out.mkdir(parents=True,exist_ok=True)
with (out/'measurements.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
shutil.copyfile(clip,out/'heart-nano-30s.wav')
for name in ['verification.json','warm-trial-5-result.json','cached-trial-1-result.json']:
    shutil.copyfile(root/name,out/name)
w=rows[:5]
med=lambda field: statistics.median(r[field] for r in w)
env=warm['environment']
ram=rows[-1]['mean_chrome_mb']
max_s=math.ceil(max(r['generation_s'] for r in w))
bars=''.join(f"<li>Run {r['observation']} <meter min='0' max='{max_s}' value='{r['generation_s']}'></meter> {r['generation_s']:.2f} s</li>" for r in w)
page=f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SanoTTS heart-nano · hosted Chrome benchmark</title><style>
:root{{color-scheme:light dark}}body{{font:1rem/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem}}
h1{{line-height:1.1}}ol{{list-style:none;padding:0}}li{{display:grid;grid-template-columns:4rem 1fr 6rem;align-items:center;gap:.8rem;margin:.45rem 0}}
meter,audio{{width:100%}}td,th{{text-align:left;padding:.4em .8em .4em 0}}a{{color:inherit}}</style>
<h1>SanoTTS heart-nano</h1><p>Hosted Linux CPU · {html.escape(env['cpu'])} · {html.escape(env['chromeVersion'])}</p>
<table><tr><th>Warm generation, median of five</th><td>{med('generation_s'):.2f} s</td></tr>
<tr><th>First PCM at the page, median</th><td>{med('first_pcm_ms'):.1f} ms</td></tr>
<tr><th>Speech generated, median</th><td>{med('audio_s')/60:.1f} min</td></tr>
<tr><th>Mean Chrome memory, separate cached article</th><td>{ram:,.1f} MB</td></tr></table>
<h2>Five scored articles</h2><ol>{bars}</ol><p>Each run synthesized the same 20,000 English characters across 93 spans. The full-article warm-up is excluded. First PCM includes text processing and synthesis of the opening piece. Memory includes the isolated browser and workers.</p>
<h2>Listen to run 5</h2><audio controls preload="none" src="heart-nano-30s.wav"></audio>
<p><a href="measurements.csv">Measurements CSV</a> · <a href="{html.escape(actions_url)}">Run and full WAV artifacts</a> · <a href="https://huggingface.co/ampixa/sanoTTS">Ampixa model and attribution</a></p></html>"""
(out/'listen.html').write_text(page)
print(json.dumps(dict(warmMedianSeconds=med('generation_s'), firstPcmMedianMs=med('first_pcm_ms'),
 audioSeconds=med('audio_s'),realTimeFactor=med('rtf'), meanChromeMB=ram, machine=env, trials=[r['generation_s'] for r in w])))
