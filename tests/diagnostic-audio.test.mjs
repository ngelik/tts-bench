import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseStageDiagnosticArgs } from '../lib/diagnostic-audio-cli.mjs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDiagnosticAudio, matchesDiagnosticFailureSpan, sourceFixture, verifyDiagnosticClip, verifyDiagnosticResult } from '../tools/diagnostic-audio.mjs';
import { wavInfo } from '../tools/audio.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function pcmWav(sampleRate, samples) {
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}

test('diagnostic audio verifies every registered clip and empty manifest fixtures stay empty', async () => {
  const manifest = JSON.parse(await readFile('audio/diagnostics.json', 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.entries));
  const verified = await loadDiagnosticAudio();
  assert.equal(verified.length, manifest.entries.length);
  assert.deepEqual(verified.map(entry => entry.id), manifest.entries.map(entry => entry.id));

  const emptyRoot = await mkdtemp(join(tmpdir(), 'tts-bench-empty-diagnostic-manifest-'));
  try {
    await writeFile(join(emptyRoot, 'diagnostics.json'), JSON.stringify({ schemaVersion: 1, entries: [] }));
    assert.deepEqual(await loadDiagnosticAudio({ root: emptyRoot, manifestPath: 'diagnostics.json' }), []);
  } finally {
    await rm(emptyRoot, { recursive: true, force: true });
  }
});

test('diagnostic receipt pairing requires clean identical source and fixture identity', () => {
  const entry = {
    sourceCommit: 'a'.repeat(40), fixtureId: 'nl-article-v1',
    fixtureSha256: 'b'.repeat(64), language: 'nl', model: 'tiny-voca-nl',
    backend: 'cpu', voice: 'Alex',
    smoke: { fixtureId: 'nl-article-smoke-v1', fixtureSha256: 'c'.repeat(64) },
  };
  const receipt = smoke => ({
    origin: 'native',
    source: { dirty: false, gitCommit: entry.sourceCommit },
    protocol: { smoke },
    fixture: { id: smoke ? entry.smoke.fixtureId : entry.fixtureId, sha256: smoke ? entry.smoke.fixtureSha256 : entry.fixtureSha256, language: entry.language, chunks: smoke ? 3 : 101 },
    cells: [{ model: entry.model, backendRequested: entry.backend, voice: entry.voice }],
  });
  assert.equal(verifyDiagnosticResult(receipt(true), entry, 'smoke').voice, 'Alex');
  assert.equal(verifyDiagnosticResult(receipt(false), entry, 'full-attempt').voice, 'Alex');
  assert.throws(() => verifyDiagnosticResult({ ...receipt(false), source: { ...receipt(false).source, dirty: true } }, entry, 'full-attempt'), /source\/fixture identity/);
  assert.throws(() => verifyDiagnosticResult(receipt(false), entry, 'smoke'), /source\/fixture identity/);
});

test('smoke identity comes from the first three registered source spans and failure IDs match exactly', () => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const source = sourceFixture(process.cwd(), commit, 'nl-article-v1');
  assert.equal(source.fixture.sha256, 'afbadecd4e0b7db057056fb8f6bb220f51a281a7cd956b9ead633590ea4389d8');
  assert.equal(source.fixture.chunks, 101);
  assert.equal(source.smoke.fixtureId, 'nl-article-smoke-v1');
  assert.match(source.smoke.fixtureSha256, /^[a-f0-9]{64}$/);
  assert.equal(matchesDiagnosticFailureSpan('Dutch source span 31 failed', 31), true);
  assert.equal(matchesDiagnosticFailureSpan('Dutch source span 310 failed', 31), false);
});

test('diagnostic clip staging requires the original smoke WAV through --wav', () => {
  const options = parseStageDiagnosticArgs([
    '--id', 'tiny-voca-nl-opening', '--receipt', 'diagnostics/tiny-voca-nl-opening/smoke.json',
    '--wav', '/tmp/original-smoke.wav', '--model', 'tiny-voca-nl', '--backend', 'cpu', '--trial', '1',
    '--output', 'diagnostics/audio/tiny-voca-nl-opening.wav',
  ]);
  assert.equal(options.wav, '/tmp/original-smoke.wav');
  assert.throws(() => parseStageDiagnosticArgs([
    '--id', 'tiny-voca-nl-opening', '--receipt', 'diagnostics/tiny-voca-nl-opening/smoke.json',
    '--model', 'tiny-voca-nl', '--backend', 'cpu', '--trial', '1',
    '--output', 'diagnostics/audio/tiny-voca-nl-opening.wav',
  ]), /--wav FULL_SMOKE\.wav/);
  assert.throws(() => parseStageDiagnosticArgs([
    '--id', 'tiny-voca-nl-opening', '--wav', '/tmp/original-smoke.wav', '--model', 'tiny-voca-nl',
    '--backend', 'cpu', '--trial', '1', '--output', 'diagnostics/audio/tiny-voca-nl-opening.wav',
  ]), /Usage:/, 'A smoke receipt is required');
  assert.throws(() => parseStageDiagnosticArgs([
    '--id', 'tiny-voca-nl-opening', '--receipt', 'diagnostics/another-id/smoke.json',
    '--wav', '/tmp/original-smoke.wav', '--model', 'tiny-voca-nl', '--backend', 'cpu', '--trial', '1',
    '--output', 'diagnostics/audio/tiny-voca-nl-opening.wav',
  ]), /Usage:/, 'The smoke receipt path is bound to the diagnostic ID');
  assert.throws(() => parseStageDiagnosticArgs([
    '--id', 'tiny-voca-nl-opening', '--receipt', 'diagnostics/tiny-voca-nl-opening/smoke.json',
    '--wav', '/tmp/original-smoke.wav', '--model', 'tiny-voca-nl', '--backend', 'cpu', '--trial', '1',
    '--output', 'diagnostics/audio/another-id.wav',
  ]), /Usage:/, 'The output basename is bound to the diagnostic ID');
});

test('diagnostic validator and staging share exact 30-second PCM and frame/rate checks', () => {
  const diagnosticId = 'tiny-voca-nl-opening';
  const path = `diagnostics/audio/${diagnosticId}.wav`;
  const samples = 8000 * 30;
  const bytes = pcmWav(8000, samples);
  const wav = wavInfo(bytes);
  const trial = { sampleRate: 8000, samples };
  const clip = { path, sha256: sha256(bytes), bytes: bytes.length, startSample: 0, ...wav };
  assert.deepEqual(verifyDiagnosticClip(bytes, clip, trial, diagnosticId), wav);

  const shortBytes = pcmWav(8000, samples - 1);
  assert.throws(() => verifyDiagnosticClip(shortBytes, {
    path, sha256: sha256(shortBytes), bytes: shortBytes.length, startSample: 0, ...wavInfo(shortBytes),
  }, { sampleRate: 8000, samples: samples - 1 }, diagnosticId), /at least 30 seconds/);
  assert.throws(() => verifyDiagnosticClip(bytes, { ...clip, path: 'diagnostics/audio/other-id.wav' }, trial, diagnosticId), /bound to its ID/);
  for (const [field, value] of [
    ['sampleRate', 16000], ['samples', samples - 1], ['seconds', 29.999875], ['startSample', 1],
    ['bytes', bytes.length + 2], ['sha256', 'f'.repeat(64)],
  ]) {
    assert.throws(() => verifyDiagnosticClip(bytes, { ...clip, [field]: value }, trial, diagnosticId), /exact 30-second PCM/,
      `A mismatched ${field} pin is rejected`);
  }
});
