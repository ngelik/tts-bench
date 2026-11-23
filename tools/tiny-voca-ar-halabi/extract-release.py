#!/usr/bin/env python3
"""Fetch or verify the official Halabi Arabic demo kit and extract three locked files."""

import argparse
import hashlib
from pathlib import Path
import shutil
import tempfile
from urllib.request import urlopen
from zipfile import ZipFile


RELEASE_URL = ('https://github.com/BenkadourKhaled/tiny-voca/releases/download/'
               'v0.1-ar-demo-kit/tiny-voca-ar-demo-kit.zip')
RELEASE_BYTES = 27_003_677
RELEASE_SHA256 = 'c75837f1f356dffe31ea2c29891aaf212c442022404e9cb401e7dbfeb7a3e3a6'
ASSETS = {
    'model\\model.onnx': ('model.onnx', 21_367_894, '121d285ce938dab1b3720f77ed02121d80f83ae2ec23d33ec13e095f321390d4'),
    'model\\config.json': ('config.json', 1_201, '12caf18f21cf114aec9a8ddf9802d49830278a3c058666eb514bb517a547e68d'),
    'ATTRIBUTION.md': ('ATTRIBUTION.md', 457, 'bab7bbb15b7cdcde2ae8f8beb161c1fdcff7329f7a1d2c284018d4d0614d33b5'),
}


def verify(file_path, expected_bytes, expected_sha256):
    with file_path.open('rb') as stream:
        actual_sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
    if file_path.stat().st_size != expected_bytes or actual_sha256 != expected_sha256:
        raise ValueError(f'Unexpected size or SHA-256 for {file_path.name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Directory for the three lock-verified model files')
    parser.add_argument('--archive', type=Path, help='Already downloaded official ZIP')
    options = parser.parse_args()
    options.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.tiny-voca-ar-halabi-', dir=options.output) as staging:
        work = Path(staging)
        archive = options.archive
        if archive is None:
            archive = work / 'tiny-voca-ar-demo-kit.zip'
            with urlopen(RELEASE_URL, timeout=90) as response, archive.open('wb') as target:
                shutil.copyfileobj(response, target)
        verify(archive, RELEASE_BYTES, RELEASE_SHA256)
        with ZipFile(archive) as package:
            for member, (name, size, checksum) in ASSETS.items():
                output = work / name
                if package.getinfo(member).file_size != size:
                    raise ValueError(f'Unexpected archived size for {name}')
                with package.open(member) as source, output.open('wb') as target:
                    shutil.copyfileobj(source, target)
                verify(output, size, checksum)
        for name, _, _ in ASSETS.values():
            (work / name).replace(options.output / name)
    print(f'Verified Halabi release assets in {options.output}')


if __name__ == '__main__':
    main()
