"""Verify the packer with official Amy 1.46M Sano WASM blobs after FP16 rounding."""
import argparse
import hashlib
import struct
from pathlib import Path

FILES = {
    'front_f32.bin': (72, '9bc304dd1db30b17a2efb751795137c6d26f25aaf9c96f05bc1dec7c86e0ce23'),
    'dec_f32.bin': (48, 'f520bcbf278607343e68170a06619a465a333d2d67476c6823d130e91580281b'),
}


def check(reference, converted):
    for file, (offset, digest) in FILES.items():
        official = (reference/file).read_bytes()
        if hashlib.sha256(official).hexdigest() != digest:
            raise ValueError(f'Unexpected publisher control file: {file}')
        actual = (converted/file).read_bytes()
        tensor_count, = struct.unpack_from('<i', official, offset-4)
        header = offset + 8 * tensor_count
        if len(actual) != len(official) or actual[:header] != official[:header]:
            raise ValueError(f'WASM tensor layout mismatch: {file}')
        size = (len(actual)-header)//4
        original_weights = struct.unpack_from(f'<{size}f', official, header)
        # Benchmark packs promote published FP16 to FP32 before loading in WASM.
        # Round the publisher control to FP16, then promote for a byte-for-byte check.
        half = struct.pack(f'<{size}e', *original_weights)
        promoted = struct.pack(f'<{size}f', *struct.unpack(f'<{size}e', half))
        if actual[header:] != promoted:
            raise ValueError(f'Weight or tensor order mismatch: {file}')
        print(f'{file}: {tensor_count} tensor slots, {size} weights verified')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('reference', type=Path)
    p.add_argument('converted', type=Path)
    args = p.parse_args()
    check(args.reference, args.converted)
