import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { phonemizeEnglish } from '../../web/inflect-atom/frontend.mjs';
const root = path.resolve(process.argv[2]);
const { default: create } = await import(pathToFileURL(path.join(root, 'espeak.mjs')));
globalThis.atomData = await readFile(path.join(root, 'espeak.data'));
const module = await create({
  wasmBinary: await readFile(path.join(root, 'espeak.wasm')),
  getPreloadedPackage: () => {
    const value = globalThis.atomData;
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  },
  preRun: [],
});
assert.equal(module._atom_espeak_init(), 0);
const cases = JSON.parse(await readFile(path.join(root, 'frontend-parity.json')));
for (const item of cases) {
  const actual = phonemizeEnglish(item.text, (text) => module.ccall('atom_espeak', 'string', ['string'], [text]));
  assert.equal(actual, item.phonemes, `span ${item.id}`);
}
console.log(`Exact native/browser frontend parity: ${cases.length} spans`);
