import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(process.argv[2]);
const { default: create } = await import(pathToFileURL(path.join(root, 'dsp.mjs')));
const module = await create({ wasmBinary: await readFile(path.join(root, 'dsp.wasm')) });
const metadata = JSON.parse(await readFile(path.join(root, 'dsp-parity.json')));
const constants = JSON.parse(await readFile(path.join(root, 'dsp.json')));
const read = async (name) => { const data = await readFile(path.join(root, name)); return new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)); };
const allocations = [];
const put = (data) => { const pointer = module._malloc(data.length * 4); assert(pointer); allocations.push(pointer); module.HEAPF32.set(data, pointer / 4); return pointer; };
try {
  const features = [];
  for (const name of ['f0_norm', 'voiced_logits', 'harmonic_log', 'noise_log', 'noise']) features.push(put(await read(`parity-${name}.f32`)));
  const theta = put(constants.theta), fir = put(constants.fir), output = put(new Float32Array(metadata.samples));
  assert.equal(module._atom_render(...features, theta, fir, metadata.frames, constants.f0_mean[2], constants.f0_std[2], output), 0);
  const actual = module.HEAPF32.slice(output / 4, output / 4 + metadata.samples);
  const expected = await read('parity-wave.f32');
  let maxError = 0, sumSquaredError = 0, referencePower = 0;
  for (let i = 0; i < actual.length; i++) {
    assert(Number.isFinite(actual[i]));
    const error = actual[i] - expected[i];
    maxError = Math.max(maxError, Math.abs(error)); sumSquaredError += error * error; referencePower += expected[i] ** 2;
  }
  const evidence = { samples: actual.length, maxAbsoluteError: maxError, rootMeanSquaredError: Math.sqrt(sumSquaredError / actual.length), referenceRootMeanSquared: Math.sqrt(referencePower / actual.length) };
  await writeFile(path.join(root, 'dsp-wasm-parity.json'), JSON.stringify(evidence, null, 2) + '\n');
  assert(maxError < 0.002); assert(evidence.rootMeanSquaredError < 0.0002);
  const noise = put(new Float32Array(1000));
  module._atom_noise(noise, 1000, 7717);
  const first = module.HEAPF32.slice(noise / 4, noise / 4 + 1000);
  module._atom_noise(noise, 1000, 7717);
  assert.deepEqual(first, module.HEAPF32.slice(noise / 4, noise / 4 + 1000));
  assert(first.every(Number.isFinite));
  console.log(JSON.stringify(evidence));
} finally { for (const pointer of allocations) module._free(pointer); }
