import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { basename, dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getAssetLock, getModel } from '../lib/catalog.mjs';
import { committedManifest, verifySource } from './provenance.mjs';
import { readResult } from './results.mjs';
import { MAX_CLIP_BYTES, verifyAudioAttribution, wavInfo } from './audio.mjs';
import { diagnosticClipPath, diagnosticSmokeReceiptPath } from '../lib/diagnostic-audio-cli.mjs';

const sha256 = data => createHash('sha256').update(data).digest('hex');
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[a-z0-9][a-z0-9.-]{0,119}$/.test(value);
const safeRelativePath = value => typeof value === 'string' &&
  !value.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'));
const receiptPath = value => safeRelativePath(value) &&
  (value.startsWith('diagnostics/') || /^results\/[a-z0-9][a-z0-9._-]{0,239}\/result\.json$/.test(value));

async function checkedPath(root, path) {
  if (!safeRelativePath(path)) throw new Error(`Invalid diagnostic audio path: ${path}`);
  const absolute = resolve(root, path);
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(absolute)]);
  if (!realTarget.startsWith(realRoot + sep)) throw new Error(`Diagnostic audio path escapes checkout: ${path}`);
  return realTarget;
}

async function readPinnedJson(root, value, label) {
  if (!receiptPath(value?.path) || !hash(value.sha256)) throw new Error(`Invalid ${label} receipt pin`);
  const bytes = await readFile(await checkedPath(root, value.path));
  if (sha256(bytes) !== value.sha256) throw new Error(`${label} receipt digest mismatch`);
  return readResult(await checkedPath(root, value.path));
}

export function sourceFixture(root, commit, fixtureId) {
  const read = path => execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, maxBuffer: 16_000_000 });
  const registry = JSON.parse(read('fixtures/registry.json').toString('utf8'));
  const fixture = registry.fixtures.find(row => row.id === fixtureId);
  if (!fixture) throw new Error(`Diagnostic source commit does not register fixture ${fixtureId}`);
  const article = read(`fixtures/${fixture.articleFile}`).toString('utf8');
  const chunkManifest = JSON.parse(read(`fixtures/${fixture.chunksFile}`).toString('utf8'));
  if (sha256(Buffer.from(article, 'utf8')) !== fixture.sha256 ||
      chunkManifest.articleSha256 !== fixture.sha256 || chunkManifest.chunks.length !== fixture.chunks) {
    throw new Error(`Diagnostic full fixture bytes differ at source commit: ${fixtureId}`);
  }
  const firstThree = chunkManifest.chunks.slice(0, 3);
  let offset = 0;
  for (const [index, span] of firstThree.entries()) {
    const text = article.slice(span.start, span.end);
    if (span.id !== index || span.start !== offset || span.end <= span.start || sha256(Buffer.from(text, 'utf8')) !== span.sha256) {
      throw new Error(`Diagnostic opening span ${index} differs from its source chunk digest: ${fixtureId}`);
    }
    offset = span.end;
  }
  if (firstThree.length !== 3) {
    throw new Error(`Diagnostic source fixture lacks three ordered opening spans: ${fixtureId}`);
  }
  const smokeText = firstThree.map(span => article.slice(span.start, span.end)).join('');
  const smokeHash = sha256(Buffer.from(smokeText, 'utf8'));
  return { fixture, smoke: { fixtureId: fixture.smokeId, fixtureSha256: smokeHash } };
}

export function matchesDiagnosticFailureSpan(reason, spanId) {
  return new RegExp(`source span ${spanId}(?!\\d)`).test(String(reason ?? ''));
}

export function verifyDiagnosticResult(result, entry, role) {
  if (!['smoke', 'full-attempt'].includes(role)) throw new Error(`Invalid diagnostic result role: ${role}`);
  const expectedFixture = role === 'smoke' ? entry.smoke : entry;
  if (result.origin !== 'native' || result.source?.dirty !== false ||
      result.source?.gitCommit !== entry.sourceCommit || result.protocol?.smoke !== (role === 'smoke') ||
      result.fixture?.id !== expectedFixture.fixtureId || result.fixture?.sha256 !== expectedFixture.fixtureSha256 ||
      result.fixture?.language !== entry.language) {
    throw new Error(`${role} receipt does not match the diagnostic source/fixture identity`);
  }
  const cell = result.cells?.find(item => item.model === entry.model && item.backendRequested === entry.backend);
  if (!cell || cell.voice !== entry.voice) throw new Error(`${role} receipt model, backend or voice differs`);
  return cell;
}

