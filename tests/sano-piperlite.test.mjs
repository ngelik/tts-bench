import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSanoPiperliteAdapter } from '../web/adapters/sano-piperlite.mjs';

const workerSource = await readFile(new URL('../web/workers/sano-piperlite.js', import.meta.url), 'utf8');
const benchmark = await readFile(new URL('../web/bench.mjs', import.meta.url), 'utf8');

test('Sano piperlite adapter rejects arbitrary model ids', () => {
  assert.throws(() => createSanoPiperliteAdapter('sano-amy'), /Unknown Sano piperlite profile/);
  assert.throws(() => createSanoPiperliteAdapter('https://example.invalid/model'), /Unknown Sano piperlite profile/);
});

test('registered piperlite IDs map to exact locked voice profiles and report CPU/WASM', async () => {
  const expected = {
    'sano-hfc': ['HFC', 'hfc', 22050, 1834380],
    'sano-kristin': ['Kristin', 'kristin', 22050, 1396151],
    'sano-amy-small': ['Amy-small', 'amy-en-1p1m', 22050, 1084972],
    'sano-amy-1p8m': ['Amy 1.8M', 'amy-en-1p8m', 22050, 1834380],
  };
  for (const [modelId, [label, voiceKey, rate, params]] of Object.entries(expected)) {
    const posted = [];
    const context = {
      URL,
      self: {
        location: { origin: 'http://127.0.0.1:4173' },
        postMessage(message) { posted.push(message); },
      },
    };
    context.globalThis = context;
    vm.runInNewContext(workerSource, context, { filename: 'sano-piperlite.js' });
    await context.self.onmessage({ data: { id: 1, action: 'initialize', options: { backend: 'webgpu', modelId } } });
    const result = posted.at(-1).value;
    assert.equal(result.status, 'unsupported');
    assert.equal(result.backendEffective, 'none');
    assert.equal(result.capability.gpuDispatchVerified, false);
    assert.match(result.voice, new RegExp(label));
    assert.equal(result.settings.voiceKey, voiceKey);
    assert.equal(result.settings.sampleRate, rate);
    assert.equal(result.settings.parameterCount, params);
  }
  assert.match(benchmark, /'sano-hfc': \(\) => createSanoPiperliteAdapter\('sano-hfc'\)/);
  assert.match(benchmark, /'sano-kristin': \(\) => createSanoPiperliteAdapter\('sano-kristin'\)/);
  assert.match(benchmark, /'sano-amy-small': \(\) => createSanoPiperliteAdapter\('sano-amy-small'\)/);
  assert.match(benchmark, /'sano-amy-1p8m': \(\) => createSanoPiperliteAdapter\('sano-amy-1p8m'\)/);
});

test('piperlite worker pins local runtime scripts, voice metadata and exact weight closure', () => {
  assert.match(workerSource, /const RUNTIME_ROOT = '\/runtimes\/sanotts-web\/0\.3\.0\/dist\/'/);
  assert.match(workerSource, /new URL\('snt_g2p\.js', runtimeBase\)/);
  assert.match(workerSource, /new URL\('snt_voice\.js', runtimeBase\)/);
  assert.match(workerSource, /if \(url\.origin !== self\.location\.origin\)/);
  assert.match(workerSource, /meta\.g2p_voice_slot !== profile\.g2pVoiceSlot/);
  assert.match(workerSource, /meta\.front_bytes !== profile\.frontBytes/);
  assert.match(workerSource, /meta\.dec_bytes !== profile\.decBytes/);
  assert.match(workerSource, /meta\.length_scale !== profile\.lengthScale/);
  assert.match(workerSource, /result\.samples\.length >= model\.profile\.sampleRate \* MAX_SECONDS/);
  assert.doesNotMatch(workerSource, /https?:\/\//);
});
