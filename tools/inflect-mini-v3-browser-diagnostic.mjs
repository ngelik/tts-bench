import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from '../lib/server.mjs';

const root = resolve(import.meta.dirname, '..');
const outputDir = resolve(root, '.cache/inflect-mini-v3-browser-diagnostic');
const staged = JSON.parse(await readFile(resolve(outputDir, 'staged-model.json'), 'utf8'));
const articleBytes = await readFile(resolve(root, 'fixtures/en-20000.txt'));
const article = new TextDecoder('utf-8', { fatal: true }).decode(articleBytes);
const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json'), 'utf8'));
const articleSha256 = createHash('sha256').update(articleBytes).digest('hex');
assert.equal(article.length, 20_000);
assert.equal(articleSha256, fixture.articleSha256);
assert.equal(fixture.chunks.length, 93);
const chunks = fixture.chunks.map(span => {
  assert.ok(span.start >= 0 && span.end > span.start && span.end <= article.length);
  const text = article.slice(span.start, span.end);
  assert.equal(text.length, span.characters);
  assert.equal(createHash('sha256').update(text, 'utf8').digest('hex'), span.sha256);
  return { id: span.id, start: span.start, end: span.end, characters: span.characters, sha256: span.sha256, text };
});
assert.equal(chunks.map(chunk => chunk.text).join(''), article);

