import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { chromium } from 'playwright-core';
import { SANO_KOKOPOP_PROFILES } from '../web/adapters/sano-kokopop-config.mjs';
const root = resolve(import.meta.dirname, '..');
const release = '.cache/sano-kokopop-build/release';
const out = resolve(root, '.cache/sano-kokopop-browser-evidence/frontend-audit');
const hash = value => createHash('sha256').update(value).digest('hex');
const build = JSON.parse(await readFile(resolve(root, release, 'frontend-audit/AUDIT-BUILD.json')));
for (const [name, pin] of Object.entries(build.diagnosticRuntime)) {
  const bytes = await readFile(resolve(root, release, 'frontend-audit', name));
  assert.equal(bytes.length, pin.bytes); assert.equal(hash(bytes), pin.sha256);
  assert.equal(hash(await readFile(resolve(root, release, name))), build.ordinaryRuntime[name]);
}
const article = await readFile(resolve(root, 'fixtures/en-20000.txt'), 'utf8');
const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/en-20000.chunks.json')));
assert.equal(article.length, 20000); assert.equal(hash(article), fixture.articleSha256); assert.equal(fixture.chunks.length, 93);
const spans = fixture.chunks.map(span => ({ ...span, text: article.slice(span.start, span.end) }));
for (const span of spans) assert.equal(hash(span.text), span.sha256);
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + path);
    const rel = relative(root, file);
    if (rel === '..' || rel.startsWith('..' + sep) || path.includes('/.git/')) throw new Error('forbidden');
    const body = path === '/' ? '<!doctype html><title>Untimed frontend audit</title>' : await readFile(file);
    response.writeHead(200, { 'Content-Type': /\.(mjs|js)$/.test(path) ? 'text/javascript' : path.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' }).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
await mkdir(out, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: false, args: ['--enable-unsafe-webgpu'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + server.address().port + '/');
  for (const [id, profile] of Object.entries(SANO_KOKOPOP_PROFILES)) {
    const model = await readFile(resolve(root, release, profile.model.url.split('/').at(-1)));
    assert.equal(model.length, profile.model.bytes); assert.equal(hash(model), profile.model.sha256);
    const reports = await page.evaluate(async ({ profile, spans, release }) => {
      const { default: createModule } = await import('/' + release + '/frontend-audit/kokopop-runtime.js');
      const { Runtime } = await import('/web/sano-kokopop/runtime.js');
      const base = '/' + release + '/frontend-audit/';
      const wasmBinary = await (await fetch(base + 'kokopop-runtime.wasm')).arrayBuffer();
      const data = await (await fetch(base + 'kokopop-runtime.data')).arrayBuffer();
      const module = await createModule({ wasmBinary, locateFile: name => base + name, getPreloadedPackage: () => data });
      const runtime = new Runtime(module);
      try {
        const bytes = await (await fetch('/' + release + '/' + profile.model.url.split('/').at(-1))).arrayBuffer();
        const loaded = await runtime.load(bytes, 1);
        if (!loaded.voices.some(v => v.name === profile.info.settings.selectedVoice && v.sampleRate === profile.info.settings.sampleRate)) throw new Error('Diagnostic voice/rate mismatch');
        return spans.map(span => ({ id: span.id, start: span.start, end: span.end, sha256: span.sha256,
          audit: JSON.parse(module.ccall('kp_frontend_audit', 'string', ['number', 'string', 'string'], [runtime.model, span.text, profile.info.settings.selectedVoice])) }));
      } finally { await runtime.dispose(); }
    }, { profile, spans, release });
    const summary = { finalSkipped: {}, planningSkipped: {}, durationFallbacks: 0, acousticFallbacks: 0, internalChunks: 0 };
    const count = (target, skips) => { for (const skip of skips) { const key = JSON.stringify(skip); target[key] = (target[key] || 0) + 1; } };
    for (const report of reports) {
      assert.equal(report.sha256, spans[report.id].sha256); assert.equal(report.audit.ok, true, JSON.stringify(report));
      assert.equal(report.audit.sampleRate, profile.info.settings.sampleRate);
      count(summary.planningSkipped, report.audit.planningPassSkips);
      for (const chunk of report.audit.chunks) {
        assert.equal(chunk.matchesInferenceTokens, true); summary.internalChunks++;
        count(summary.finalSkipped, chunk.finalTokenizationSkips);
        summary.durationFallbacks += chunk.duration.length; summary.acousticFallbacks += chunk.acoustic.length;
      }
    }
    const evidence = { modelId: id, modelSha256: profile.model.sha256, fixtureSha256: fixture.articleSha256, spanCount: reports.length, build, summary, reports, inferenceRun: false, interpretation: 'Counts are observations, not automatic speech-quality acceptance. Final skips count each inference-token sequence once; planning skips include repeated chunk-planning passes.' };
    await writeFile(resolve(out, id + '.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ modelId: id, summary }));
  }
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
