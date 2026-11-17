const gpuWorker = new Worker('/tools/linnet-webgpu-probe/gpu-worker.js');

self.onmessage = event => {
  const { m, k, n, lhs, rhs } = event.data;
  try {
    if (!self.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') {
      throw new Error('Cross-origin isolation and SharedArrayBuffer are required for the synchronous handoff.');
    }
    const stateBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const errorBuffer = new SharedArrayBuffer(512);
    const lhsBuffer = new SharedArrayBuffer(lhs.length * Float32Array.BYTES_PER_ELEMENT);
    const rhsBuffer = new SharedArrayBuffer(rhs.length * Float32Array.BYTES_PER_ELEMENT);
    const outputBuffer = new SharedArrayBuffer(m * n * Float32Array.BYTES_PER_ELEMENT);
    new Float32Array(lhsBuffer).set(lhs);
    new Float32Array(rhsBuffer).set(rhs);

    gpuWorker.postMessage({ m, k, n, stateBuffer, errorBuffer, lhsBuffer, rhsBuffer, outputBuffer });
    const wait = Atomics.wait(new Int32Array(stateBuffer), 0, 0, 30000);
    if (wait === 'timed-out') throw new Error('GPU worker did not finish before the synchronous bridge timeout.');
    const state = Atomics.load(new Int32Array(stateBuffer), 0);
    if (state !== 1) {
      const errorBytes = new Uint8Array(errorBuffer);
      const end = errorBytes.indexOf(0);
      const reason = new TextDecoder().decode(errorBytes.subarray(0, end < 0 ? errorBytes.length : end));
      throw new Error(reason || `GPU worker failed with state ${state}.`);
    }
    self.postMessage({
      ok: true,
      wait,
      output: Array.from(new Float32Array(outputBuffer)),
    });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message ?? error) });
  }
};