export function verifyDiagnosticClip(bytes, clip, trial, diagnosticId) {
  if (clip?.path !== diagnosticClipPath(diagnosticId)) {
    throw new Error(`Diagnostic clip path must be bound to its ID: ${diagnosticId}`);
  }
  if (!Number.isSafeInteger(trial?.sampleRate) || trial.sampleRate < 8000 || trial.sampleRate > 48000 ||
      !Number.isSafeInteger(trial?.samples) || trial.samples < trial.sampleRate * 30) {
    throw new Error(`Diagnostic smoke trial must contain at least 30 seconds of PCM: ${diagnosticId}`);
  }
  const wav = wavInfo(bytes);
  const expectedSamples = trial.sampleRate * 30;
  if (bytes.length > MAX_CLIP_BYTES || bytes.length !== clip.bytes || sha256(bytes) !== clip.sha256 ||
      clip.startSample !== 0 || wav.sampleRate !== trial.sampleRate || wav.samples !== expectedSamples ||
      clip.sampleRate !== wav.sampleRate || clip.samples !== wav.samples || clip.seconds !== wav.seconds ||
      clip.seconds !== 30) {
    throw new Error(`Diagnostic clip must be an exact 30-second PCM prefix matching its recorded frame/rate fields: ${diagnosticId}`);
  }
  return wav;
}

