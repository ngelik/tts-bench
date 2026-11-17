import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const assets = new Map([
  ['/', { type: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>WGSL kernel probe</title>' }],
  ['/tools/linnet-webgpu-probe/compute-worker.js', {
    type: 'text/javascript; charset=utf-8',
    body: await readFile(new URL('./linnet-webgpu-probe/compute-worker.js', import.meta.url), 'utf8'),
  }],
  ['/tools/linnet-webgpu-probe/gpu-worker.js', {
    type: 'text/javascript; charset=utf-8',
    body: await readFile(new URL('./linnet-webgpu-probe/gpu-worker.js', import.meta.url), 'utf8'),
  }],
]);
const server = http.createServer((req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  if (!asset) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    'content-type': asset.type,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  res.end(asset.body);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    headless: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--use-angle=swiftshader',
      '--use-vulkan=swiftshader',
    ],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  const report = await page.evaluate(async () => {
    if (!crossOriginIsolated) throw new Error('The test page is not cross-origin isolated.');
    if (!navigator.gpu) throw new Error('navigator.gpu is unavailable in this software probe');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter is available in the software probe');
    const device = await adapter.requestDevice();
    const adapterInfo = (() => {
      try {
        const info = adapter.info;
        return info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null;
      } catch {
        return null;
      }
    })();
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

    async function checkMatmul(m, k, n) {
      const lhs = Float32Array.from({ length: m * k }, (_, i) => Math.sin(i * 0.173) * 0.75);
      const rhs = Float32Array.from({ length: k * n }, (_, i) => Math.cos(i * 0.119) * 0.5);
      const expected = new Float32Array(m * n);
      for (let row = 0; row < m; row++) {
        for (let col = 0; col < n; col++) {
          let sum = 0;
          for (let inner = 0; inner < k; inner++) sum += lhs[row * k + inner] * rhs[inner * n + col];
          expected[row * n + col] = sum;
        }
      }
      const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
      const aBuffer = device.createBuffer({ size: lhs.byteLength, usage: storage });
      const bBuffer = device.createBuffer({ size: rhs.byteLength, usage: storage });
      const outBuffer = device.createBuffer({ size: expected.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
      const params = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const readback = device.createBuffer({ size: expected.byteLength, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
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
      pass.dispatchWorkgroups(Math.ceil(m * n / 64));
      pass.end();
      encoder.copyBufferToBuffer(outBuffer, 0, readback, 0, expected.byteLength);
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      await readback.mapAsync(GPUMapMode.READ);
      const actual = new Float32Array(readback.getMappedRange().slice(0));
      let maxError = 0;
      for (let i = 0; i < actual.length; i++) maxError = Math.max(maxError, Math.abs(actual[i] - expected[i]));
      readback.unmap();
      for (const buffer of [aBuffer, bBuffer, outBuffer, params, readback]) buffer.destroy();
      if (maxError > 0.0002) throw new Error(`Matmul ${m}x${k}x${n} differs from CPU by ${maxError}`);
      return { m, k, n, outputValues: actual.length, maxAbsoluteError: maxError };
    }

    const cases = [await checkMatmul(1, 64, 32), await checkMatmul(37, 64, 128)];
    const lhs = Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.173) * 0.75);
    const rhs = Array.from({ length: 64 * 32 }, (_, i) => Math.cos(i * 0.119) * 0.5);
    const directState = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const directErrors = new SharedArrayBuffer(512);
    const directLhs = new SharedArrayBuffer(lhs.length * Float32Array.BYTES_PER_ELEMENT);
    const directRhs = new SharedArrayBuffer(rhs.length * Float32Array.BYTES_PER_ELEMENT);
    const directOutput = new SharedArrayBuffer(32 * Float32Array.BYTES_PER_ELEMENT);
    new Float32Array(directLhs).set(lhs);
    new Float32Array(directRhs).set(rhs);
    const direct = await new Promise((resolve, reject) => {
      const worker = new Worker('/tools/linnet-webgpu-probe/gpu-worker.js');
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error('Standalone WebGPU worker timed out.'));
      }, 12000);
      worker.onmessage = ({ data }) => {
        clearTimeout(timer);
        worker.terminate();
        data.ok ? resolve({ ...data, output: Array.from(new Float32Array(directOutput)) }) : reject(new Error(data.error));
      };
      worker.onerror = event => {
        clearTimeout(timer);
        worker.terminate();
        reject(new Error(event.message));
      };
      worker.postMessage({ m: 1, k: 64, n: 32, stateBuffer: directState, errorBuffer: directErrors,
        lhsBuffer: directLhs, rhsBuffer: directRhs, outputBuffer: directOutput });
    });
    let directError = 0;
    for (let col = 0; col < 32; col++) {
      let expected = 0;
      for (let inner = 0; inner < 64; inner++) expected += lhs[inner] * rhs[inner * 32 + col];
      directError = Math.max(directError, Math.abs(direct.output[col] - expected));
    }
    if (directError > 0.0002) throw new Error(`Standalone WebGPU worker differs from CPU by ${directError}`);
    const bridged = await new Promise((resolve, reject) => {
      const worker = new Worker('/tools/linnet-webgpu-probe/compute-worker.js');
      worker.onmessage = ({ data }) => {
        if (data.phase) return;
        worker.terminate();
        data.ok ? resolve(data) : reject(new Error(data.error));
      };
      worker.onerror = event => {
        worker.terminate();
        reject(new Error(event.message));
      };
      worker.postMessage({ m: 1, k: 64, n: 32, lhs, rhs });
    });
    let bridgeError = 0;
    for (let col = 0; col < 32; col++) {
      let expected = 0;
      for (let inner = 0; inner < 64; inner++) expected += lhs[inner] * rhs[inner * 32 + col];
      bridgeError = Math.max(bridgeError, Math.abs(bridged.output[col] - expected));
    }
    if (bridgeError > 0.0002) throw new Error(`Worker/SAB bridge differs from CPU by ${bridgeError}`);
    device.destroy();
    return {
      adapterInfo,
      cases,
      asynchronousGpuWorker: {
        adapterInfo: direct.adapterInfo,
        outputValues: direct.output.length,
        maxAbsoluteError: directError,
      },
      synchronousWorkerBridge: {
        crossOriginIsolated,
        waitResult: bridged.wait,
        outputValues: bridged.output.length,
        maxAbsoluteError: bridgeError,
      },
      note: 'Software-adapter WGSL correctness only. No hardware GPU performance, LINNET model output, or runtime integration claim.',
    };
  });
  assert.equal(report.cases.length, 2);
  assert.ok(report.cases.every(test => test.maxAbsoluteError <= 0.0002));
  assert.equal(report.asynchronousGpuWorker.outputValues, 32);
  assert.ok(report.asynchronousGpuWorker.maxAbsoluteError <= 0.0002);
  assert.deepEqual(report.synchronousWorkerBridge, {
    crossOriginIsolated: true,
    waitResult: 'ok',
    outputValues: 32,
    maxAbsoluteError: report.synchronousWorkerBridge.maxAbsoluteError,
  });
  assert.ok(report.synchronousWorkerBridge.maxAbsoluteError <= 0.0002);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
