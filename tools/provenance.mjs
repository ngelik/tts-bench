import { execFileSync } from 'node:child_process';
import { SINGLE_REPETITION_WARM_MODEL, requiresSingleWarmRepetition } from '../lib/benchmark-policy.mjs';
import { validateModelParameterEvidence } from '../lib/model-parameters.mjs';
import { sha256 } from './results.mjs';

export const isBenchmarkSource = file => /^(bin\/|lib\/|web\/|fixtures\/|models\/|tools\/.*\.mjs$|package(?:-lock)?\.json$|assets\.lock\.json$)/.test(file);
export function committedManifest(commit, cwd = process.cwd()) {
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit');
  const git = args => execFileSync('git', args, { cwd, stdio: ['ignore','pipe','pipe'], maxBuffer: 8000000 });
  let files;
  try { files = git(['ls-tree','-rz','--name-only',commit]).toString('utf8').split('\0').filter(isBenchmarkSource).sort(); }
  catch { throw new Error('Recorded source commit is unavailable. Fetch full Git history and publish the implementation before its result: ' + commit); }
  if (!files.length) throw new Error('Recorded commit contains no benchmark source');
  return sha256(files.map(file => `${file}\0${sha256(git(['show',`${commit}:${file}`]))}`).join('\n'));
}
// Older CosyVoice3 runs predate the parameter catalog. For every other
// one-article warm score, use plain data from the actual scoring revision.
function verifySingleWarmSource(result, cwd) {
  if (result.protocol.smoke || result.protocol.scenario !== 'warm' || result.protocol.repetitions !== 1) return;
  const models = new Set(result.cells.map(cell => cell.model));
  models.delete(SINGLE_REPETITION_WARM_MODEL);
  if (!models.size) return;
  const commit = result.source.gitCommit;
  const readGitJson = file => JSON.parse(execFileSync('git', ['show', `${commit}:${file}`], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8_000_000,
  }));
  let parameters, registrations;
  try {
    parameters = readGitJson('lib/model-parameters.json');
    registrations = readGitJson('assets.lock.json').models;
  } catch {
    throw new Error('The recorded scoring revision lacks readable model parameter evidence for one warm repetition: ' + result.id);
  }
  for (const id of models) {
    if (!parameters || !Object.hasOwn(parameters, id) ||
        !requiresSingleWarmRepetition(validateModelParameterEvidence(parameters[id]).parameterCount)) {
      throw new Error('The recorded scoring revision does not establish more than one billion parameters for ' + id);
    }
    const weights = registrations?.[id]?.assets?.filter(asset => asset.kind === 'model-weights');
    if (!weights?.length || !weights.every(weight => result.assets.some(asset =>
      asset.id === weight.id && asset.bytes === weight.bytes && asset.sha256 === weight.sha256))) {
      throw new Error('One-repetition warm receipt differs from the model weights at its scoring revision: ' + id);
    }
  }
}

export function verifySource(result, cwd = process.cwd(), cache = new Map()) {
  if (result.origin !== 'native') return;
  const commit = result.source.gitCommit;
  let hash = cache.get(commit);
  if (!hash) { hash = committedManifest(commit, cwd); cache.set(commit, hash); }
  if (hash !== result.source.manifestSha256) throw new Error('Source fingerprint does not match its recorded Git commit: ' + result.id);
  verifySingleWarmSource(result, cwd);
}
