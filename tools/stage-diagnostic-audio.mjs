import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { makeClip, wavInfo } from './audio.mjs';
import { readResult } from './results.mjs';
import { parseStageDiagnosticArgs } from '../lib/diagnostic-audio-cli.mjs';
import { verifyDiagnosticClip } from './diagnostic-audio.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const options = parseStageDiagnosticArgs(process.argv.slice(2));
const receipt = await readResult(resolve(options.receipt));
if (receipt.origin !== 'native' || receipt.source?.dirty !== false || receipt.protocol?.smoke !== true) {
  throw new Error('Diagnostic clip source must be a clean native three-span smoke receipt');
}
const cell = receipt.cells?.find(item => item.model === options.model && item.backendRequested === options.backend);
const trial = cell?.trials?.find(item => item.index === Number(options.trial));
if (cell?.status !== 'measured' || trial?.validation?.chunkCount !== 3 || trial.validation.finitePcm !== true ||
    trial.validation.nonemptyChunks !== true || !trial.audio?.sha256 || !Number.isSafeInteger(trial.audio?.bytes)) {
  throw new Error('Smoke receipt must contain the selected measured three-span trial and its source WAV pin');
}
const wav = await readFile(resolve(options.wav));
if (wav.length !== trial.audio.bytes || sha256(wav) !== trial.audio.sha256) throw new Error('Source WAV differs from the smoke trial receipt');
const sourceInfo = wavInfo(wav);
if (sourceInfo.samples !== trial.samples || sourceInfo.sampleRate !== trial.sampleRate) throw new Error('Source WAV frame count or sample rate differs from the smoke trial');
const clip = makeClip(wav);
const rawClipInfo = wavInfo(clip);
const clipInfo = verifyDiagnosticClip(clip, {
  path: options.output, sha256: sha256(clip), bytes: clip.length,
  startSample: 0, ...rawClipInfo,
}, trial, options.id);
const target = resolve(options.output);
await mkdir(dirname(target), { recursive: true });
await writeFile(target, clip, { flag: 'wx' });
console.log(JSON.stringify({
  id: options.id, path: options.output, sha256: sha256(clip), bytes: clip.length,
  startSample: 0, sampleRate: clipInfo.sampleRate, samples: clipInfo.samples,
  seconds: clipInfo.seconds, sourceWavSha256: trial.audio.sha256, sourceWavBytes: trial.audio.bytes,
  sourceCommit: receipt.source.gitCommit, fixtureId: receipt.fixture.id, fixtureSha256: receipt.fixture.sha256,
}, null, 2));
