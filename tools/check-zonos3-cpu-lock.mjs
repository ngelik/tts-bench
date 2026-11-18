#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node tools/check-zonos3-cpu-lock.mjs BUILD_DIRECTORY');
const targets = [
  'runtimes/audio-cpp-zonos3-cpu-wasm-v2/bench_zonos3_cpu.js',
  'runtimes/audio-cpp-zonos3-cpu-wasm-v2/bench_zonos3_cpu.wasm',
  'runtimes/audio-cpp-zonos3-cpu-wasm-v2/THIRD-PARTY-NOTICES.txt',
];
const lock = JSON.parse(await readFile('assets.lock.json', 'utf8'));
const model = lock.models?.['zonos3-mini'];
assert.ok(model, 'assets.lock.json contains zonos3-mini');
const entries = targets.map(target => {
  const entry = model.assets?.find(asset => asset.target === target);
  assert.ok(entry, `zonos3-mini lock contains ${target}`);
  return { target, entry };
});
const wasm = entries.find(({ target }) => target.endsWith('.wasm'))?.entry;
assert.ok(wasm && /^[a-f0-9]{64}$/.test(wasm.sha256), 'ZONOS3 CPU wasm lock has a full SHA-256');
const releaseTag = 'zonos3-cpu-wasm-v2-' + wasm.sha256.slice(0, 12);
for (const { target, entry } of entries) {
  assert.equal(entry.url, `https://github.com/ngelik/tts-bench/releases/download/${releaseTag}/${basename(target)}`,
    `${target} uses the immutable runtime release asset URL`);
  const bytes = await readFile(resolve(directory, basename(target)));
  assert.equal(bytes.length, entry.bytes, `${target} build size matches the lock`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, entry.sha256, `${target} build SHA-256 matches the lock`);
  console.log(`${target}  ${bytes.length} bytes  ${sha256}`);
}
