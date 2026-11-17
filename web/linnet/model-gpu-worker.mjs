import { isSoftwareWebGpuAdapter } from './runtime-policy.mjs';
import { materializeRhsBuffer } from './gpu-rhs-buffer.mjs';

let device = null;
let pipeline = null;
let adapterInfo = null;
const weights = new Map();

const shader = `
struct Params { m: u32, k: u32, n: u32, transposeB: u32 };
@group(0) @binding(0) var<storage, read> lhs: array<f32>;
@group(0) @binding(1) var<storage, read> rhs: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;
@group(0) @binding(3) var<uniform> p: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let flat = id.x;
  if (flat >= p.m * p.n) { return; }
  let row = flat / p.n;
  let column = flat % p.n;
  var sum = 0.0;
  for (var inner = 0u; inner < p.k; inner += 1u) {
    var weightIndex = inner * p.n + column;
    if (p.transposeB != 0u) { weightIndex = column * p.k + inner; }
    sum += lhs[row * p.k + inner] * rhs[weightIndex];
  }
  output[flat] = sum;
}
`;

function finish(request, error = null) {
  const state = new Int32Array(request.stateBuffer);
  if (error) {
    const bytes = new TextEncoder().encode(String(error?.message ?? error));
    new Uint8Array(request.errorBuffer).set(bytes.subarray(0, request.errorBuffer.byteLength - 1));
    Atomics.store(state, 0, -1);
  } else {
    Atomics.store(state, 0, 1);
  }
  Atomics.notify(state, 0);
}

async function initialize(allowSoftwareGpu) {
  if (!navigator.gpu) throw new Error('navigator.gpu is unavailable in the WebGPU worker.');
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
    forceFallbackAdapter: allowSoftwareGpu,
  });
  if (!adapter) throw new Error('No WebGPU adapter is available in the WebGPU worker.');
  const info = (() => {
    try {
      const value = adapter.info;
      return value ? { vendor: value.vendor, architecture: value.architecture, device: value.device, description: value.description,
        isFallbackAdapter: value.isFallbackAdapter === true } : null;
    } catch { return null; }
  })();
  const fallback = isSoftwareWebGpuAdapter(adapter, info);
  if (fallback && !allowSoftwareGpu) throw new Error('Only a software WebGPU adapter is available; this temporary path requires explicit diagnostic opt-in.');
  device = await adapter.requestDevice();
  adapterInfo = { ...(info ?? {}), available: true, isFallbackAdapter: fallback };
  pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module: device.createShaderModule({ code: shader }), entryPoint: 'main' },
  });
  device.lost.then(info => { device = null; self.postMessage({ type: 'device-lost', reason: info?.message || info?.reason || 'WebGPU device lost.' }); });
  return adapterInfo;
}

function makeBuffer(size, usage) {
  if (!Number.isSafeInteger(size) || size <= 0 || size % 4 !== 0) throw new Error(`Invalid GPU buffer size ${size}.`);
  if (size > device.limits.maxBufferSize) throw new Error(`Buffer ${size} exceeds maxBufferSize ${device.limits.maxBufferSize}.`);
  return device.createBuffer({ size, usage });
}

async function dispatch(request) {
  if (!device) throw new Error('WebGPU device is not initialized.');
  const { m, k, n, transposeB } = request;
  const lhs = Float32Array.from(new Float32Array(request.inputBuffer));
  const rhsBinding = materializeRhsBuffer(request, weights,
    size => {
      if (size > device.limits.maxStorageBufferBindingSize) {
        throw new Error(`Weight buffer ${size} exceeds maxStorageBufferBindingSize ${device.limits.maxStorageBufferBindingSize}.`);
      }
      return makeBuffer(size, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    },
    (buffer, rhs) => device.queue.writeBuffer(buffer, 0, rhs));
  const rhsBuffer = rhsBinding.buffer;

  const outBytes = m * n * Float32Array.BYTES_PER_ELEMENT;
  let lhsBuffer;
  let outBuffer;
  let paramsBuffer;
  let readback;
  try {
    lhsBuffer = makeBuffer(lhs.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    outBuffer = makeBuffer(outBytes, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    paramsBuffer = makeBuffer(16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    readback = makeBuffer(outBytes, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ);
    device.queue.writeBuffer(lhsBuffer, 0, lhs);
    device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([m, k, n, transposeB ? 1 : 0]));
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: lhsBuffer } },
        { binding: 1, resource: { buffer: rhsBuffer } },
        { binding: 2, resource: { buffer: outBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } },
      ],
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(m * n / 64));
    pass.end();
    encoder.copyBufferToBuffer(outBuffer, 0, readback, 0, outBytes);
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    const values = new Float32Array(readback.getMappedRange().slice(0));
    new Float32Array(request.outputBuffer).set(values);
    readback.unmap();
  } finally {
    lhsBuffer?.destroy();
    outBuffer?.destroy();
    paramsBuffer?.destroy();
    readback?.destroy();
    if (rhsBinding.transient) rhsBuffer.destroy();
  }
}

self.onmessage = async ({ data }) => {
  if (data?.type === 'initialize') {
    try {
      const info = await initialize(data.allowSoftwareGpu === true);
      self.postMessage({ type: 'ready', ok: true, adapterInfo: info });
    } catch (error) {
      self.postMessage({ type: 'ready', ok: false, error: String(error?.message ?? error) });
    }
    return;
  }
  if (data?.type !== 'dispatch') return;
  try {
    await dispatch(data.request);
    finish(data.request);
    self.postMessage({ id: data.id, ok: true });
  } catch (error) {
    finish(data.request, error);
    self.postMessage({ id: data.id, ok: false, error: String(error?.message ?? error) });
  }
};
