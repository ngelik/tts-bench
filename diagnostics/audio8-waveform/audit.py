"""Measure exact constant-amplitude intervals in a mono PCM16 WAV, including runs across read boundaries."""
import argparse
from array import array
import hashlib
import json
from pathlib import Path
import sys
import wave


def audit(path, expected_sha256):
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    if digest != expected_sha256:
        raise ValueError(f'SHA-256 mismatch for {path.name}: {digest}')
    with wave.open(str(path)) as source:
        rate = source.getframerate()
        frames = source.getnframes()
        if source.getnchannels() != 1 or source.getsampwidth() != 2 or source.getcomptype() != 'NONE':
            raise ValueError('Expected a mono, uncompressed, 16-bit PCM WAV')
        thresholds = [max(1, (rate + 9) // 10), rate]
        totals = {n: {'runs': 0, 'samples': 0, 'zeroSamples': 0} for n in thresholds}
        longest = {'samples': 0}
        intervals = []
        start = 0
        offset = 0
        previous = None

        def finish(end):
            nonlocal longest
            length = end - start
            if length >= longest['samples'] or length >= rate:
                row = {'startSample': start, 'endSampleExclusive': end, 'samples':length, 'value':previous}
                if length > longest['samples']:
                    longest = row
                if length >= rate:
                    intervals.append(row)
            for limit in thresholds:
                if length < limit:
                    break
                metric = totals[limit]
                metric['runs'] += 1
                metric['samples'] += length
                if previous == 0:
                    metric['zeroSamples'] += length

        while block := source.readframes(262144):
            pcm = array('h')
            pcm.frombytes(block)
            if sys.byteorder != 'little':
                pcm.byteswap()
            for sample in pcm:
                if sample != previous:
                    if previous is not None and (offset - start > longest['samples'] or offset - start >= thresholds[0]):
                        finish(offset)
                    previous = sample
                    start = offset
                offset += 1
        if previous is None or offset != frames:
            raise ValueError('Truncated or empty PCM')
        finish(offset)
    return {'wavSha256':digest,'bytes':path.stat().st_size,'rate':rate,'samples':frames,
            'thresholdsSamples':totals,'longest':longest,'intervalsAtLeastOneSecond':intervals}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wav', type=Path)
    parser.add_argument('expected_sha256')
    args = parser.parse_args()
    print(json.dumps(audit(args.wav,args.expected_sha256),indent=2))
