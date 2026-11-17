import assert from 'node:assert/strict';
import test from 'node:test';
import { isBenchmarkSource } from '../tools/provenance.mjs';

test('the Linnet hybrid Rust source and build lock are covered by result fingerprints', () => {
  for (const file of [
    'tools/linnet-webgpu-runtime/src/lib.rs',
    'tools/linnet-webgpu-runtime/Cargo.toml',
    'tools/linnet-webgpu-runtime/Cargo.lock',
    'tools/linnet-webgpu-runtime/prepare-upstream.mjs',
    'tools/build-linnet-webgpu-runtime.mjs',
    'web/linnet/runtime-policy.mjs',
  ]) assert.equal(isBenchmarkSource(file), true, file);
});
