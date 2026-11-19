const DEFAULT_RUNTIME_VERSION = 'audio-cpp-zonos3-cpu-wasm-v3';
const DEFAULT_THREADS = 6;
const MAX_THREADS = 12;
const WORKER_URL = new URL('../workers/zonos3-cpu.js', import.meta.url);

function unsupported(model, reason) {
  return {
    ...(model.info || {}),
    status: 'unsupported',
    backendEffective: 'none',
    reason,
    capability: { gpuDispatchVerified: false, description: reason },
  };
}

export function createZonos3CpuAdapter(model, { threads = model?.cpuThreads || DEFAULT_THREADS, diagnosticLogs = false } = {}) {
  if (!model || model.family !== 'zonos3' || !model.cpuAssets || !model.info) {
    throw new Error('ZONOS3 CPU adapter requires the registered ZONOS3 model config and its pinned GGUF assets.');
  }
  if (!Number.isSafeInteger(threads) || threads < 1 || threads > MAX_THREADS) {
    throw new Error('ZONOS3 CPU thread count must be an integer from 1 to 12.');
  }

  let worker = null;
  let nextId = 0;
  let failed = false;
  const pending = new Map();

  function terminate(error) {
    if (failed) return;
    failed = true;
    for (const call of pending.values()) call.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  }

  function request(action, payload = {}, onFirstPcm) {
    return new Promise((resolve, reject) => {
      if (failed || !worker) {
        reject(new Error('ZONOS3 CPU worker is unavailable after failure or disposal.'));
        return;
      }
      const id = ++nextId;
      const timer = action === 'dispose'
        ? setTimeout(() => { pending.delete(id); reject(new Error('ZONOS3 CPU worker dispose timed out.')); }, 10000)
        : null;
      pending.set(id, {
        action,
        onFirstPcm,
        resolve(value) { if (timer) clearTimeout(timer); resolve(value); },
        reject(error) { if (timer) clearTimeout(timer); reject(error); },
      });
      try { worker.postMessage({ id, action, ...payload }); }
      catch (error) {
        pending.delete(id);
        if (timer) clearTimeout(timer);
        reject(error);
        terminate(error);
      }
    });
  }

  return {
    async initialize({ backend = 'cpu', probe = false, probeText, ...options } = {}) {
      if (worker || failed) throw new Error('ZONOS3 CPU adapter instances initialize only once.');
      if (backend !== 'cpu') return unsupported(model, 'The audio.cpp ZONOS3 community port provides CPU/WASM only; it will not silently use CPU for a WebGPU request.');

      const workerUrl = new URL(WORKER_URL);
      workerUrl.searchParams.set('cpuRuntimeVersion', model.cpuRuntimeVersion || DEFAULT_RUNTIME_VERSION);
      worker = new Worker(workerUrl, { name: 'tts-bench-zonos3-cpu' });
      worker.onmessage = ({ data }) => {
        if (data?.type === 'runtime-log') {
          if (diagnosticLogs) console.info('[zonos3-cpu/' + data.phase + '] ' + data.message);
          return;
        }
        if (data?.type === 'asset-progress') {
          if (diagnosticLogs && data.loaded === data.total) console.info('[zonos3-cpu] cached ' + data.id + ' (' + data.total + ' bytes)');
          return;
        }
        const call = pending.get(data?.id);
        if (!call) return;
        if (data.event === 'first-pcm') { call.onFirstPcm?.(); return; }
        pending.delete(data.id);
        if (data.error) {
          const error = new Error(data.error);
          call.reject(error);
          if (call.action === 'initialize') terminate(error);
        } else call.resolve(data.value);
      };
      worker.onerror = event => terminate(new Error('ZONOS3 CPU worker failed: ' + (event?.message || 'unknown worker error')));
      worker.onmessageerror = () => terminate(new Error('ZONOS3 CPU worker message could not be deserialized.'));

      try {
        return await request('initialize', {
          options: {
            ...options,
            backend,
            threads,
            probe,
            probeText,
            diagnosticLogs,
            modelConfig: model,
          },
        });
      } catch (error) {
        await this.dispose().catch(() => {});
        throw error;
      }
    },

    async generateChunk(chunk, { onFirstPcm } = {}) {
      if (!chunk || !Number.isSafeInteger(chunk.id) || chunk.id < 0 || !Number.isSafeInteger(chunk.start) ||
          !Number.isSafeInteger(chunk.end) || typeof chunk.text !== 'string' || chunk.end - chunk.start !== chunk.text.length) {
        throw new Error('ZONOS3 CPU requires an exact canonical source span.');
      }
      const response = await request('generate', { chunk }, onFirstPcm);
      if (!response || response.completedChunkId !== chunk.id || response.sampleRate !== 44100 ||
          !Array.isArray(response.parts) || response.parts.length !== 1 ||
          !(response.parts[0] instanceof Float32Array) || !response.parts[0].length ||
          !response.parts[0].every(Number.isFinite)) {
        throw new Error('ZONOS3 CPU returned invalid or mismatched mono PCM.');
      }
      return response;
    },

    async dispose() {
      if (!worker) return;
      const current = worker;
      try { if (!failed) await request('dispose'); }
      finally {
        current.terminate();
        if (worker === current) worker = null;
        for (const call of pending.values()) call.reject(new Error('ZONOS3 CPU worker disposed.'));
        pending.clear();
        failed = true;
      }
    },

    abort(error) { terminate(error instanceof Error ? error : new Error(String(error))); },
  };
}
