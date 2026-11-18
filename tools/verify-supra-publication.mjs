import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { chromium } from 'playwright-core';
import { findChrome } from '../lib/runner.mjs';

const base = 'https://ngelik.github.io/tts-bench/';
const source = 'ef1163d7a243fe0d82b4c0ecccb5de113d58a9a1';
const modelId = 'supratts-1.0-preview';
const expected = {
  'cpu/warm': {
    id: '2026-11-18t08-13-28-317z-supratts-1.0-preview-cpu-warm-9a02ca76',
    medianSeconds: 21.875630,
    n: 5,
    clipSha256: '82c4027d2fa70d27206723ffe02da2a69f8ca964c6a238d92c2c0f1d4a1dbdd5',
    fullSha256: '89f0a0099081407778e7e4ec4200fcd9de3f9171bb24693313d8877f3966cc1e',
    fullBytes: 61639148,
  },
  'cpu/cached': {
    id: '2026-11-18t08-16-35-187z-supratts-1.0-preview-cpu-cached-43089de0',
    meanMB: 1212.812940,
    n: 1,
  },
  'webgpu/warm': {
    id: '2026-11-18t08-27-58-590z-supratts-1.0-preview-webgpu-warm-c60a14d6',
    medianSeconds: 16.468895,
    n: 5,
    clipSha256: 'c3c48b18a9c8ff032138a8308fdf482f6de9bec09442566c95c2d911f46bda2c',
    fullSha256: '5c1503c288c0307ebf3b28ef3bc35ccffdf2842cf5e9a2db9573993b7b0bc4f4',
    fullBytes: 61639148,
  },
  'webgpu/cached': {
    id: '2026-11-18t08-38-52-443z-supratts-1.0-preview-webgpu-cached-58e39c47',
    meanMB: 2024.567989,
    n: 1,
  },
};

async function fetchJson(relativePath) {
  const url = new URL(relativePath, base);
  url.searchParams.set('codex_verify', String(Date.now()));
  const response = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
  assert.equal(response.status, 200, 'public JSON request failed: ' + url.href);
  return response.json();
}

async function hashPublicAsset(url, expectedSha, expectedBytes) {
  const response = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
  assert.equal(response.status, 200, 'public asset request failed: ' + url);
  assert.ok(response.body, 'public asset response has no body: ' + url);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of Readable.fromWeb(response.body)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  const sha256 = hash.digest('hex');
  assert.equal(bytes, expectedBytes, 'public asset byte count mismatch: ' + url);
  assert.equal(sha256, expectedSha, 'public asset SHA-256 mismatch: ' + url);
  return { url, status: response.status, bytes, sha256 };
}

async function getCurrentDashboardData() {
  let last;
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const data = await fetchJson('assets/data.json');
      const model = data.models?.find(item => item.id === modelId);
      if (model?.warm?.cpu?.resultId === expected['cpu/warm'].id &&
          model?.memory?.cpu?.resultId === expected['cpu/cached'].id &&
          model?.warm?.webgpu?.resultId === expected['webgpu/warm'].id &&
          model?.memory?.webgpu?.resultId === expected['webgpu/cached'].id) return data;
      last = 'Pages data is not yet at all four expected Supra selections';
    } catch (error) {
      last = String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Timed out waiting for the merged Supra dashboard publication: ' + last);
}

const data = await getCurrentDashboardData();
const model = data.models.find(item => item.id === modelId);
assert.ok(model, 'Supra model is missing from public dashboard data');
const manifest = await fetchJson('audio/manifest.json');
const publishedClips = [];
const publicWavs = [];
const audioEntries = manifest.entries.filter(entry => entry.model === modelId);
assert.equal(audioEntries.length, 2, 'expected exactly the two primary warm Supra audio entries');
assert.equal(model.audio.length, 2, 'dashboard data must expose the two Supra warm clips');

for (const [key, backend, scenario] of [
  ['cpu/warm', 'cpu', 'warm'],
  ['cpu/cached', 'cpu', 'cached'],
  ['webgpu/warm', 'webgpu', 'warm'],
  ['webgpu/cached', 'webgpu', 'cached'],
]) {
  const want = expected[key];
  const metric = scenario === 'warm' ? model.warm[backend] : model.memory[backend];
  assert.equal(metric.status, 'measured', key + ' is not measured on public dashboard');
  assert.equal(metric.resultId, want.id, key + ' selects the wrong published receipt');
  assert.equal(metric.sourceCommit, source, key + ' selects the wrong source cohort');
  assert.equal(metric.scenario, scenario, key + ' selects the wrong scenario');
  assert.equal(metric.n, want.n, key + ' repetition count mismatch');
  if (scenario === 'warm') assert.ok(Math.abs(metric.medianSeconds - want.medianSeconds) < 1e-9, key + ' median mismatch');
  else assert.ok(Math.abs(metric.meanMB - want.meanMB) < 1e-6, key + ' average memory mismatch');
}