const server = await startServer(root);
let browser;
let browserResult = null;
let serverStats = null;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: false,
    args: ['--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const requests = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });

  browserResult = await page.evaluate(async ({ chunks: articleChunks }) => {
    const { prepareMicroText } = await import('/web/inflect-micro-v3/frontend.mjs');
    const { phonemizeMicroEnglish } = await import('/web/inflect-micro-v3/g2p.mjs');
    const revision = 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6';
    const modelRoot = `/models/inflect-mini-v3/${revision}/`;
    const vocabResponse = await fetch(modelRoot + 'phoneme-vocab.json', { cache: 'no-store' });
    if (!vocabResponse.ok) throw new Error(`Mini vocabulary fetch failed: HTTP ${vocabResponse.status}`);
    const vocab = await vocabResponse.json();

    let frontendUtterances = 0;
    let maxTextLength = 0;
    let maxPhonemeCount = 0;
    let totalPhonemes = 0;
    let numericEdits = 0;
    const perSpan = [];
    for (const chunk of articleChunks) {
      const prepared = await prepareMicroText(chunk.text, { phonemize: phonemizeMicroEnglish, vocab });
      if (prepared.originalText !== chunk.text) throw new Error(`Frontend changed canonical source span ${chunk.id}.`);
      if (prepared.utterances.map(piece => piece.text).join('') !== prepared.spokenText) {
        throw new Error(`Frontend internal split did not preserve normalized span ${chunk.id}.`);
      }
      if (!prepared.utterances.length) throw new Error(`Frontend returned no pieces for canonical span ${chunk.id}.`);
      let phonemes = 0;
      for (const piece of prepared.utterances) {
        const count = Array.from(piece.phones).length;
        if (!piece.text.trim() || piece.text.length > 220 || count < 1 || count > 510) {
          throw new Error(`Frontend piece limits failed in canonical span ${chunk.id}.`);
        }
        if (piece.ids.length !== count + 2 || piece.ids[0] !== 0 || piece.ids.at(-1) !== 0) {
          throw new Error(`Frontend token boundary mapping failed in canonical span ${chunk.id}.`);
        }
        for (const id of piece.ids) {
          if (!Number.isInteger(id) || id < 0 || id >= 178) throw new Error('Frontend emitted an invalid token id.');
        }
        phonemes += count;
        totalPhonemes += count;
        maxPhonemeCount = Math.max(maxPhonemeCount, count);
        maxTextLength = Math.max(maxTextLength, piece.text.length);
        frontendUtterances++;
      }
      numericEdits += prepared.numericEdits.length;
      perSpan.push({ id: chunk.id, sourceCharacters: chunk.characters,
        normalizedCharacters: prepared.spokenText.length, pieces: prepared.utterances.length,
        phonemes, numericEdits: prepared.numericEdits.length });
    }

    const { createInflectMiniV3Adapter } = await import('/web/adapters/inflect-mini-v3.mjs');
    const adapter = createInflectMiniV3Adapter();
    let info;
    const generated = [];
    try {
      info = await adapter.initialize({ backend: 'cpu', probe: true, probeText: 'A short browser diagnostic.' });
      if (info.status !== 'measured' || info.backendEffective !== 'cpu/wasm') {
        throw new Error('Mini did not initialize the explicit CPU/WASM backend: ' + JSON.stringify(info));
      }
      for (const chunk of articleChunks.slice(0, 3)) {
        const started = performance.now();
        let firstPcmMs = null;
        const output = await adapter.generateChunk(chunk, {
          onFirstPcm: () => { firstPcmMs ??= performance.now() - started; },
        });
        if (output.sampleRate !== 24_000 || output.completedChunkId !== chunk.id || !output.parts.length) {
          throw new Error(`Mini browser synthesis returned an invalid clock or chunk id for span ${chunk.id}.`);
        }
        const totalSamples = output.parts.reduce((sum, part) => sum + part.length, 0);
        if (!totalSamples) throw new Error(`Mini browser synthesis returned empty audio for span ${chunk.id}.`);
        let peak = 0;
        let squareSum = 0;
        const pcm = new Float32Array(totalSamples);
        let offset = 0;
        for (const part of output.parts) {
          for (const value of part) {
            if (!Number.isFinite(value)) throw new Error(`Mini returned nonfinite audio for span ${chunk.id}.`);
            peak = Math.max(peak, Math.abs(value));
            squareSum += value * value;
          }
          pcm.set(part, offset);
          offset += part.length;
        }
        const rms = Math.sqrt(squareSum / totalSamples);
        if (!(peak > 1e-6 && rms > 1e-6)) throw new Error(`Mini produced silent PCM for span ${chunk.id}.`);
        const pcmSha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pcm.buffer)),
          byte => byte.toString(16).padStart(2, '0')).join('');
        generated.push({ id: chunk.id, sourceCharacters: chunk.characters,
          internalParts: output.parts.length, samples: totalSamples, sampleRate: output.sampleRate,
          firstPcmMs, generationMs: performance.now() - started, rms, peak, pcmSha256 });
      }
    } finally {
      await adapter.dispose();
    }
    return {
      browser: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        webgpuAvailable: Boolean(navigator.gpu), wasm: typeof WebAssembly === 'object' },
      frontend: { spanCount: perSpan.length, sourceCharacters: articleChunks.reduce((n, chunk) => n + chunk.characters, 0),
        totalPieces: frontendUtterances, totalPhonemes, maxPieceCharacters: maxTextLength,
        maxPiecePhonemes: maxPhonemeCount, numericEdits, spans: perSpan },
      backend: { status: info.status, effective: info.backendEffective, settings: info.settings,
        capability: info.capability },
      generated,
    };
  }, { chunks });

  serverStats = server.snapshot();
  assert.equal(browserResult.frontend.spanCount, 93);
  assert.equal(browserResult.frontend.sourceCharacters, 20_000);
  assert.equal(browserResult.generated.length, 3);
  assert.ok(browserResult.generated.every(span => span.firstPcmMs !== null));
  const externalRequests = requests.filter(url => !url.startsWith(server.url));
  assert.deepEqual(externalRequests, [], 'Chrome made no off-origin requests');
  assert.deepEqual(consoleErrors, [], 'Chrome had no page or console errors');
  const report = {
    ...staged,
    diagnosticOnly: true,
    scoreEligible: false,
    fixture: { id: 'english-20k-v1', characters: article.length, spans: chunks.length, sha256: articleSha256 },
    browser: browserResult.browser,
    frontend: browserResult.frontend,
    backend: browserResult.backend,
    generated: browserResult.generated,
    server: serverStats,
    network: { requestCount: requests.length, externalRequests },
    consoleErrors,
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    sourceCommit: staged.sourceCommit,
    exportParityOutcome: staged.exporterOutcome,
    fixture: report.fixture,
    frontend: { spans: report.frontend.spanCount, pieces: report.frontend.totalPieces,
      phonemes: report.frontend.totalPhonemes, maxPiecePhonemes: report.frontend.maxPiecePhonemes },
    backend: report.backend.effective,
    generated: report.generated,
    server: report.server,
  }, null, 2));
} catch (error) {
  serverStats ??= server.snapshot();
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'error.json'), JSON.stringify({
    schemaVersion: 1,
    diagnosticOnly: true,
    scoreEligible: false,
    sourceCommit: staged.sourceCommit,
    exporterOutcome: staged.exporterOutcome,
    browserResult,
    error: String(error?.stack || error),
    server: serverStats,
  }, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
