// Hosted Chrome preflight: compare all 93 frontend plans, then synthesize two
// consecutive canonical spans with the real local CPU/WASM worker.
import { chromium } from 'playwright-core';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../lib/server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = await mkdtemp(join(tmpdir(), 'tts-silencio2-browser-'));
const server = await startServer(root);
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: true,
    chromiumSandbox: true,
    ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
    args: ['--disable-software-rasterizer'],
  });
  const page = await context.newPage();
  const external = [];
  const failures = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== new URL(server.url).origin) external.push(request.url());
  });
  page.on('requestfailed', request => failures.push({ url: request.url(), failure: request.failure()?.errorText }));
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });
  const report = await page.evaluate(async () => {
    const root = '/models/silencio-2-onnx-v1/';
    const { PreTrainedTokenizer, env } = await import('/runtimes/transformers/3.5.1/transformers.min.js');
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = '/models/';
    env.useBrowserCache = false;
    const tokenizer = await PreTrainedTokenizer.from_pretrained('silencio-2-onnx-v1', { local_files_only: true });
    const { splitSilencioTaggedText, splitSilencioModelUtterances, prepareSilencioText } = await import('/web/silencio2/frontend.mjs');
    const [articleResponse, fixtureResponse, bundleResponse, sourceResponse] = await Promise.all([
      fetch('/fixtures/en-20000.txt', { cache: 'no-store' }),
      fetch('/fixtures/en-20000.chunks.json', { cache: 'no-store' }),
      fetch(root + 'bundle.json', { cache: 'no-store' }),
      fetch(root + 'SOURCE.json', { cache: 'no-store' }),
    ]);
    if (![articleResponse, fixtureResponse, bundleResponse, sourceResponse].every(response => response.ok)) throw new Error('Canonical fixture or local Silencio-2 bundle is missing.');
    const articleBytes = new Uint8Array(await articleResponse.arrayBuffer());
    const article = new TextDecoder('utf-8', { fatal: true }).decode(articleBytes);
    const fixture = await fixtureResponse.json();
    const bundle = await bundleResponse.json();
    const source = await sourceResponse.json();
    const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
    if (article.length !== 20000 || await digest(articleBytes) !== fixture.articleSha256 || fixture.chunks.length !== 93) throw new Error('Canonical article integrity check failed.');
    if (bundle.frontendParity?.spans?.length !== fixture.chunks.length) throw new Error('Official source frontend parity plan is incomplete.');

    let maxTokens = 0;
    let sourceChunkCount = 0;
    let modelUtteranceCount = 0;
    for (const span of fixture.chunks) {
      const raw = article.slice(span.start, span.end);
      if (await digest(new TextEncoder().encode(raw)) !== span.sha256) throw new Error(`Canonical source span ${span.id} hash mismatch.`);
      const expected = bundle.frontendParity.spans[span.id];
      if (expected.id !== span.id || expected.sourceSpanSha256 !== span.sha256) throw new Error(`Official frontend plan does not match canonical span ${span.id}.`);
      const sourcePlan = [];
      for (const item of splitSilencioTaggedText(tokenizer, raw, bundle.text)) {
        const prepared = prepareSilencioText(item.emotion ? `<${item.emotion}> ${item.text}` : item.text, bundle.text);
        const count = tokenizer(prepared.text, { add_special_tokens: false, truncation: false, padding: false }).input_ids.data.length;
        if (count < 1) throw new Error(`Silencio-2 span ${span.id} has an empty source chunk.`);
        maxTokens = Math.max(maxTokens, count);
        sourceChunkCount++;
        sourcePlan.push({ text: item.text, emotion: item.emotion, tokenCount: count });
      }
      if (JSON.stringify(sourcePlan) !== JSON.stringify(expected.sourceUtterances)) throw new Error(`Browser 48-token chunk plan differs from official PyTorch frontend at source span ${span.id}.`);
      const modelPlan = [];
      for (const item of splitSilencioModelUtterances(tokenizer, raw, bundle.text)) {
        const prepared = prepareSilencioText(item.text, bundle.text);
        const count = tokenizer(prepared.text, { add_special_tokens: false, truncation: false, padding: false }).input_ids.data.length;
        if (count < 1 || count > bundle.text.maxGeneratorTokens) throw new Error(`Silencio-2 model utterance ${span.id} has a ${count}-token input.`);
        maxTokens = Math.max(maxTokens, count);
        modelUtteranceCount++;
        modelPlan.push({ text: item.text, emotion: item.emotion, tokenCount: count });
      }
      if (JSON.stringify(modelPlan) !== JSON.stringify(expected.utterances)) throw new Error(`Browser model-input plan differs from official PyTorch stream frontend at source span ${span.id}.`);
    }

    const { createSilencio2Adapter } = await import('/web/adapters/silencio2.mjs');
    const engine = createSilencio2Adapter();
    let initialization;
    const synthesis = [];
    try {
      initialization = await engine.initialize({ backend: 'cpu', cache: false, probe: false });
      if (initialization.status !== 'measured' || initialization.backendEffective !== 'cpu/wasm') throw new Error(`CPU browser initialization did not succeed: ${JSON.stringify(initialization)}`);
      for (const span of fixture.chunks.slice(0, 2)) {
        const raw = article.slice(span.start, span.end);
        const result = await engine.generateChunk({ ...span, text: raw });
        const samples = result.parts.reduce((sum, part) => sum + part.length, 0);
        if (result.completedChunkId !== span.id || result.sampleRate !== 24000 || samples < 1 || result.parts.some(part => !part.every(Number.isFinite))) {
          throw new Error(`Silencio-2 browser synthesis failed validation for source span ${span.id}.`);
        }
        const joined = new Float32Array(samples);
        let offset = 0;
        for (const part of result.parts) { joined.set(part, offset); offset += part.length; }
        synthesis.push({
          sourceSpanId: span.id,
          sourceSpanSha256: span.sha256,
          sampleRate: result.sampleRate,
          samples,
          pcmSha256: await digest(new Uint8Array(joined.buffer)),
        });
      }
    } finally {
      await engine.dispose();
    }
    return {
      fixture: { characters: article.length, spans: fixture.chunks.length, articleSha256: fixture.articleSha256 },
      fullInputAudit: { officialPlanMatched: true, sourceChunks: sourceChunkCount, modelUtterances: modelUtteranceCount, maxTokens, sourceSpans: 93 },
      initialization,
      synthesis,
      sourceCommit: source.sourceCommit,
    };
  });
  const receipt = { ...report, externalRequests: external, failedRequests: failures };
  console.log(JSON.stringify(receipt, null, 2));
  if (external.length || failures.length || report.synthesis.length !== 2 || !report.fullInputAudit.officialPlanMatched) process.exitCode = 1;
} finally {
  await context?.close();
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
