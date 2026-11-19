"""Reproduce individual Kokopop Sano GGUFs; no inference or public redistribution."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request


def matches_pin(path, pin):
    """A cache hit is usable only when both length and SHA-256 match."""
    if not path.is_file() or path.stat().st_size != pin['bytes']:
        return False
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest() == pin['sha256']


def fetch_input(pin, cache, revision, download=urllib.request.urlopen):
    destination = cache / 'hf' / revision / pin['path']
    if matches_pin(destination, pin):
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    url = 'https://huggingface.co/ampixa/sanoTTS/resolve/' + revision + '/' + pin['path']
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=destination.name + '.', suffix='.partial',
                                         dir=destination.parent, delete=False) as output:
            temporary = Path(output.name)
            count = 0
            with download(url, timeout=120) as response:
                for chunk in iter(lambda: response.read(1024 * 1024), b''):
                    count += len(chunk)
                    if count > pin['bytes']:
                        raise ValueError('Download exceeds pinned size: ' + pin['path'])
                    output.write(chunk)
        if not matches_pin(temporary, pin):
            raise ValueError('Downloaded input failed size/SHA-256: ' + pin['path'])
        os.replace(temporary, destination)
        return destination
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    import numpy
    root = Path(__file__).resolve().parent.parent
    source = Path(os.environ.get('KOKOPOP_SOURCE', root / '.cache/sano-kokopop-build/upstream'))
    build = Path(os.environ.get('KOKOPOP_BUILD_ROOT', root / '.cache/sano-kokopop-build'))
    output = build / 'release'
    cache = build / 'size-model-cache'
    pins = json.loads((root / 'docs/sano-kokopop-size-pins.json').read_text())
    if sys.version_info[:2] != (3, 13):
        raise ValueError('Conversion requires Python 3.13 (Unicode 15.1).')
    if numpy.__version__ != pins['numpy'] or unicodedata.unidata_version != pins['unicode']:
        raise ValueError('Conversion NumPy/Unicode versions differ from the reviewed pins.')
    commit = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if commit != pins['upstreamCommit']:
        raise ValueError('Kokopop converter source differs from the reviewed commit.')
    output.mkdir(parents=True, exist_ok=True)
    verified = []
    for profile in pins['profiles']:
        for pin in profile['inputs']:
            fetch_input(pin, cache, pins['artifactRevision'])
        model = output / (profile['voice'] + '.gguf')
        with (output / (profile['voice'] + '-conversion.log')).open('w') as log:
            subprocess.run([
                sys.executable, str(source / 'tools/convert_sanotts_to_gguf.py'),
                '--voice', profile['voice'], '--output', str(model),
                '--artifact-revision', pins['artifactRevision'], '--cache-dir', str(cache),
            ], stdout=log, stderr=subprocess.STDOUT, check=True)
        if not matches_pin(model, profile):
            raise ValueError('Converted model failed its reviewed pin: ' + profile['id'])
        verified.append(profile)
    manifest = {**pins, 'verifiedProfiles': verified,
                'pythonVersion': sys.version.split()[0], 'inferenceRun': False}
    (output / 'SANO-SIZE-MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'status': 'verified', 'models': [p['id'] for p in verified]}))


if __name__ == '__main__':
    main()