for (const backend of ['cpu', 'webgpu']) {
  const want = expected[backend + '/warm'];
  const entry = audioEntries.find(item => item.resultId === want.id && item.backend === backend);
  assert.ok(entry, backend + ' warm trial-5 recording is missing from public audio manifest');
  assert.equal(entry.trialIndex, 5, backend + ' audio is not the scored warm trial 5');
  assert.equal(entry.full.sha256, want.fullSha256, backend + ' full WAV manifest SHA mismatch');
  assert.equal(entry.full.bytes, want.fullBytes, backend + ' full WAV manifest size mismatch');
  assert.equal(entry.clip.sha256, want.clipSha256, backend + ' excerpt manifest SHA mismatch');
  assert.equal(entry.clip.bytes, 1440044, backend + ' excerpt manifest size mismatch');
  assert.equal(entry.clip.sampleRate, 24000, backend + ' excerpt sample rate mismatch');
  assert.equal(entry.clip.samples, 720000, backend + ' excerpt sample count mismatch');
  const dashboardAudio = model.audio.find(item => item.resultId === entry.resultId && item.backend === backend);
  assert.ok(dashboardAudio, backend + ' audio entry missing from public dashboard data');
  assert.equal(dashboardAudio.trialIndex, 5);
  assert.equal(dashboardAudio.matchesSelectedWarm, true, backend + ' excerpt is not tied to the selected warm result');
  const playback = model.playbackAudio[backend];
  assert.equal(playback?.clip?.path, entry.clip.path, backend + ' primary playback does not select the warm clip');
  assert.equal(playback?.resultId, want.id, backend + ' playback points to a different result');
  assert.equal(playback?.trialIndex, 5, backend + ' playback does not use scored warm trial 5');
  const clipUrl = new URL(entry.clip.path, base).href;
  publishedClips.push(await hashPublicAsset(clipUrl, want.clipSha256, 1440044));
  publicWavs.push(await hashPublicAsset(entry.full.url, want.fullSha256, want.fullBytes));
}

const pageErrors = [];
const browser = await chromium.launch({ executablePath: await findChrome(), headless: false });
try {
  for (const backend of ['cpu', 'webgpu']) {
    const entry = audioEntries.find(item => item.backend === backend);
    const filename = entry.clip.path.split('/').at(-1);
    const page = await browser.newPage();
    page.on('pageerror', error => pageErrors.push(String(error)));
    const url = new URL('audio/', base);
    url.searchParams.set('sample', filename);
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.waitForFunction(name => document.querySelectorAll('#samples .audio-card[data-sample="' + name + '"]').length === 1, filename);
    const card = page.locator('#samples .audio-card[data-sample="' + filename + '"]');
    assert.equal(await card.getAttribute('data-model'), modelId);
    assert.equal(await card.getAttribute('data-backend'), backend);
    assert.match(await card.locator('.audio-meta').innerText(), /Warm audio · repetition 5 · selected timing run/);
    const player = card.locator('audio');
    assert.equal(new URL(await player.getAttribute('src'), page.url()).href, new URL(entry.clip.path, base).href);
    await player.evaluate(async audio => { audio.muted = true; await audio.play(); });
    await page.waitForFunction(name => {
      const audio = document.querySelector('#samples .audio-card[data-sample="' + name + '"] audio');
      return audio && audio.currentTime > 0.15 && audio.readyState >= 2 && !audio.paused;
    }, filename, { timeout: 15000 });
    assert.equal(await player.evaluate(audio => audio.duration), 30);
    await player.evaluate(audio => audio.pause());
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(pageErrors, [], 'public listening page raised browser errors');
console.log(JSON.stringify({
  status: 'PASS',
  site: base,
  deploymentUpdatedAt: data.updatedAt,
  model: modelId,
  selections: Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, { resultId: value.id, sourceCommit: source }])),
  publishedClips,
  publicWavs,
  playerDeepLinksAndPlayback: ['cpu warm trial 5', 'webgpu warm trial 5'],
  pageErrors,
}, null, 2));
