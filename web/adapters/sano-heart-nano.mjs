export function createSanoHeartNanoAdapter() {
  let worker = null;
  let serial = 0;
  let failed = false;
  const pending = new Map();

  function rejectPending(error) {
    for (const call of pending.values()) call.reject(error);
    pending.clear();
  }

  function request(action, payload = {}, onFirstPcm) {
    if (!worker) return Promise.reject(new Error('Sano heart-nano worker is not running.'));
    if (failed) return Promise.reject(new Error('Sano heart-nano worker has failed.'));
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = action === 'dispose'
        ? setTimeout(() => { pending.delete(id); reject(new Error('Sano heart-nano dispose timed out.')); }, 5000)
        : null;
      pending.set(id, {
        action,
        onFirstPcm,
        firstPcm: null,
        resolve(value) { if (timer) clearTimeout(timer); resolve(value); },
        reject(error) { if (timer) clearTimeout(timer); reject(error); },
      });
      try { worker.postMessage({ id, action, ...payload }); }
      catch (error) {
        pending.delete(id);
        if (timer) clearTimeout(timer);
        reject(error);
      }
    });
  }

  return {
    async initialize(options = {}) {
      if (worker) await this.dispose();
      failed = false;
      if (options.backend !== 'cpu') {
        const reason = 'The pinned official SanoTTS heart-nano browser path is CPU WebAssembly; it does not implement WebGPU dispatch.';
        return {
          status: 'unsupported', reason, backendEffective: 'none',
          voice: 'SanoTTS heart-nano (English, US)',
          precision: 'INT8 front and decoder weights',
          settings: { runtime: 'snt_nano WebAssembly', voiceKey: 'heartnano', language: 'en-us', executionProviders: [] },
          capability: { gpuDispatchVerified: false, description: reason },
        };
      }

      worker = new Worker(new URL('../workers/sano-heart-nano.js', import.meta.url), { name: 'SanoTTS heart-nano' });
      worker.onmessage = ({ data }) => {
        const call = pending.get(data?.id);
        if (!call) return;
        if (data.event === 'first-pcm') {
          call.firstPcm = data.samples;
          call.onFirstPcm?.();
          return;
        }
        pending.delete(data.id);
        if (data.error) call.reject(new Error(data.error));
        else {
          const value = data.value;
          if (call.firstPcm instanceof Float32Array && call.firstPcm.length) {
            value.parts = [call.firstPcm, ...(value.parts ?? [])];
          }
          call.resolve(value);
        }
      };
      worker.onerror = event => {
        failed = true;
        const details = [event?.message, event?.filename, event?.lineno && `line ${event.lineno}`, event?.colno && `column ${event.colno}`]
          .filter(Boolean).join(' ');
        rejectPending(new Error('Sano heart-nano worker failed' + (details ? ': ' + details : '.')));
      };
      worker.onmessageerror = () => {
        failed = true;
        rejectPending(new Error('Sano heart-nano worker message could not be deserialized.'));
      };

      try { return await request('initialize', { options }); }
      catch (error) {
        await this.dispose().catch(() => {});
        throw error;
      }
    },

    async generateChunk(chunk, { onFirstPcm } = {}) {
      let reported = false;
      const first = () => {
        if (reported) return;
        reported = true;
        onFirstPcm?.();
      };
      const response = await request('generate', { chunk }, first);
      if (response.parts?.some(part => part.length > 0)) first();
      return response;
    },

    async dispose() {
      const current = worker;
      if (!current) return;
      try {
        if (!failed) await request('dispose');
      } finally {
        current.terminate();
        if (worker === current) worker = null;
        rejectPending(new Error('Sano heart-nano worker disposed.'));
      }
    },
  };
}
