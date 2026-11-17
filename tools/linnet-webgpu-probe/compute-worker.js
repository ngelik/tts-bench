self.onmessage = async event => {
  let instance;
  let dispatchCount = 0;
  let bridgeWait = null;
  try {
    const imports = {
      env: {
        linnet_gpu_matmul_mm(lhsPointer, rhsPointer, m, k, n, outputPointer) {
          if (!self.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') {
            throw new Error('Cross-origin isolation and SharedArrayBuffer are required for this import bridge.');
          }
          const memory = instance?.exports?.memory;
          if (!memory) throw new Error('The Rust WASM memory export is not ready.');
          const lhs = new Float32Array(memory.buffer, lhsPointer, m * k);
          const rhs = new Float32Array(memory.buffer, rhsPointer, k * n);
          const stateBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
          const errorBuffer = new SharedArrayBuffer(512);
          const lhsBuffer = new SharedArrayBuffer(lhs.byteLength);
          const rhsBuffer = new SharedArrayBuffer(rhs.byteLength);
          const outputBuffer = new SharedArrayBuffer(m * n * Float32Array.BYTES_PER_ELEMENT);
          new Float32Array(lhsBuffer).set(lhs);
          new Float32Array(rhsBuffer).set(rhs);
          self.postMessage({ type: 'gpu-request', request: { m, k, n, stateBuffer, errorBuffer, lhsBuffer, rhsBuffer, outputBuffer } });
          bridgeWait = Atomics.wait(new Int32Array(stateBuffer), 0, 0, 30000);
          const state = Atomics.load(new Int32Array(stateBuffer), 0);
          if (state !== 1) {
            const errorBytes = new Uint8Array(errorBuffer);
            const end = errorBytes.indexOf(0);
            const reason = new TextDecoder().decode(errorBytes.subarray(0, end < 0 ? errorBytes.length : end));
            throw new Error(reason || `GPU worker returned state ${state} (${bridgeWait}).`);
          }
          new Float32Array(memory.buffer, outputPointer, m * n).set(new Float32Array(outputBuffer));
          dispatchCount++;
        },
      },
    };
    const loaded = await WebAssembly.instantiate(event.data.wasmBytes, imports);
    instance = loaded.instance;
    instance.exports.run_linnet_ops_matmul_probe();
    const outputPointer = instance.exports.linnet_ops_probe_output_ptr();
    const outputLength = instance.exports.linnet_ops_probe_output_len();
    const output = Array.from(new Float32Array(instance.exports.memory.buffer, outputPointer, outputLength));
    self.postMessage({ ok: true, output, dispatchCount, bridgeWait });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message ?? error), dispatchCount, bridgeWait });
  }
};
