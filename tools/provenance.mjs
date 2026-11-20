import { execFileSync } from 'node:child_process';
import { SINGLE_REPETITION_WARM_MODEL, requiresSingleWarmRepetition } from '../lib/benchmark-policy.mjs';
import { validateModelParameterEvidence } from '../lib/model-parameters.mjs';
import { sha256 } from './results.mjs';

export const isBenchmarkSource = file => /^(bin\/|lib\/|web\/|fixtures\/|models\/|tools\/.*\.mjs$|tools\/(?:export-)?ua[-_]serhiy[^/]*\.py$|tools\/ua-serhiy-export-requirements\.txt$|tools\/linnet-webgpu-runtime\/.*\.(?:rs|toml|lock)$|package(?:-lock)?\.json$|assets\.lock\.json$)/.test(file);
export function committedManifest(commit, cwd = process.cwd()) {
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit');
  const git = (args, options = {}) => execFileSync('git', args, {
    cwd, maxBuffer: 8_000_000, stdio: ['pipe', 'pipe', 'pipe'], ...options,
  });
  let tree;
  try { tree = git(['ls-tree', '-rlz', commit]).toString('utf8'); }
  catch { throw new Error('Recorded source commit is unavailable. Fetch full Git history and publish the implementation before its result: ' + commit); }
  const files = new Map();
  for (const entry of tree.split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    const path = entry.slice(tab + 1);
    if (!isBenchmarkSource(path)) continue;
    const [, type, oid, length] = entry.slice(0, tab).split(/\s+/);
    if (type !== 'blob') throw new Error('Expected a source blob: ' + path);
    files.set(path, {oid, bytes: Number(length)});
  }
  if (!files.size) throw new Error('Recorded commit contains no benchmark source');
  const paths = [...files.keys()].sort();
  const hashes = [];
  // Batch immutable blob reads to avoid launching Git once per file. The
  // manifest still hashes each complete blob, independently, in path order.
  for (let start = 0; start < paths.length;) {
    let end = start, limit = 0;
    while (end < paths.length && limit < 4_000_000) {
      limit += files.get(paths[end++]).bytes + 100;
    }
    const batch = paths.slice(start, end);
    const input = batch.map(path => files.get(path).oid).join('\n') + '\n';
    const data = git(['cat-file', '--batch'], {input, maxBuffer:limit});
    let offset = 0;
    for (const path of batch) {
      const {oid, bytes} = files.get(path);
      const headerEnd = data.indexOf(10, offset);
      if (data.toString('ascii', offset, headerEnd) !== oid + ' blob ' + bytes) {
        throw new Error('Unexpected Git blob header: ' + path);
      }
      const body = headerEnd + 1;
      if (data[body + bytes] !== 10) throw new Error('Incomplete Git blob: ' + path);
      hashes.push(path + '\0' + sha256(data.subarray(body, body + bytes)));
      offset = body + bytes + 1;
    }
    start = end;
  }
  return sha256(hashes.join('\n'));
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
  if (result.fixture?.language && result.fixture.language !== 'en' && !result.protocol.smoke) {
    const options = {cwd, stdio:['ignore','pipe','pipe']};
    let fixture;
    try {
      const registry = JSON.parse(execFileSync('git', ['show', commit + ':fixtures/registry.json'], options));
      fixture = registry.fixtures.find(item => item.id === result.fixture.id);
    } catch {
      throw new Error('Translated article fixture was absent at the recorded scoring revision: ' + result.id);
    }
    if (fixture?.language !== result.fixture.language || fixture.sha256 !== result.fixture.sha256 ||
        fixture.characters !== result.fixture.characters || fixture.chunks !== result.fixture.chunks ||
        sha256(execFileSync('git', ['show', commit + ':fixtures/' + fixture.articleFile], options)) !== fixture.sha256) {
      throw new Error('Translated article differs from the fixture at the recorded scoring revision: ' + result.id);
    }
  }
  verifySingleWarmSource(result, cwd);
}
