#!/usr/bin/env node
// Unscored browser-only G2P check. No neural weights or synthesized audio are read.
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing ${name} value`);
  return args[index + 1];
};
const espeakDir = option('--espeak-dir');
const configPath = option('--config');
const chrome = option('--chrome', process.env.CHROME_PATH);
if (!espeakDir || !configPath || !chrome) throw new Error('Usage: node tools/check-ua-serhiy-frontend.mjs --espeak-dir PINNED_PIPER_ROOT --config PINNED_PHONEME_CONFIG --chrome CHROME_PATH [--out FILE]');
const outputPath = resolve(option('--out', '.cache/ua-serhiy-frontend/audit.json'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const golden = JSON.parse(await readFile(resolve(repo, 'tests/fixtures/ua-serhiy-frontend.json'), 'utf8'));
const configBytes = await readFile(resolve(configPath));
if (sha(configBytes) !== golden.configSha256) throw new Error('Unexpected Serhiy ID-map config bytes');
const phonemeIdMap = JSON.parse(configBytes).phoneme_id_map;
const sourceBytes = await readFile(resolve(repo, 'fixtures/uk-article-v1.txt'));
const sourceText = sourceBytes.toString('utf8');
const fixture = JSON.parse(await readFile(resolve(repo, 'fixtures/uk-article-v1.chunks.json'), 'utf8'));
if (sha(sourceBytes) !== fixture.articleSha256) throw new Error('Fixture text hash mismatch');
const chunks = fixture.chunks.map(span => {
  const text = sourceText.slice(span.start, span.end);
  if (sha(text) !== span.sha256) throw new Error(`Fixture span ${span.id} hash mismatch`);
  return { ...span, text };
});
if (chunks.map(span => span.text).join('') !== sourceText) throw new Error('Fixture coverage mismatch');
const assets = {
  '/espeak.js': resolve(espeakDir, 'resources/espeakng.worker.js'),
  '/espeak.wasm': resolve(espeakDir, 'resources/espeakng.worker.wasm'),
  '/espeak.data': resolve(espeakDir, 'espeakng.worker.data'),
  '/frontend.mjs': resolve(repo, 'web/ua-serhiy-0p58m/frontend.mjs'),
};
const assetDigests = {};
for (const [url, path] of Object.entries(assets)) {
  const bytes = await readFile(path);
  assetDigests[url] = { sha256: sha(bytes), bytes: bytes.length };
  if (url.startsWith('/espeak') && JSON.stringify(assetDigests[url]) !== JSON.stringify(golden.espeakAssets[url])) throw new Error(`Pinned frontend asset mismatch: ${url}`);
}
const workerSource = `
import createEspeak from '/espeak.js';
import {createUaSerhiyPhonemizer,prepareUaSerhiyText,espeakUaText,stripUaStress} from '/frontend.mjs';
self.onmessage = async ({data: input}) => {
  let fn;
  try {
    fn = await createUaSerhiyPhonemizer({createEspeak,
      wasmBinary:new Uint8Array(await (await fetch('/espeak.wasm')).arrayBuffer()),
      data:await (await fetch('/espeak.data')).arrayBuffer()});
    const out = {examples:[],spans:[]};
    for (const e of input.examples) {
      const p = await prepareUaSerhiyText(e.text,{phonemize:fn,phonemeIdMap:input.phonemeIdMap});
      out.examples.push({id:e.id,text:e.text,raw:fn(stripUaStress(espeakUaText(e.text)),'uk'),
        expected:e.expected,actual:p.tokenIds,match:JSON.stringify(e.expected)===JSON.stringify(p.tokenIds),
        stressStats:p.stressStats,pieces:p.sentences});
    }
    for (const span of input.chunks) {
      try {
        const p = await prepareUaSerhiyText(span.text,{phonemize:fn,phonemeIdMap:input.phonemeIdMap});
        out.spans.push({id:span.id,sourceCharacters:span.text.length,sourceSha256:span.sha256,
          coverage:p.sentences.map(s=>s.text).join('')===span.text,
          counts:p.sentences.map(s=>s.ids.length),stressStats:p.stressStats,pieces:p.sentences});
      } catch (e) {out.spans.push({id:span.id,error:e.message});}
    }
    postMessage({done:true,out});
  } catch (e) {postMessage({done:true,error:e.stack});}
  finally {fn?.dispose();}
};`;
const server = http.createServer(async (request, response) => {
  try {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    if (request.url === '/') { response.end('<!doctype html><title>Serhiy phoneme audit</title>'); return; }
    if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (request.url === '/audit-worker.mjs') { response.setHeader('Content-Type', 'text/javascript'); response.end(workerSource); return; }
    const path = assets[request.url];
    if (!path) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', /\.m?js$/u.test(request.url) ? 'text/javascript' : request.url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
    response.end(await readFile(path));
  } catch (error) { response.writeHead(500).end(String(error)); }
});
await new Promise((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes); });
let browser;
try {
  browser = await chromium.launch({ executablePath: chrome, headless: false, args: ['--no-first-run'] });
  const page = await browser.newPage();
  const externalRequests = [];
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== origin) { externalRequests.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto(origin);
  const result = await page.evaluate(async input => new Promise((yes, no) => {
    const worker = new Worker('/audit-worker.mjs', {type:'module'});
    const timer = setTimeout(() => {worker.terminate();no(new Error('Frontend audit timed out'));}, 60000);
    worker.onmessage = ({data}) => {
      if (!data?.done) return;
      clearTimeout(timer);worker.terminate();data.error ? no(new Error(data.error)) : yes(data.out);
    };
    worker.onerror = event => {clearTimeout(timer);worker.terminate();no(new Error(event.message));};
    worker.postMessage(input);
  }), { chunks, examples: golden.examples, phonemeIdMap });
  const counts = result.spans.flatMap(span => span.counts ?? []);
  const summary = {sourceSpans:chunks.length,sourceCharacters:sourceText.length,pieces:counts.length,
    totalIds:counts.reduce((a,b)=>a+b,0),maxIds:Math.max(...counts),
    sourceCoverage:result.spans.every(span=>span.coverage),
    errors:result.spans.filter(span=>span.error),goldensMatch:result.examples.every(example=>example.match)};
  const proof = {kind:'unscored-browser-frontend-audit',browser:browser.version(),fixtureSha256:sha(sourceBytes),
    configSha256:sha(configBytes),assetDigests,externalRequests,summary,...result};
  await mkdir(dirname(outputPath),{recursive:true});
  await writeFile(outputPath,JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(summary));
  if (externalRequests.length || !summary.goldensMatch || !summary.sourceCoverage || summary.errors.length || summary.maxIds>255) throw new Error('Frontend audit failed; inspect saved proof');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
