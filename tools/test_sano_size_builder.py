"""Offline cache recovery checks; no model downloads or inference."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('size_builder', Path(__file__).with_name('build-sano-size-models.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class CacheRecovery(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.cache = Path(self.directory.name)
        self.body = b'verified fixture bytes'
        self.pin = {'path': 'voice/weights.bin', 'bytes': len(self.body),
                    'sha256': hashlib.sha256(self.body).hexdigest()}
        self.destination = self.cache / 'hf/revision/voice/weights.bin'
        self.calls = 0

    def tearDown(self):
        self.directory.cleanup()

    def download(self, *_args, **_kwargs):
        self.calls += 1
        return io.BytesIO(self.body)

    def test_corrupt_existing_cache_is_refetched_and_reused(self):
        self.destination.parent.mkdir(parents=True)
        self.destination.write_bytes(b'corrupt')
        self.assertEqual(builder.fetch_input(self.pin, self.cache, 'revision', self.download), self.destination)
        self.assertEqual(self.destination.read_bytes(), self.body)
        builder.fetch_input(self.pin, self.cache, 'revision', self.download)
        self.assertEqual(self.calls, 1)

    def test_bad_digest_never_replaces_existing_file(self):
        self.destination.parent.mkdir(parents=True)
        self.destination.write_bytes(b'old invalid bytes')
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            builder.fetch_input(self.pin, self.cache, 'revision', lambda *_a, **_k: io.BytesIO(b'x' * len(self.body)))
        self.assertEqual(self.destination.read_bytes(), b'old invalid bytes')
        self.assertEqual(list(self.destination.parent.glob('*.partial')), [])

    def test_interruption_leaves_no_partial_then_retry_succeeds(self):
        class Interrupted(io.BytesIO):
            def read(self, *_args):
                raise OSError('interrupted fixture download')
        with self.assertRaisesRegex(OSError, 'interrupted'):
            builder.fetch_input(self.pin, self.cache, 'revision', lambda *_a, **_k: Interrupted())
        self.assertFalse(self.destination.exists())
        self.assertEqual(list(self.destination.parent.glob('*.partial')), [])
        builder.fetch_input(self.pin, self.cache, 'revision', self.download)
        self.assertEqual(self.destination.read_bytes(), self.body)


if __name__ == '__main__':
    unittest.main()
