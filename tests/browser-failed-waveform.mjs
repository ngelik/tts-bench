// Run with xvfb-run -a node --test tests/browser-failed-waveform.mjs.
// Only inference is simulated. The real Audio8 adapter, Chrome, RPC bridge,
// canonical fixture, WAV encoder, benchmark CLI and result writer run together.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateResult } from '../tools/results.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const model = 'audio8-realistic-0.6b-int4';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));

function mockWorker(failArticle) {
  return `
let article = 0;
self.onmessage = ({ data }) => {
  let value;
  if (data.action === 'initialize') {
    value = { status: 'measured', voice: 'mock PCM fixture', precision: 'synthetic',
      backendEffective: 'cpu/wasm', settings: { providerPolicyVersion: 2,
        executionProviders: ['wasm'], codecExecutionProviders: ['wasm'] },
      capability: { gpuDispatchVerified: false, description: 'Synthetic test worker' } };
  } else if (data.action === 'generate') {
    if (data.chunk.id === 0) article++;
    const pcm = Float32Array.of(0.25, -0.25, 0.125, 0);
    if (article === ${failArticle} && [1, 90].includes(data.chunk.id)) pcm.fill(-0.125);
    value = { parts: [pcm], completedChunkId: data.chunk.id, sampleRate: 44100 };
  } else if (data.action === 'dispose') { value = true; }
  self.postMessage({ id: data.id, value });
};`;
}

async function exercise(t, { failArticle, stage, index, warmups, trials }) {
  const cwd = await mkdtemp(join(tmpdir(), 'audio8-failed-waveform-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const dir of ['bin', 'lib', 'web', 'tools', 'fixtures']) await cp(join(root, dir), join(cwd, dir), { recursive: true });
  await symlink(join(root, 'node_modules'), join(cwd, 'node_modules'), 'dir');
  const config = (await json(join(root, 'assets.lock.json'))).models[model];
  config.assets = config.assets.filter(a => a.id === 'audio8-realistic-provider-policy-v2');
  config.runtime.files = [];
  await writeFile(join(cwd, 'assets.lock.json'), JSON.stringify({ models: { [model]: config } }));
  await writeFile(join(cwd, 'web/workers/audio8.mjs'), mockWorker(failArticle));
  const cli = args => spawnSync(process.execPath, ['bin/bench.mjs', ...args], { cwd, encoding: 'utf8', timeout: 120_000 });
  const assets = cli(['assets', 'fetch', '--model', model, '--accept-license']);
  assert.equal(assets.status, 0, assets.stderr);
  const run = cli(['run', '--model', model, '--backend', 'cpu', '--scenario', 'warm', '--repetitions', '5',
    '--machine', 'Synthetic test fixture', '--accept-license']);
  assert.equal(run.status, 1, run.stderr + run.stdout);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.status, 'error');
  const runRoot = join(cwd, 'runs', summary.id);
  const result = await json(join(runRoot, 'result.json'));
  validateResult(result);
  const [cell] = result.cells;
  const stem = 'failed-' + stage + '-' + index;
  assert.equal(cell.status, 'error');
  assert.match(cell.reason, /Audio8 source span 2: Audio8 waveform collapsed/);
  assert.ok(cell.reason.includes(stem + '.json'));
  assert.equal(cell.warmup.length, warmups);
  assert.equal(cell.trials.length, trials);
  assert.equal((await json(join(runRoot, 'status.json'))).stage, 'error');
  for (const [kind, records] of [['warmup', cell.warmup], ['trial', cell.trials]]) {
    for (const r of records) {
      assert.equal(r.audio, undefined);
      assert.equal(r.audioWavBase64, undefined);
      assert.equal(r.validation.waveform.passed, true);
      assert.deepEqual(await json(join(runRoot, kind + '-' + r.index + '.json')), r);
    }
  }
  const names = await readdir(runRoot);
  assert.deepEqual(names.filter(f => f.endsWith('.wav')), [stem + '.wav']);
  assert.ok(!names.includes(stage + '-' + index + '.json'));
  const failure = await json(join(runRoot, stem + '.json'));
  assert.equal(failure.model, model);
  assert.equal(failure.backend, 'cpu');
  assert.equal(failure.stage, stage);
  assert.equal(failure.index, index);
  assert.equal(failure.waveform.passed, false);
  assert.deepEqual(failure.waveform.failedSpanIds, [1, 90]);
  assert.equal(failure.waveform.spans.length, 93);
  assert.equal(failure.samples, 93 * 4);
  const pcm = new Float32Array(failure.samples);
  const wav = await readFile(join(runRoot, failure.audio.file));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 44100);
  assert.equal(wav.length, 44 + failure.samples * 2);
  for (let i = 0; i < 93; i++) {
    const bad = [1, 90].includes(i);
    const samples = bad ? [-0.125, -0.125, -0.125, -0.125] : [0.25, -0.25, 0.125, 0];
    pcm.set(samples, i * 4);
    assert.deepEqual(failure.waveform.spans[i], { id: i, samples: 4,
      longestConstantSamples: bad ? 4 : 1, constantValue: bad ? -4096 : 8191 });
    for (const [j, v] of samples.entries()) {
      assert.equal(wav.readInt16LE(44 + 2 * (i * 4 + j)), Math.trunc(v * (v < 0 ? 32768 : 32767)));
    }
  }
  assert.equal(failure.pcmSha256, hash(Buffer.from(pcm.buffer)));
  assert.deepEqual(failure.audio, { file: stem + '.wav', bytes: wav.length, sha256: hash(wav) });
  assert.ok(failure.generationMs > 0);
}

test('warm-up waveform rejection saves the complete actual WAV with no scored article', t =>
  exercise(t, { failArticle: 1, stage: 'warmup', index: 1, warmups: 0, trials: 0 }));
test('second scored waveform rejection preserves the preceding good checkpoints', t =>
  exercise(t, { failArticle: 3, stage: 'trial', index: 2, warmups: 1, trials: 1 }));
