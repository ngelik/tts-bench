export class LinnetGpuPool {
  #worker = null;
  #serial = 0;
  #pending = new Map();
  #ready = null;
  #onCrash;
  #terminated = false;
  #dispatchCount = 0;
  #weightUploadCount = 0;
  #weightBytesUploaded = 0;
  #weightKeys = new Set();
  #dynamicWeightUploads = 0;

  constructor({ onCrash } = {}) {
    this.#onCrash = onCrash;
  }

  initialize({ allowSoftwareGpu = false } = {}) {
    if (this.#ready) return this.#ready;
    if (this.#terminated) return Promise.reject(new Error('Linnet WebGPU pool is terminated.'));
    this.#ready = new Promise((resolve, reject) => {
      try {
        this.#worker = new Worker(new URL('./model-gpu-worker.mjs', import.meta.url), { type: 'module', name: 'linnet-webgpu-probe' });
        const timer = setTimeout(() => {
          this.#ready = null;
          reject(new Error('Linnet WebGPU worker did not initialize within 30 seconds.'));
          this.terminate();
        }, 30000);
        this.#worker.onmessage = ({ data }) => {
          if (data?.type === 'ready') {
            clearTimeout(timer);
            if (data.ok) resolve(data.adapterInfo);
            else resolve({ available: false, reason: data.error || 'No WebGPU adapter is available.' });
            return;
          }
          if (data?.type === 'device-lost') {
            this.#fail(new Error(`Linnet WebGPU device lost: ${data.reason}`));
            return;
          }
          this.#settle(data);
        };
        this.#worker.onerror = event => {
          clearTimeout(timer);
          const error = new Error(event?.message || 'Linnet WebGPU worker failed.');
          reject(error);
          this.#fail(error);
        };
        this.#worker.onmessageerror = () => {
          clearTimeout(timer);
          const error = new Error('Linnet WebGPU worker message could not be deserialized.');
          reject(error);
          this.#fail(error);
        };
        this.#worker.postMessage({ type: 'initialize', allowSoftwareGpu });
      } catch (error) {
        reject(error);
        this.#fail(error);
      }
    });
    return this.#ready;
  }

  async dispatch(request) {
    if (!this.#worker || this.#terminated) throw new Error('Linnet WebGPU worker is unavailable.');
    const id = ++this.#serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error('Linnet WebGPU dispatch did not finish within 120 seconds.'));
        this.#fail(new Error('Linnet WebGPU dispatch timed out.'));
      }, 120000);
      this.#pending.set(id, { resolve, reject, timer, request });
      try { this.#worker.postMessage({ type: 'dispatch', id, request }); }
      catch (error) {
        clearTimeout(timer);
        this.#pending.delete(id);
        reject(error);
        this.#fail(error);
      }
    });
  }

  #settle(message) {
    const call = this.#pending.get(message?.id);
    if (!call) return;
    this.#pending.delete(message.id);
    clearTimeout(call.timer);
    if (message.ok) {
      this.#dispatchCount++;
      if (call.request.cacheableWeight === true) {
        if (!this.#weightKeys.has(call.request.weightKey)) {
          this.#weightKeys.add(call.request.weightKey);
          this.#weightUploadCount++;
          this.#weightBytesUploaded += call.request.weightBuffer?.byteLength ?? 0;
        }
      } else {
        this.#dynamicWeightUploads++;
        this.#weightUploadCount++;
        this.#weightBytesUploaded += call.request.weightBuffer?.byteLength ?? 0;
      }
      call.resolve(message);
    }
    else call.reject(new Error(message.error || 'Linnet WebGPU dispatch failed.'));
  }

  diagnostics() {
    return {
      dispatchCount: this.#dispatchCount,
      uniqueWeightBuffers: this.#weightKeys.size,
      dynamicWeightUploads: this.#dynamicWeightUploads,
      weightUploadCount: this.#weightUploadCount,
      weightBytesUploaded: this.#weightBytesUploaded,
    };
  }

  #fail(error) {
    if (this.#terminated) return;
    this.terminate();
    this.#onCrash?.(error);
  }

  terminate() {
    if (this.#terminated) return;
    this.#terminated = true;
    this.#worker?.terminate();
    this.#worker = null;
    for (const call of this.#pending.values()) {
      clearTimeout(call.timer);
      call.reject(new Error('Linnet WebGPU pool terminated.'));
    }
    this.#pending.clear();
  }
}
