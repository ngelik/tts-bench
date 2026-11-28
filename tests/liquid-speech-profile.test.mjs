import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { liquidAudioLanguageTags, resolveLiquidAudioProfile } from '../web/liquid-speech-profile.mjs';

const registry = JSON.parse(fs.readFileSync(new URL('../fixtures/registry.json', import.meta.url), 'utf8'));

test('both LFM3-Audio registry profiles exactly match the worker language map', () => {
  const workerLanguages = liquidAudioLanguageTags();
  for (const modelId of ['lfm3-audio-2b-fusor-q7-cpu', 'lfm3-audio-2b-gguf']) {
    assert.deepEqual(registry.modelFrontendLanguages[modelId], workerLanguages);
  }
  assert.equal(registry.modelFrontendLanguages['lfm3-omni-2b-fusor-q7-cpu'], undefined);
  assert.equal(registry.modelFrontendLanguages['lfm3-omni-2b-gguf'], undefined);
});

test('LFM3-Audio preserves the current English prompt and resolves approved locale names', () => {
  assert.equal(resolveLiquidAudioProfile('en').systemPrompt, 'Perform TTS in American English using a female voice.');
  assert.equal(resolveLiquidAudioProfile('pt-BR').systemPrompt, 'Perform TTS in Portuguese using a female voice.');
  assert.equal(resolveLiquidAudioProfile('es-ES').systemPrompt, 'Perform TTS in Spanish using a female voice.');
  assert.equal(resolveLiquidAudioProfile('zh-Hans').systemPrompt, 'Perform TTS in Chinese using a female voice.');
});

test('LFM3-Audio rejects unconfigured and inherited object keys instead of silently using English', () => {
  for (const language of [undefined, 'pt', 'zh', 'en-GB', 'ru', 'constructor', '__proto__', 'toString']) {
    assert.throws(() => resolveLiquidAudioProfile(language), /no approved browser speech profile/);
  }
});
