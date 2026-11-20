import { runtimeReceiptId } from '../lib/assets.mjs';

export const ENVIRONMENT_COHORT_FIELDS = ['machineLabel', 'os', 'arch', 'cpu', 'logicalCores', 'ramBytes', 'chromeVersion', 'headless'];
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
export const stable = value => JSON.stringify(canonical(value));

export const environmentKey = result => stable(ENVIRONMENT_COHORT_FIELDS.map(key => result.environment[key]));

// Some upstream archives register their model card and checksums as model-support.
function inferenceAsset(asset) {
  if (['license', 'model-terms', 'provenance'].includes(asset.kind) || asset.target?.startsWith('licenses/')) return false;
  if (asset.kind !== 'model-support') return true;
  const name = asset.target?.split('/').at(-1) ?? '';
  return !/^(?:.*-)?README(?:\.md)?$|^(?:SHA256SUMS|PROVENANCE\.JSON)$/i.test(name);
}

function appliesToBackend(id, asset, backend) {
  if (asset.backends === undefined) return true;
  if (!Array.isArray(asset.backends) || !asset.backends.length ||
      new Set(asset.backends).size !== asset.backends.length ||
      asset.backends.some(value => !['cpu', 'webgpu'].includes(value))) {
    throw new Error(`Invalid backend scope for ${id} asset ${asset.id}`);
  }
  return backend === null || asset.backends.includes(backend);
}

function requiredAssets(id, model, backend = null) {
  if (!model) return [];
  if (backend !== null && !['cpu', 'webgpu'].includes(backend)) throw new Error(`Invalid backend asset scope: ${backend}`);
  const allAssets = model.assets ?? [];
  const allRuntime = model.runtime?.files ?? [];
  for (const asset of [...allAssets, ...allRuntime]) appliesToBackend(id, asset, null);
  const runtime = allRuntime.filter(asset => inferenceAsset(asset) && appliesToBackend(id, asset, backend));
  return [
    ...allAssets.filter(asset => inferenceAsset(asset) && appliesToBackend(id, asset, backend)),
    ...runtime.map(asset => ({
      ...asset,
      id: runtimeReceiptId({ ...model, id }, asset),
      // Earlier native bundles preceded package-qualified receipt IDs. A
      // unique runtime path plus the same byte count and digest is unambiguous.
      legacyId: runtime.filter(file => file.path === asset.path).length === 1
        ? `runtime:${id}:${asset.path}` : null,
    })),
  ];
}

// Campaigns name a model at a source commit. A later registration may reuse its ID.
export function sameCampaignRegistration(id, current, planned, backend = null) {
  if (!current || !planned || current.modelRevision !== planned.modelRevision) return false;
  const signature = model => requiredAssets(id, model, backend)
    .map(({ id, bytes, sha256 }) => [id, bytes, sha256])
    .sort(([a], [b]) => a.localeCompare(b));
  return stable(signature(current)) === stable(signature(planned));
}

const lookup = (assets, expected) => assets.get(expected.id) ?? assets.get(expected.legacyId);
const sameBytes = (expected, actual) => actual?.sha256 === expected.sha256 && actual?.bytes === expected.bytes;

// Keep recency and error selection in their original views. First narrow each
// displayed model/backend/scenario to receipts proving the registered inputs,
// when at least one such receipt exists in that view's environment scope.
export function preferredAttempts(results, models, accept, { perEnvironment = false } = {}) {
  const currentGroups = new Set();
  const attempts = [];
  for (const result of results.filter(accept)) {
    const assets = new Map(result.assets.map(asset => [asset.id, asset]));
    for (const cell of result.cells) {
      const required = requiredAssets(cell.model, models[cell.model], cell.backendRequested);
      const current = result.origin === 'native' && required.length > 0 &&
        required.every(asset => sameBytes(asset, lookup(assets, asset)));
      const group = JSON.stringify([cell.model, cell.backendRequested, result.protocol.scenario,
        perEnvironment ? environmentKey(result) : null]);
      if (current) currentGroups.add(group);
      attempts.push({ result, cell, group, current });
    }
  }
  return attempts.filter(attempt => attempt.current || !currentGroups.has(attempt.group));
}

function sameSettings(a, b) {
  const { executionProviders: ignoredA, ...settingsA } = a.settings;
  const { executionProviders: ignoredB, ...settingsB } = b.settings;
  return a.voice === b.voice && a.precision === b.precision && stable(settingsA) === stable(settingsB);
}

export function pairedWarm(cpu, webgpu, model) {
  if (!cpu || !webgpu) return false;
  const a = cpu.result, b = webgpu.result;
  const ac = cpu.cell, bc = webgpu.cell;
  if (a.origin !== 'native' || b.origin !== 'native' || ac.status !== 'measured' || bc.status !== 'measured') return false;
  if (!Array.isArray(ac.trials) || !Array.isArray(bc.trials) || ac.trials.length !== bc.trials.length ||
      ac.trials.length !== a.protocol.repetitions || bc.trials.length !== b.protocol.repetitions) return false;
  if (stable(a.protocol) !== stable(b.protocol) || stable(a.fixture) !== stable(b.fixture)) return false;
  if (a.source.manifestSha256 !== b.source.manifestSha256) return false;
  if (environmentKey(a) !== environmentKey(b)) return false;
  const gpuNames = new Set([a.environment.gpu, b.environment.gpu].filter(Boolean));
  if (gpuNames.size > 1) return false;
  const required = requiredAssets(ac.model, model);
  if (!required.length) return false;
  const left = new Map(a.assets.map(asset => [asset.id, asset]));
  const right = new Map(b.assets.map(asset => [asset.id, asset]));
  if (!required.every(asset => lookup(left, asset) && sameBytes(lookup(left, asset), lookup(right, asset)))) return false;
  return sameSettings(ac, bc);
}
