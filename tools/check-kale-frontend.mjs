// Check the pinned frontend in Chrome without starting a neural inference session.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../lib/server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = await mkdtemp(join(tmpdir(), 'kale-frontend-'));
const server = await startServer(root);
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: false,
    chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    args: ['--disable-software-rasterizer'],
  });
  const page = await context.newPage();
  const external = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== new URL(server.url).origin) external.push(url.origin);
  });
  await page.goto(server.url);
  const receipt = await page.evaluate(async () => {
    const model = '/models/kale-tts-1-nano/';
    const voiceId = 's057b';
    const { KaleTTS, knIPA } = await import(model + 'js/kale-tts.mjs');
    const tts = await KaleTTS.prepare(model, { frontend: model + 'frontend/' });
    const { fe } = await tts._loadVoice(voiceId);
    const text = await (await fetch('/fixtures/en-20000.txt')).text();
    const { chunks, articleSha256 } = await (await fetch('/fixtures/en-20000.chunks.json')).json();
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== articleSha256) throw new Error('Article digest mismatch');

    let utterances = 0;
    let maxIpa = 0;
    let maxTokens = 0;
    for (const chunk of chunks) {
      const raw = text.slice(chunk.start, chunk.end);
      const expected = fe.sentences(raw);
      let index = 0;
      if (!expected.length || expected.some(sentence => /\p{N}/u.test(sentence))) {
        throw new Error(`Empty text or unspoken digits after Kale normalization in span ${chunk.id}`);
      }
      for await (const { text: sentence, ipa, inputs } of tts.inputs(raw, { voice: voiceId })) {
        if (sentence !== expected[index++] || ipa !== fe.ipa(sentence) || [...ipa].length > 500) {
          throw new Error(`Unexpected utterance split or missing IPA in span ${chunk.id}`);
        }
        const expectedIds = [0, ...knIPA([...ipa], false).map(phone => tts.vocab[phone]), 0];
        const actualIds = Array.from(inputs.input_ids.data, Number);
        if (actualIds.length !== expectedIds.length || actualIds.some((id, i) => id !== expectedIds[i])) {
          throw new Error(`Kale dropped an unsupported phoneme in span ${chunk.id}`);
        }
        maxIpa = Math.max(maxIpa, [...ipa].length);
        maxTokens = Math.max(maxTokens, actualIds.length);
      }
      if (index !== expected.length) throw new Error(`Incomplete Kale utterances in span ${chunk.id}`);
      utterances += index;
    }
    return { fixtureId: 'english-20k-v1', articleSha256, voiceId, spans: chunks.length, utterances, maxIpa, maxTokens };
  });
  if (external.length) throw new Error(`Unexpected remote requests: ${external.join(', ')}`);
  console.log(JSON.stringify({ ...receipt, external }, null, 2));
} finally {
  await context?.close();
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
