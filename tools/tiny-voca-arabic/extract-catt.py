#!/usr/bin/env python3
"""Stage the exact published Abjad AI CATT v2 encoder and decoder."""

import argparse
import hashlib
from pathlib import Path
import shutil
import tempfile
from urllib.request import urlopen
from zipfile import ZipFile


RELEASE_URL = 'https://github.com/abjadai/catt/releases/download/v2/ed_model_onnx.zip'
RELEASE_BYTES = 85_926_550
RELEASE_SHA256 = '75d2a6360725c7e0bbb238b5a950f621fb8e30b21ad7c65e91e0f36759bcb3ce'
MEMBERS = {
    'encoder.onnx': (40_049_261, '988a91ec817bc50a7857a9851a5edd80d6a4c2f594b7ba6fea615b4ebe336590'),
    'decoder.onnx': (52_699_358, '9ab419f6e48b25f81e08e64479fc1caa6921a88dbba9932a901fc64ce8cf1240'),
}


def verify(path, expected_bytes, expected_sha256):
    if path.stat().st_size != expected_bytes:
        raise ValueError(f'Unexpected size for {path.name}')
    with path.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != expected_sha256:
            raise ValueError(f'Unexpected SHA-256 for {path.name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Directory for the two lock-verified ONNX files')
    parser.add_argument('--archive', type=Path, help='Previously downloaded official ZIP')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.catt-v2-', dir=args.output) as temp:
        working = Path(temp)
        archive = args.archive
        if archive is None:
            archive = working / 'ed_model_onnx.zip'
            with urlopen(RELEASE_URL, timeout=120) as response, archive.open('wb') as stream:
                shutil.copyfileobj(response, stream)
        verify(archive, RELEASE_BYTES, RELEASE_SHA256)
        with ZipFile(archive) as release:
            if set(release.namelist()) != set(MEMBERS):
                raise ValueError('Unexpected files in the CATT release')
            for name, (size, digest) in MEMBERS.items():
                if release.getinfo(name).file_size != size:
                    raise ValueError(f'Unexpected archived size for {name}')
                with release.open(name) as source, (working / name).open('wb') as output:
                    shutil.copyfileobj(source, output)
                verify(working / name, size, digest)
        for name in MEMBERS:
            (working / name).replace(args.output / name)
    print(f'Verified official CATT graphs in {args.output}')


if __name__ == '__main__':
    main()
