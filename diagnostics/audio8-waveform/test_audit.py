import hashlib
from pathlib import Path
import tempfile
import unittest
import wave

from audit import audit


class WaveformTest(unittest.TestCase):
    def test_constant_runs_cross_read_boundaries_and_include_final_sample(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)/'test.wav'
            with wave.open(str(path), 'wb') as source:
                source.setparams((1, 2, 1000, 0, 'NONE', ''))
                source.writeframes((b'\x01\x00\xff\xff') * 131000)
                source.writeframes(b'\x00\x00' * 2000 + b'\xf4\xff' * 150)
            result = audit(path, hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(result['thresholdsSamples']['100'], {'runs':2,'samples':2150,'zeroSamples':2000})
            self.assertEqual(result['thresholdsSamples']['1000']['runs'], 1)
            self.assertEqual(result['longest'], {'startSample':262000,'endSampleExclusive':264000,'samples':2000,'value':0})
