import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/bench.mjs', import.meta.url));

function modelsFor(language) {
  return JSON.parse(execFileSync(process.execPath, [cli, 'models', '--language', language], { encoding: 'utf8' }));
}

test('model discovery filters by executable browser language, preserving locale distinctions', () => {
  const french = modelsFor('FR');
  assert.ok(french.some(model => model.id === 'supertonic-3'));
  assert.ok(french.every(model => model.frontendLanguages.includes('fr')));
  assert.ok(!french.some(model => model.id === 'ua-serhiy-0p58m'));
  assert.ok(modelsFor('uk').some(model => model.id === 'ua-serhiy-0p58m'));
  assert.ok(!modelsFor('fr-CA').some(model => model.id === 'supertonic-3'));
});
