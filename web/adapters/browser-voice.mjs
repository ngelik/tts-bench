// The publisher's immutable module worker implements G2P, ONNX synthesis and
// per-request peak limiting. Each benchmark source span is one stock request.
export function createBrowserVoiceAdapter(profile) {
  let worker;
  let pending;
  let edition;

  function fail(error) {
    const call = pending;
    pending = null;
    worker?.terminate();
    worker = null;
    call?.reject(error);
  }

  function call(message, expected) {
    if (!worker) return Promise.reject(new Error('Browser Voice worker is unavailable.'));
    if (pending) return Promise.reject(new Error('Browser Voice requests must run sequentially.'));
    return new Promise((resolve, reject) => {
      pending = { expected, resolve, reject };
      try { worker.postMessage(message); } catch (error) { fail(error); }
    });
  }

  const choice = profile.choice;
  const precision = choice.label + ' packed weights expanded to FP32';
  return {
    async initialize(options) {
      const entry = profile.fixtures[options.fixtureId];
      if (options.backend !== 'cpu' || !entry || entry.language !== options.language) {
        const reason = 'This publisher worker requires the registered language fixture and CPU/WASM.';
        return { status: 'unsupported', reason, backendEffective: 'none', voice: profile.voice, precision,
          settings: {}, capability: { gpuDispatchVerified: false, description: reason } };
      }
      if (options.sourceSha256 && options.sourceSha256 !== entry.sha256) throw new Error('Browser Voice article checksum mismatch.');
      if (worker) fail(new Error('Browser Voice worker replaced.'));
      edition = entry;
      worker = new Worker(profile.workerUrl, { type: 'module' });
      worker.onerror = event => fail(new Error(event.message || 'Browser Voice worker failed.'));
      worker.onmessageerror = () => fail(new Error('Unreadable Browser Voice worker message.'));
      worker.onmessage = ({ data }) => {
        if (data.type === 'error') { fail(new Error(data.message)); return; }
        if (!pending || data.type !== pending.expected) return;
        const { resolve } = pending;
        pending = null;
        resolve(data);
      };
      const ready = await call({ type: 'load', choice, language: profile.spokenLanguage }, 'ready');
      if (ready.precision !== choice.id) throw new Error('Unexpected Browser Voice weights.');
      return {
        status: 'measured', backendEffective: 'cpu/wasm', voice: profile.voice, precision,
        settings: { modelId: profile.id, modelRevision: profile.modelRevision, browserSourceRevision: profile.sourceRevision,
          fixtureId: options.fixtureId, fixtureSha256: entry.sha256, language: entry.language, spokenLanguage: profile.spokenLanguage,
          voice: profile.voice, voiceIndex: 0, parameterCount: profile.parameterCount, precision, speed: choice.paceScale ?? 1,
          pitchShift: 0, pitchRange: 1, sampleRate: profile.sampleRate, maxTokens: profile.maxTokens,
          wasmThreads: 1, executionProviders: ['wasm'], runtimeVersions: { onnxruntimeWeb: '1.24.3' },
          cache: 'Chrome HTTP cache of same-origin immutable assets',
          frontend: 'Publisher worker with native lexicon and recurrent G2P', output: 'Stock per-span PCM with publisher peak limiter' },
        capability: { gpuDispatchVerified: null, description: 'The released acoustic and G2P sessions use the one-thread WASM provider.' },
      };
    },
    async generateChunk(chunk, { onFirstPcm } = {}) {
      if (!edition || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || chunk.id >= edition.spans ||
          typeof chunk.text !== 'string' || !chunk.text.trim()) throw new Error('Invalid Browser Voice source span.');
      const data = await call({ type: 'play', text: chunk.text, speed: choice.paceScale ?? 1,
        maxTokens: profile.maxTokens, sampleRate: profile.sampleRate }, 'audio');
      if (!Array.isArray(data.unknown) || data.unknown.length) throw new Error('Unknown pronunciation in Browser Voice span ' + chunk.id);
      if (!(data.audio instanceof Float32Array) || !data.audio.length || data.sampleRate !== profile.sampleRate) throw new Error('Invalid Browser Voice PCM output.');
      onFirstPcm?.();
      return { parts: [data.audio], sampleRate: data.sampleRate, completedChunkId: chunk.id };
    },
    async dispose() { fail(new Error('Browser Voice worker disposed.')); edition = null; },
    abort(error) { fail(error); edition = null; },
  };
}
