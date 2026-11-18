// Classic Emscripten worker for the pinned audio.cpp ZONOS3 CPU/WASM runtime.
(function () {
  'use strict';

  const requestedRelease = new URL(self.location.href).searchParams.get('cpuRuntimeVersion');
  const RUNTIME_RELEASE = /^[a-z0-9][a-z0-9-]{0,95}$/.test(requestedRelease || '')
    ? requestedRelease
    : 'audio-cpp-zonos3-cpu-wasm-v1';
  const RUNTIME_ROOT = '/runtimes/' + RUNTIME_RELEASE + '/';
  const RUNTIME_JS = RUNTIME_ROOT + 'bench_zonos3_cpu.js';
  const RUNTIME_WASM = RUNTIME_ROOT + 'bench_zonos3_cpu.wasm';
  const CACHE_PREFIX = 'tts-bench-zonos3-cpu-gguf-v1';
  const RANGE_BYTES = 16 * 1024 * 1024;
  const THREADS = 6;
  const PTHREAD_POOL_SIZE = 12;
  const isPthread = String(self.name || '').startsWith('em-pthread');

  importScripts(RUNTIME_JS);
  if (isPthread) return;

  let module = null;
  let config = null;

  function errorText(error) { return String(error && (error.stack || error.message) || error); }
  function log(phase, message) {
    if (config && config.diagnosticLogs) self.postMessage({ type: 'runtime-log', phase, message: String(message) });
  }

  function requireAsset(asset, filename) {
    if (!asset || typeof asset.modelUrl !== 'string' || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(asset.sha256 || '') || typeof filename !== 'string' ||
        (asset.filename !== undefined && asset.filename !== filename)) {
      throw new Error('Invalid pinned ZONOS3 CPU asset configuration for ' + filename + '.');
    }
    const url = new URL(asset.modelUrl, self.location.href);
    if (url.origin !== self.location.origin || !url.pathname.endsWith('/' + filename)) {
      throw new Error('ZONOS3 CPU asset URL must be a local same-origin file named ' + filename + '.');
    }
    return { url: url.href, bytes: asset.bytes, sha256: asset.sha256, filename };
  }

  function rangeKey(asset, start, end) {
    return new Request(new URL('/' + CACHE_PREFIX + '/' + asset.sha256 + '/' + start + '-' + end, self.location.origin));
  }

  async function readRange(cache, asset, start, end) {
    const key = rangeKey(asset, start, end);
    let response = await cache.match(key);
    if (response && (response.headers.get('X-GGUF-SHA256') !== asset.sha256 ||
        response.headers.get('X-GGUF-START') !== String(start) || response.headers.get('X-GGUF-END') !== String(end))) {
      await cache.delete(key);
      response = null;
    }
    if (!response) {
      const expected = end - start + 1;
      const network = await fetch(asset.url, {
        headers: { Range: 'bytes=' + start + '-' + end },
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (network.status !== 206) {
        throw new Error('ZONOS3 CPU asset ' + asset.filename + ' range ' + start + '-' + end +
          ' returned HTTP ' + network.status + ', expected 206.');
      }
      const contentRange = network.headers.get('Content-Range') || '';
      if (contentRange !== 'bytes ' + start + '-' + end + '/' + asset.bytes) {
        throw new Error('ZONOS3 CPU asset ' + asset.filename + ' has unexpected Content-Range: ' + (contentRange || '(missing)'));
      }
      const declaredLength = Number(network.headers.get('Content-Length'));
      if (declaredLength !== expected) throw new Error('Unexpected range length for ' + asset.filename + ': ' + declaredLength);
      const body = await network.arrayBuffer();
      if (body.byteLength !== expected) throw new Error('Unexpected range body length for ' + asset.filename + ': ' + body.byteLength);
      response = new Response(body, { status: 200, headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(expected),
        'X-GGUF-SHA256': asset.sha256,
        'X-GGUF-START': String(start),
        'X-GGUF-END': String(end),
      } });
      await cache.put(key, response.clone());
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== end - start + 1) throw new Error('Corrupt cached range for ' + asset.filename + '.');
    return bytes;
  }

  async function writeAsset(asset, path) {
    const fs = module.FS;
    if (!fs.analyzePath('/inputs').exists) fs.mkdir('/inputs');
    const stream = fs.open(path, 'w');
    const cache = await caches.open(CACHE_PREFIX + '-' + asset.sha256);
    try {
      fs.truncate(path, asset.bytes);
      let offset = 0;
      while (offset < asset.bytes) {
        const end = Math.min(asset.bytes - 1, offset + RANGE_BYTES - 1);
        const bytes = await readRange(cache, asset, offset, end);
        const written = fs.write(stream, bytes, 0, bytes.length, offset);
        if (written !== bytes.length) throw new Error('Could not write ' + asset.filename + ' into Emscripten MEMFS.');
        offset = end + 1;
        if (config.diagnosticLogs) self.postMessage({ type: 'asset-progress', id: asset.filename, loaded: offset, total: asset.bytes });
      }
    } finally {
      fs.close(stream);
    }
  }

  function checkPcm() {
    const rate = module._bench_rate();
    const sampleCount = module._bench_frames();
    const channels = module._bench_channels();
    const pointer = module._bench_pcm();
    if (!pointer || !Number.isSafeInteger(sampleCount) || sampleCount <= 0 || channels !== 1 || rate !== 44100) {
      throw new Error('audio.cpp returned invalid ZONOS3 PCM metadata: ' + sampleCount + ' frames, ' + channels + ' channels at ' + rate + ' Hz.');
    }
    const pcm = module.HEAPF32.slice(pointer >>> 2, (pointer >>> 2) + sampleCount * channels);
    if (pcm.length !== sampleCount || !pcm.length || !pcm.every(Number.isFinite)) {
      throw new Error('audio.cpp returned empty or non-finite ZONOS3 PCM.');
    }
    return { pcm, sampleRate: rate, frames: sampleCount };
  }

  function synthesize(text, chunkId, seed, emitFirstPcm) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('ZONOS3 CPU synthesis requires nonempty canonical source text.');
    const status = module.ccall('bench_generate', 'number', ['string', 'number', 'number'], [text, seed >>> 0, chunkId]);
    if (status !== 0) throw new Error('audio.cpp ZONOS3 CPU generation failed (' + status + '): ' + module.ccall('bench_error', 'string', [], []));
    const output = checkPcm();
    log('synthesis-complete', output.frames + ' mono samples at ' + output.sampleRate + ' Hz.');
    // The pinned C API is offline: the full span is returned before PCM can be
    // transferred. The benchmark records this exact first-PCM boundary.
    if (emitFirstPcm) emitFirstPcm();
    module._bench_clear_result();
    return { parts: [output.pcm], sampleRate: output.sampleRate, completedChunkId: chunkId };
  }

  async function initialize(options) {
    config = Object.assign({}, options.modelConfig, { diagnosticLogs: options.diagnosticLogs === true });
    if (options.backend !== 'cpu') {
      return {
        ...(config.info || {}), status: 'unsupported', backendEffective: 'none',
        reason: 'The audio.cpp ZONOS3 CPU runtime is CPU/WASM only; no WebGPU fallback is provided.',
        capability: { gpuDispatchVerified: false, description: 'No WebGPU backend is built into this CPU-only runtime.' },
      };
    }
    if (self.crossOriginIsolated !== true || typeof SharedArrayBuffer === 'undefined') {
      throw new Error('The ZONOS3 CPU Emscripten pthread build requires cross-origin isolation and SharedArrayBuffer.');
    }
    const assets = config.cpuAssets || {};
    const expectedJsUrl = new URL(RUNTIME_ROOT + 'bench_zonos3_cpu.js', self.location.origin).href;
    const expectedWasmUrl = new URL(RUNTIME_ROOT + 'bench_zonos3_cpu.wasm', self.location.origin).href;
    if (config.cpuRuntimeVersion && config.cpuRuntimeVersion !== RUNTIME_RELEASE) {
      throw new Error('ZONOS3 CPU runtime version differs from the adapter worker URL.');
    }
    const runtimeFiles = config.cpuRuntimeFiles || {};
    const configuredJsUrl = typeof runtimeFiles.jsUrl === 'string' ? new URL(runtimeFiles.jsUrl, self.location.origin).href : '';
    const configuredWasmUrl = typeof runtimeFiles.wasmUrl === 'string' ? new URL(runtimeFiles.wasmUrl, self.location.origin).href : '';
    if (configuredJsUrl !== expectedJsUrl || configuredWasmUrl !== expectedWasmUrl) {
      throw new Error('ZONOS3 CPU runtime URLs do not match the pinned local runtime release.');
    }
    const files = [
      requireAsset(assets.backbone, 'backbone-ptq.gguf'),
      requireAsset(assets.decoder, 'zac-keep2.gguf'),
      requireAsset(assets.speakerEncoder, 'spk-encoder.gguf'),
      requireAsset(assets.speakerEmbedding, 'Imogen_en-British_F_1.embedding.npy'),
    ];
    const threads = options.threads || config.cpuThreads || config.info?.settings?.threads || THREADS;
    if (!Number.isSafeInteger(threads) || threads < 1 || threads > 16) throw new Error('ZONOS3 CPU thread count must be from 1 to 16.');

    log('runtime-load', 'Loading the pinned community audio.cpp ZONOS3 CPU WebAssembly runtime.');
    module = await createZonos3Cpu({
      locateFile(name) {
        return name.endsWith('.wasm') ? RUNTIME_WASM : new URL(name, self.location.origin + RUNTIME_ROOT).href;
      },
      print(message) { log('audio.cpp', message); },
      printErr(message) { log('audio.cpp error', message); },
    });
    log('runtime-ready', 'WebAssembly runtime initialized with pthreads.');

    for (const [index, asset] of files.entries()) {
      const path = '/inputs/' + asset.filename;
      log('model-cache', 'Materializing pinned ' + asset.filename + ' from verified local ranges.');
      await writeAsset(asset, path);
      if (index === files.length - 1) log('speaker-ready', 'Pinned Imogen speaker embedding staged.');
    }

    const status = module.ccall('bench_open', 'number', ['string', 'string', 'number'], ['/inputs/backbone-ptq.gguf', 'cpu', threads]);
    if (status !== 0) throw new Error('audio.cpp ZONOS3 model/session initialization failed (' + status + '): ' + module.ccall('bench_error', 'string', [], []));

    const info = config.info || {};
    const value = {
      ...info,
      status: 'measured',
      backendEffective: 'cpu/wasm',
      voice: 'Imogen (English, pinned speaker embedding)',
      precision: 'audio.cpp Q4_0 routed experts / Q8_0 GDN and attention projections; remaining tensors F16/F32',
      settings: {
        ...(info.settings || {}),
        language: 'en_us',
        maxTokens: 2000,
        speakerMode: 'embedding',
        speakerEmbedding: 'Imogen_en-British_F_1.embedding.npy (pinned HF source)',
        decoder: 'KEEP-2 via pinned zac-keep2.gguf (audio.cpp selects it from the model package)',
        seed: 42,
        seedPerChunk: '42 + canonical chunk id (uint32)',
        temperature: 0.75,
        topK: 80,
        topP: 0.69,
        minP: 0.0,
        repetitionPenalty: 2.4,
        repetitionWindow: 96,
        repetitionCodebooks: 6,
        guidanceScale: 1.0,
        silencePrefillFrames: 3,
        headroomDb: 3.0,
        softLimit: true,
        textNormalization: false,
        shortText: 'Not implemented by this community CPU port; canonical spans are passed unchanged.',
        textChunkSize: 20000,
        runtimeRelease: RUNTIME_RELEASE,
        threads,
        pthreadPoolSize: PTHREAD_POOL_SIZE,
        executionProviders: ['wasm'],
        output: 'Mono 44.1 kHz Float32 PCM; offline audio.cpp API returns a full canonical span before its first-PCM event.',
        assetCache: 'Pinned same-origin GGUF files stored as 16 MiB CacheStorage ranges keyed by SHA-256, then copied to Emscripten MEMFS.',
      },
      capability: {
        gpuDispatchVerified: false,
        description: 'Explicit CPU-only audio.cpp backend in a pthread-enabled WebAssembly runtime; GPU kernels are not built.',
      },
    };
    if (options.probe === true) {
      const probe = synthesize(options.probeText || 'The local ZONOS3 CPU runtime is ready.', 0, 42, null);
      if (!probe.parts[0].length || !probe.parts[0].every(Number.isFinite)) throw new Error('ZONOS3 CPU capability probe returned invalid PCM.');
      value.capability = { gpuDispatchVerified: false, description: 'CPU/WASM probe returned finite 44.1 kHz mono PCM; the runtime contains no GPU backend.' };
    }
    return value;
  }

  async function dispose() {
    if (module) {
      try { module._bench_shutdown(); } catch {}
      module = null;
    }
    config = null;
  }

  async function handle(event) {
    const data = event.data || {};
    try {
      let value;
      if (data.action === 'initialize') value = await initialize(data.options || {});
      else if (data.action === 'generate') {
        const chunk = data.chunk;
        if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || !Number.isSafeInteger(chunk.start) ||
            !Number.isSafeInteger(chunk.end) || typeof chunk.text !== 'string' || chunk.end - chunk.start !== chunk.text.length) {
          throw new Error('Invalid canonical source span supplied to ZONOS3 CPU.');
        }
        const response = synthesize(chunk.text, chunk.id, 42 + chunk.id, () => self.postMessage({ id: data.id, event: 'first-pcm' }));
        value = response;
      } else if (data.action === 'dispose') {
        await dispose();
        value = null;
      } else throw new Error('Unknown ZONOS3 CPU worker action.');
      self.postMessage({ id: data.id, value }, value && value.parts ? value.parts.map(part => part.buffer) : []);
    } catch (error) {
      if (data.action === 'initialize') await dispose();
      self.postMessage({ id: data.id, error: errorText(error) });
    }
  }

  self.onmessage = handle;
}());
