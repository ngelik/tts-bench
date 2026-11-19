// Sano's piperlite voices all use the official sanotts-web worker ABI. The
// worker accepts only a registered model id and derives every asset URL from
// its static profile; callers cannot provide remote paths or checkpoints.
export function createSanoPiperliteAdapter(modelId) {
  if (typeof modelId !== 'string' || !/^sano-(hfc|kristin|amy-small|amy-1p8m)$/.test(modelId)) {
    throw new Error('Unknown Sano piperlite profile: ' + String(modelId));
  }

  let worker = null;
  let serial = 0;
  let failed = false;
  const pending = new Map();

  function rejectPending(error) {
    for (const call of pending.values()) call.reject(error);
    pending.clear();
  }

  function request(action, payload = {}) {
    if (!worker) return Promise.reject(new Error('Sano piperlite worker is not running.'));
    if (failed) return Promise.reject(new Error('Sano piperlite worker has failed.'));
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = action === 'dispose'
        ? setTimeout(() => { pending.delete(id); reject(new Error('Sano piperlite dispose timed out.')); }, 5000)
        : null;
      pending.set(id, {
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
      worker = new Worker(new URL('../workers/sano-piperlite.js', import.meta.url), { name: 'Sano piperlite ' + modelId });
      worker.onmessage = ({ data }) => {
        const call = pending.get(data?.id);
        if (!call) return;
        pending.delete(data.id);
        if (data.error) call.reject(new Error(data.error));
        else call.resolve(data.value);
      };
      worker.onerror = event => {
        failed = true;
        const details = [event?.message, event?.filename, event?.lineno && `line ${event.lineno}`, event?.colno && `column ${event.colno}`]
          .filter(Boolean).join(' ');
        rejectPending(new Error('Sano piperlite worker failed' + (details ? ': ' + details : '.')));
      };
      worker.onmessageerror = () => {
        failed = true;
        rejectPending(new Error('Sano piperlite worker message could not be deserialized.'));
      };

      try { return await request('initialize', { options: { ...options, modelId } }); }
      catch (error) {
        await this.dispose().catch(() => {});
        throw error;
      }
    },

    async generateChunk(chunk, { onFirstPcm } = {}) {
      const response = await request('generate', { chunk });
      if (response.parts?.some(part => part.length > 0)) onFirstPcm?.();
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
        rejectPending(new Error('Sano piperlite worker disposed.'));
      }
    },
  };
}
