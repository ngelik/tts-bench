import assert from 'node:assert/strict';
import http from 'node:http';
import { chromium } from 'playwright-core';

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>WGSL kernel probe</title>');
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
    device.destroy();
    return {
      adapterInfo,
      cases,
      note: 'Software-adapter WGSL correctness only. No hardware GPU performance, LINNET model output, or runtime integration claim.',
    };
  });
  assert.equal(report.cases.length, 2);
  assert.ok(report.cases.every(test => test.maxAbsoluteError <= 0.0002));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