export async function loadDiagnosticAudio({ root = process.cwd(), manifestPath = 'audio/diagnostics.json' } = {}) {
  const manifest = JSON.parse(await readFile(resolve(root, manifestPath), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new Error('Invalid diagnostic audio manifest');
  const lock = getAssetLock();
  const seen = new Set();
  const sources = new Map();
  const checked = [];
  for (const entry of manifest.entries) {
    if (!id(entry.id) || seen.has(entry.id)) throw new Error('Invalid or duplicate diagnostic audio ID');
    seen.add(entry.id);
    if (!lock.models[entry.model] || !['cpu', 'webgpu'].includes(entry.backend) ||
        !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(entry.language) ||
        !/^[a-f0-9]{40}$/.test(entry.sourceCommit) || !hash(entry.fixtureSha256) ||
        !id(entry.fixtureId) || !Number.isSafeInteger(entry.firstFailureSpanId) || entry.firstFailureSpanId < 0 ||
        !Array.isArray(entry.sourceUrls) || !entry.sourceUrls.length ||
        typeof entry.voice !== 'string' || !entry.voice.trim() ||
        typeof entry.attribution !== 'string' || !entry.attribution.trim() ||
        typeof entry.modelTerms !== 'string' || !entry.modelTerms.trim()) {
      throw new Error(`Invalid diagnostic audio metadata: ${entry.id}`);
    }
    if (!entry.smoke || entry.smoke.trialIndex !== 1 ||
        !id(entry.smoke.fixtureId) || !hash(entry.smoke.fixtureSha256) ||
        JSON.stringify(entry.smoke.spanIds) !== '[0,1,2]' ||
        !entry.fullAttempt || !entry.clip ||
        entry.clip.path !== diagnosticClipPath(entry.id) ||
        !hash(entry.clip.sha256) || !Number.isSafeInteger(entry.clip.bytes) || entry.clip.bytes > MAX_CLIP_BYTES ||
        !Number.isSafeInteger(entry.clip.sampleRate) || !Number.isSafeInteger(entry.clip.samples) ||
        entry.clip.startSample !== 0 || !Number.isFinite(entry.clip.seconds)) {
      throw new Error(`Diagnostic audio must bind an opening three-span trial and PCM clip: ${entry.id}`);
    }
    if (entry.smoke.receipt?.path !== diagnosticSmokeReceiptPath(entry.id) ||
        !/^results\/[a-z0-9][a-z0-9._-]{0,239}\/result\.json$/.test(entry.fullAttempt.receipt?.path ?? '')) {
      throw new Error(`Diagnostic audio must preserve its smoke receipt and link the original full result: ${entry.id}`);
    }
    const source = sourceFixture(root, entry.sourceCommit, entry.fixtureId);
    if (source.fixture.sha256 !== entry.fixtureSha256 || source.fixture.language !== entry.language ||
        source.fixture.chunks <= 3 || source.smoke.fixtureId !== entry.smoke.fixtureId ||
        source.smoke.fixtureSha256 !== entry.smoke.fixtureSha256) {
      throw new Error(`Diagnostic fixture does not match its registered source spans: ${entry.id}`);
    }
    const smoke = await readPinnedJson(root, entry.smoke.receipt, 'Smoke');
    const full = await readPinnedJson(root, entry.fullAttempt.receipt, 'Full-attempt');
    const smokeCell = verifyDiagnosticResult(smoke, entry, 'smoke');
    const fullCell = verifyDiagnosticResult(full, entry, 'full-attempt');
    if (full.id !== basename(dirname(entry.fullAttempt.receipt.path)) ||
        smokeCell.status !== 'measured' || fullCell.status === 'measured' ||
        smoke.fixture.chunks !== 3 || full.fixture.chunks !== source.fixture.chunks ||
        smokeCell.backendEffective !== 'cpu/wasm' || fullCell.backendEffective !== 'cpu/wasm' ||
        smokeCell.backendEffective !== fullCell.backendEffective ||
        JSON.stringify(smokeCell.settings) !== JSON.stringify(fullCell.settings) ||
        !matchesDiagnosticFailureSpan(fullCell.reason, entry.firstFailureSpanId)) {
      throw new Error(`Diagnostic must link a three-span smoke and a failed same-source full attempt: ${entry.id}`);
    }
    const trial = smokeCell.trials?.find(item => item.index === entry.smoke.trialIndex);
    if (!trial || trial.validation?.chunkCount !== 3 || trial.validation?.finitePcm !== true ||
        trial.validation?.nonemptyChunks !== true || trial.samples < 1 || !hash(trial.audio?.sha256) ||
        !Number.isSafeInteger(trial.audio?.bytes) || trial.samples < 1 || trial.sampleRate < 8000 || trial.sampleRate > 48000) {
      throw new Error(`Diagnostic smoke trial is incomplete: ${entry.id}`);
    }
    if (entry.sourceCommit !== smoke.source.gitCommit || entry.sourceCommit !== full.source.gitCommit ||
        entry.smoke.sourceWavSha256 !== trial.audio.sha256 || entry.smoke.sourceWavBytes !== trial.audio.bytes) {
      throw new Error(`Diagnostic smoke/full source lineage differs: ${entry.id}`);
    }
    const sourceHash = sources.get(entry.sourceCommit) ?? committedManifest(entry.sourceCommit, root);
    sources.set(entry.sourceCommit, sourceHash);
    for (const result of [smoke, full]) {
      verifySource(result, root, sources);
      execFileSync('git', ['merge-base', '--is-ancestor', entry.sourceCommit, 'HEAD'], { cwd: root, stdio: 'ignore' });
    }
    const model = getModel(entry.model);
    if (entry.modelTerms !== model.license.model || JSON.stringify(entry.sourceUrls) !== JSON.stringify(model.support.sources)) {
      throw new Error(`Diagnostic attribution sources differ from the registered model: ${entry.id}`);
    }
    verifyAudioAttribution(entry);
    const clipBytes = await readFile(await checkedPath(root, entry.clip.path));
    verifyDiagnosticClip(clipBytes, entry.clip, trial, entry.id);
    const smokeReceiptUrl = `https://github.com/ngelik/tts-bench/blob/main/${entry.smoke.receipt.path}`;
    const fullAttemptReceiptUrl = `https://github.com/ngelik/tts-bench/blob/main/${entry.fullAttempt.receipt.path}`;
    checked.push({
      id: entry.id, model: entry.model, backend: entry.backend, language: entry.language,
      voice: entry.voice, attribution: entry.attribution, modelTerms: entry.modelTerms,
      sourceUrls: entry.sourceUrls, scenario: 'diagnostic', trialIndex: trial.index,
      diagnosticOnly: true, diagnosticStatus: `30-second prefix of the three-span smoke; full article failed at span ${entry.firstFailureSpanId}. Excluded from scores and rankings.`,
      resultId: smoke.id, reportUrl: fullAttemptReceiptUrl,
      smokeReceiptPath: entry.smoke.receipt.path,
      fullAttemptReceiptPath: entry.fullAttempt.receipt.path,
      smokeReceiptUrl, fullAttemptReceiptUrl,
      clip: { ...entry.clip }, full: null,
    });
  }
  return checked;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action] = process.argv.slice(2);
  if (action !== 'check') throw new Error('Use: node tools/diagnostic-audio.mjs check');
  const entries = await loadDiagnosticAudio();
  console.log(`PASS diagnostic audio: ${entries.length} verified recording${entries.length === 1 ? '' : 's'}`);
}
