#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const [directory, ...privatePaths] = process.argv.slice(2);
if (!directory) throw new Error('Usage: node tools/check-zonos3-cpu-build.mjs DIRECTORY [LOCAL_PATH ...]');
const expected = ['THIRD-PARTY-NOTICES.txt', 'bench_zonos3_cpu.js', 'bench_zonos3_cpu.wasm'];
for (const name of expected) {
  const bytes = await readFile(resolve(directory, name));
  if (name.endsWith('.wasm') && (bytes.length < 8 || bytes[0] !== 0 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d)) {
    throw new Error(name + ' is not a WebAssembly module.');
  }
  if (name === 'THIRD-PARTY-NOTICES.txt') {
    const content = bytes.toString('utf8');
    if (content.includes('.cache/builds/zonos3-cpu-wasm.') || /\/home\/runner\/|\/private\/tmp\//u.test(content)) {
      throw new Error(name + ' embeds a per-build or private path.');
    }
  }
  if (name !== 'THIRD-PARTY-NOTICES.txt') {
    const content = bytes.toString('latin1');
    const forbidden = ['/Users/', '/private/tmp/', '/private/var/folders/', ...privatePaths.map(path => resolve(path))];
    if (forbidden.some(prefix => content.includes(prefix)) || /\/home\/(?!web_user\b)/u.test(content)) {
      throw new Error(name + ' embeds a local build path.');
    }
  }
  if (name.endsWith('.js')) {
    const content = bytes.toString('latin1');
    if (!content.includes('createZonos3Cpu') || !content.includes('bench_zonos3_cpu.wasm')) {
      throw new Error(name + ' is missing the expected ZONOS3 module exports.');
    }
  }
  console.log(basename(name) + '  ' + bytes.length + ' bytes  ' + createHash('sha256').update(bytes).digest('hex'));
}
