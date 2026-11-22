"""Repack a built wheel with stable archive metadata. Wheel members stay byte exact."""
import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('input', type=Path)
parser.add_argument('output_directory', type=Path)
args = parser.parse_args()
target = args.output_directory / args.input.name
if target.resolve() == args.input.resolve():
    raise ValueError('Build output and reproducible archive must have separate paths.')
target.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(args.input) as original, ZipFile(target, 'x', compression=ZIP_DEFLATED, compresslevel=9) as packed:
    for entry in sorted(original.infolist(), key=lambda member: member.filename):
        if entry.is_dir():
            continue
        normalized = ZipInfo(entry.filename, (1980, 1, 1, 0, 0, 0))
        normalized.create_system = 3
        normalized.external_attr = entry.external_attr
        packed.writestr(normalized, original.read(entry), compress_type=ZIP_DEFLATED, compresslevel=9)
print(target)
