// Validate and preserve compact evidence from the one-off hosted 20k diagnostic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const expectedSource = process.argv[2];
assert.match(expectedSource ?? '', /^[a-f0-9]{40}$/i, 'pass the exact 40-character source commit');
const runsRoot = resolve('runs');
const outputRoot = resolve('runs/diagnostics/sano-heart-nano-hosted');
const sampleRate = 24000;
const prefixSeconds = 30;

async function readResult(name) {
  try {
    return JSON.parse(await readFile(join(runsRoot, name, 'result.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function selectRun(scenario) {
  const names = await readdir(runsRoot);
  const matches = [];
  for (const name of names) {
    const result = await readResult(name);
    if (result?.protocol?.scenario === scenario && result?.protocol?.smoke === false &&
        result?.cells?.[0]?.model === 'sano-heart-nano' && result?.source?.gitCommit === expectedSource) {
      matches.push({ name, result });
    }
  }
  assert.equal(matches.length, 1, `expected exactly one ${scenario} receipt for source ${expectedSource}`);
  return matches[0];
}

function checkTrial(trial, label, { requireAudio = false } = {}) {
  assert.equal(trial.sampleRate, sampleRate, `${label}: sample rate`);
  assert.equal(trial.validation?.finitePcm, true, `${label}: finite PCM`);
  assert.equal(trial.validation?.chunkCount, 93, `${label}: full 93-span fixture`);
  assert.ok(Number.isFinite(trial.metrics?.firstPcmMs) && trial.metrics.firstPcmMs > 0, `${label}: first PCM timing`);
  if (requireAudio) assert.ok(trial.audio?.sha256 && Number.isSafeInteger(trial.audio?.bytes), `${label}: complete WAV metadata`);
}

function buildExactPrefix(wav, label) {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF', `${label}: RIFF`);
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE', `${label}: WAVE`);
  assert.equal(wav.toString('ascii', 12, 16), 'fmt ', `${label}: fmt chunk`);
  assert.equal(wav.readUInt16LE(20), 1, `${label}: PCM format`);
  assert.equal(wav.readUInt16LE(22), 1, `${label}: mono`);
  assert.equal(wav.readUInt32LE(24), sampleRate, `${label}: WAV sample rate`);
  assert.equal(wav.readUInt16LE(34), 16, `${label}: 16-bit samples`);
  assert.equal(wav.toString('ascii', 36, 40), 'data', `${label}: data chunk`);
  assert.equal(wav.length, 44 + wav.readUInt32LE(40), `${label}: full WAV data length`);
  const frames = Math.min(prefixSeconds * sampleRate, wav.readUInt32LE(40) / 2);
  assert.equal(frames, prefixSeconds * sampleRate, `${label}: audio is at least ${prefixSeconds} seconds`);
  const pcmBytes = frames * 2;
  const prefix = Buffer.alloc(44 + pcmBytes);
  wav.copy(prefix, 0, 0, 44 + pcmBytes);
  prefix.writeUInt32LE(36 + pcmBytes, 4);
  prefix.writeUInt32LE(pcmBytes, 40);
  return { bytes: prefix, frames, pcmSha256: createHash('sha256').update(prefix.subarray(44)).digest('hex') };
}

const warm = await selectRun('warm');
const cached = await selectRun('cached');
for (const { name, result } of [warm, cached]) {
  assert.equal(result.source.dirty, false, `${name}: source must be clean`);
  assert.equal(result.cells.length, 1, `${name}: one selected cell`);
  assert.equal(result.cells[0].status, 'measured', `${name}: measured cell`);
  assert.equal(result.cells[0].backendEffective, 'cpu/wasm', `${name}: effective backend`);
}

assert.equal(warm.result.protocol.warmupRuns, 1, 'warm protocol has exactly one excluded warm-up');
assert.equal(warm.result.protocol.repetitions, 5, 'warm protocol has five scored trials');
assert.equal(warm.result.cells[0].warmup.length, 1, 'one excluded warm-up receipt');
assert.equal(warm.result.cells[0].trials.length, 5, 'five scored warm receipts');
for (const [index, trial] of warm.result.cells[0].trials.entries()) checkTrial(trial, `warm trial ${index + 1}`, { requireAudio: index === 4 });

assert.equal(cached.result.protocol.repetitions, 1, 'cached resource protocol has one scored observation');
assert.match(cached.result.protocol.id, /cached-v1-resources$/, 'cached run sampled RSS');
assert.equal(cached.result.cells[0].trials.length, 1, 'one cached receipt');
const cachedTrial = cached.result.cells[0].trials[0];
checkTrial(cachedTrial, 'cached trial', { requireAudio: true });
assert.equal(cachedTrial.memory?.availability, 'measured', 'cached generation RSS availability');
assert.ok(Number.isFinite(cachedTrial.metrics?.generationMeanRssBytes) && cachedTrial.metrics.generationMeanRssBytes > 0,
  'cached generation-window mean RSS');
assert.ok(Number.isSafeInteger(cachedTrial.metrics?.generationRssSampleCount) && cachedTrial.metrics.generationRssSampleCount > 0,
  'cached generation-window RSS sample count');

await mkdir(outputRoot, { recursive: true });
const records = [];
for (const item of [
  { selected: warm, label: 'warm-trial-5', trial: warm.result.cells[0].trials[4] },
  { selected: cached, label: 'cached-trial-1', trial: cachedTrial },
]) {
  const wavPath = join(runsRoot, item.selected.name, 'sano-heart-nano-cpu.wav');
  const wav = await readFile(wavPath);
  const fullSha = createHash('sha256').update(wav).digest('hex');
  assert.equal(fullSha, item.trial.audio.sha256, `${item.label}: full WAV SHA-256`);
  assert.equal(wav.length, item.trial.audio.bytes, `${item.label}: full WAV byte count`);
  assert.equal(wav.readUInt32LE(40) / 2, item.trial.samples, `${item.label}: full WAV frame count`);
  const prefix = buildExactPrefix(wav, item.label);
  const prefixName = `${item.label}-first-30s.wav`;
  await writeFile(join(outputRoot, prefixName), prefix.bytes);
  await writeFile(join(outputRoot, `${item.label}-result.json`), JSON.stringify(item.selected.result, null, 2) + '\n');
  records.push({
    label: item.label,
    runId: item.selected.result.id,
    fullWavSha256: fullSha,
    fullWavBytes: wav.length,
    fullFrames: item.trial.samples,
    sampleRate,
    firstPcmMs: item.trial.metrics.firstPcmMs,
    prefixPath: prefixName,
    prefixSeconds,
    prefixFrames: prefix.frames,
    prefixPcmSha256: prefix.pcmSha256,
    prefixPcmUnchangedFromFullWav: true,
    backend: item.selected.result.cells[0].backendEffective,
  });
}

const verification = {
  schemaVersion: 1,
  kind: 'hosted-browser diagnostic only; not an M1 baseline score',
  sourceCommit: expectedSource,
  model: 'sano-heart-nano',
  fixtureId: warm.result.fixture.id,
  fixtureSha256: warm.result.fixture.sha256,
  fullWarmSchedule: { warmupRuns: 1, scoredTrials: 5 },
  cachedResourcesSchedule: { scoredTrials: 1, rssAvailability: cachedTrial.memory.availability },
  recordings: records,
};
await writeFile(join(outputRoot, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ outputRoot: 'runs/diagnostics/sano-heart-nano-hosted', ...verification }, null, 2));
