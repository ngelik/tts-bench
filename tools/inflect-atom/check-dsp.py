"""Compare the supplied-noise C++ DSP against pinned original PyTorch output."""
import ctypes
import json
import sys
from pathlib import Path
import numpy as np

root = Path(sys.argv[1])
library = ctypes.CDLL(sys.argv[2])
ptr = ctypes.POINTER(ctypes.c_float)
library.atom_render.argtypes = [ptr] * 7 + [ctypes.c_int, ctypes.c_float, ctypes.c_float, ptr]
library.atom_render.restype = ctypes.c_int
metadata = json.loads((root / 'dsp-parity.json').read_text())
dsp = json.loads((root / 'dsp.json').read_text())
inputs = [np.fromfile(root / f'parity-{name}.f32', dtype='<f4') for name in ('f0_norm', 'voiced_logits', 'harmonic_log', 'noise_log', 'noise')]
inputs += [np.array(dsp[name], dtype=np.float32).ravel() for name in ('theta', 'fir')]
output = np.zeros(metadata['samples'], dtype=np.float32)
status = library.atom_render(*[x.ctypes.data_as(ptr) for x in inputs], metadata['frames'], dsp['f0_mean'][2], dsp['f0_std'][2], output.ctypes.data_as(ptr))
assert status == 0, status
reference = np.fromfile(root / 'parity-wave.f32', dtype='<f4')
assert output.shape == reference.shape and np.isfinite(output).all()
error = output.astype(np.float64) - reference
record = dict(samples=len(output), maxAbsoluteError=float(np.max(np.abs(error))), rootMeanSquaredError=float(np.sqrt(np.mean(error ** 2))), referenceRootMeanSquared=float(np.sqrt(np.mean(reference.astype(np.float64) ** 2))), correlation=float(np.corrcoef(output, reference)[0, 1]))
(root / 'dsp-native-parity.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
# Bounds are published with the evidence; inspect failures, never silently loosen.
assert record['maxAbsoluteError'] < 0.002, record
assert record['rootMeanSquaredError'] < 0.0002, record
assert record['correlation'] > 0.99999, record
