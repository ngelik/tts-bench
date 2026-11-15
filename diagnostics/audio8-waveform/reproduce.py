"""Check both complete released articles and compare the result with the committed evidence when present."""
import json
from pathlib import Path
import shutil
import tempfile
from urllib.request import urlopen
from audit import audit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
IDS = {
    'cpu':'2026-11-15t00-00-04-032z-audio8-realistic-0.6b-int4-cpu-cached-b259df93',
    'webgpu':'2026-11-14t17-07-22-490z-audio8-realistic-0.6b-int4-webgpu-cached-5ffbf694',
}
def reproduce():
    manifest = json.loads((ROOT/'audio/manifest.json').read_text())['entries']
    evidence = {}
    with tempfile.TemporaryDirectory() as stage:
        for backend,run_id in IDS.items():
            entry = next(item for item in manifest if item['resultId'] == run_id and item['backend'] == backend)
            full = entry['full']
            receipt = json.loads((ROOT/'results'/run_id/'result.json').read_text())
            trial = receipt['cells'][0]['trials'][0]
            if trial['audio'] != {'bytes':full['bytes'],'sha256':full['sha256']}:
                raise ValueError('Audio manifest differs from archived scored trial')
            url = full['url']
            if not url.startswith('https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/'):
                raise ValueError('Unexpected release origin or tag')
            path = Path(stage)/(backend+'.wav')
            with urlopen(url, timeout=90) as response, path.open('wb') as output:
                shutil.copyfileobj(response, output)
            result = audit(path, full['sha256'])
            if (result['samples'],result['rate'],result['bytes']) != (trial['samples'],trial['sampleRate'],full['bytes']):
                raise ValueError('WAV measurements differ from source trial')
            evidence[backend] = {'resultId':run_id,'pcmSha256':trial['pcmSha256'],**result}
    return evidence

if __name__ == '__main__':
    evidence = reproduce()
    expected = HERE/'evidence.json'
    if expected.exists() and json.loads(expected.read_text()) != evidence:
        raise ValueError('Released recordings differ from checked-in waveform evidence')
    print('AUDIO8_WAVEFORM_EVIDENCE='+json.dumps(evidence,separators=(',',':')))
