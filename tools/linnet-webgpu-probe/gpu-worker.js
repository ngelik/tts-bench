let devicePromise;

async function getDevice() {
  if (!self.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') {
    throw new Error('GPU worker is not cross-origin isolated.');
  }
  if (!navigator.gpu) throw new Error('WebGPU is unavailable in the GPU worker.');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('GPU worker received no WebGPU adapter.');
  return adapter.requestDevice();
}

self.onmessage = async event => {
  const { m, k, n, stateBuffer, errorBuffer, lhsBuffer, rhsBuffer, outputBuffer } = event.data;
  const state = new Int32Array(stateBuffer);
  const errorBytes = new Uint8Array(errorBuffer);
  try {
    const device = await (devicePromise ??= getDevice());
    const shader = device.createShaderModule({ code: `
      struct Params { m: u32, k: u32, n: u32, _pad: u32 };
      @group(0) @binding(0) var<storage, read> lhs: array<f32>;
      @group(0) @binding(1) var<storage, read> rhs: array<f32>;
      @group(0) @binding(2) var<storage, read_write> out: array<f32>;
      @group(0) @binding(3) var<uniform> p: Params;
      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        let flat = id.x;
        if (flat >= p.m * p.n) { return; }
        let row = flat / p.n;
        let col = flat % p.n;
        var sum = 0.0;
        for (var inner = 0u; inner < p.k; inner += 1u) {
          sum += lhs[row * p.k + inner] * rhs[inner * p.n + col];
        }
        out[flat] = sum;
      }
    ` });
    const pipeline = await device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: shader, entryPoint: 'main' },
    });
    const lhs = new Float32Array(lhsBuffer);
    const rhs = new Float32Array(rhsBuffer);
    const resultLength = m * n;
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    const aBuffer = device.createBuffer({ size: lhs.byteLength, usage: storage });
    const bBuffer = device.createBuffer({ size: rhs.byteLength, usage: storage });
    const outBuffer = device.createBuffer({ size: resultLength * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const params = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const readback = device.createBuffer({ size: resultLength * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    device.queue.writeBuffer(aBuffer, 0, lhs);
    device.queue.writeBuffer(bBuffer, 0, rhs);
    device.queue.writeBuffer(params, 0, new Uint32Array([m, k, n, 0]));
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: aBuffer } },
        { binding: 1, resource: { buffer: bBuffer } },
        { binding: 2, resource: { buffer: outBuffer } },
        { binding: 3, resource: { buffer: params } },
      ],
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(resultLength / 64));
    pass.end();
    encoder.copyBufferToBuffer(outBuffer, 0, readback, 0, resultLength * 4);
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    new Float32Array(outputBuffer).set(new Float32Array(readback.getMappedRange()));
    readback.unmap();
    for (const buffer of [aBuffer, bBuffer, outBuffer, params, readback]) buffer.destroy();
    Atomics.store(state, 0, 1);
  } catch (error) {
    const message = new TextEncoder().encode(String(error?.message ?? error).slice(0, errorBytes.length - 1));
    errorBytes.set(message);
    Atomics.store(state, 0, -1);
  }
  Atomics.notify(state, 0);
};
