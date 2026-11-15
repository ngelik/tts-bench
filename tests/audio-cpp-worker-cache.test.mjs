import test from 'node:test';
import assert from 'node:assert/strict';
import { createMingGgufAdapter } from '../web/adapters/audio-cpp-gguf.mjs';

class StubWorker {
  static urls = [];

  constructor(url) {
    this.url = new URL(String(url));
    StubWorker.urls.push(this.url.href);
  }

  postMessage(message) {
    queueMicrotask(() => this.onmessage?.({
      data: {
        id: message.id,
        value: message.action === 'initialize'
          ? { status: 'measured', backendEffective: 'webgpu', settings: {} }
          : null,
      },
    }));
  }

  terminate() {}
}

test('Ming capability and clean workers share one cacheable script URL', async () => {
  const originalWorker = globalThis.Worker;
  StubWorker.urls = [];
  globalThis.Worker = StubWorker;
  try {
    const probe = createMingGgufAdapter();
    await probe.initialize({ backend: 'webgpu', probe: true });
    await probe.dispose();

    const clean = createMingGgufAdapter();
    await clean.initialize({ backend: 'webgpu', probe: false });
    await clean.dispose();

    assert.equal(StubWorker.urls.length, 2);
    assert.equal(StubWorker.urls[0], StubWorker.urls[1]);
    assert.equal(new URL(StubWorker.urls[0]).search, '');
  } finally {
    globalThis.Worker = originalWorker;
  }
});

test('Ming pthread workers import the lock-registered runtime and versioned release has all three artifacts', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url)));
  const model = lock.models['ming-3.0-tts-0.5b-gguf'];
  const release = model.runtime.version;
  assert.equal(release, 'audio-cpp-browser-v3');
  const assets = model.assets.filter(asset => asset.target.startsWith('runtimes/'));
  const names = ['bench_browser.js', 'bench_browser.wasm', 'THIRD-PARTY-NOTICES.txt'];
  assert.deepEqual(assets.map(asset => asset.target), names.map(name => `runtimes/${release}/${name}`));
  assert.deepEqual(assets.map(asset => asset.url), names.map(name =>
    `https://github.com/ngelik/tts-bench/releases/download/${release}/${name}`));
  const imports = [];
  const worker = await readFile(new URL('../web/audio-cpp-gguf/worker.js', import.meta.url), 'utf8');
  runInNewContext(worker, {
    URL, self: { name: 'em-pthread', location: new URL('https://localhost/web/audio-cpp-gguf/worker.js') },
    importScripts: url => imports.push(url),
  });
  assert.deepEqual(imports, ['/' + assets[0].target]);
});

test('Ming session pool patch remains scoped and matches its documented digest', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const patch = await readFile(new URL('../web/audio-cpp-gguf/ming-session-threadpool.patch', import.meta.url));
  const document = await readFile(new URL('../web/audio-cpp-gguf/NOTICE.md', import.meta.url), 'utf8');
  assert.ok(document.includes(createHash('sha256').update(patch).digest('hex')));
  assert.deepEqual(patch.toString().match(/^diff --git .+$/gm), [
    'diff --git a/src/models/ming3_tts/session.cpp b/src/models/ming3_tts/session.cpp',
  ]);
});


test('v3 speech FFT patch bounds worker reservation without changing task sizing', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const patch = await readFile(new URL('../web/audio-cpp-gguf/ming-speechfft-pool-cap.patch', import.meta.url));
  const text = patch.toString();
  const document = await readFile(new URL('../web/audio-cpp-gguf/NOTICE.md', import.meta.url), 'utf8');
  assert.deepEqual(patch.toString().match(/^diff --git .+$/gm), [
    'diff --git a/src/framework/audio/detail/speech_fft_internal.h b/src/framework/audio/detail/speech_fft_internal.h',
  ]);
  assert.match(text, /ENGINE_SPEECHFFT_MAX_POOL_THREADS/);
  assert.match(text, /thread_pool\(pool_threads\)/);
  assert.match(text, /thread_pool::submit\(\)/);
  assert.ok(document.includes(createHash('sha256').update(patch).digest('hex')));
});
