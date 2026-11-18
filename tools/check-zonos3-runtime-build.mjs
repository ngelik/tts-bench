#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const buildDirectory = process.argv[2];
if (!buildDirectory) throw new Error('Usage: node tools/check-zonos3-runtime-build.mjs BUILD_DIRECTORY');

const lock = JSON.parse(await readFile('assets.lock.json', 'utf8'));
const model = lock.models?.['zonos3-mini'];
assert.ok(model, 'assets.lock.json contains zonos3-mini');
const files = model.runtime?.files;
assert.ok(Array.isArray(files) && files.length > 0, 'zonos3-mini has locked WebGPU runtime files');

async function listFiles(directory, prefix = '') {
  const found = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) found.push(...await listFiles(resolve(directory, item.name), path));
    else found.push(path);
  }
  return found.sort();
}

const expectedPaths = files.map(file => file.path).sort();
const actualPaths = await listFiles(resolve(buildDirectory));
assert.deepEqual(actualPaths, expectedPaths, 'generated WebGPU runtime file set matches the asset lock');

for (const file of files) {
  const built = await readFile(resolve(buildDirectory, file.path));
  assert.equal(built.length, file.bytes, `${file.path} size matches the asset lock`);
  assert.equal(createHash('sha256').update(built).digest('hex'), file.sha256, `${file.path} SHA-256 matches the asset lock`);
  console.log(`${file.path}  ${built.length} bytes  ${file.sha256}`);
}
