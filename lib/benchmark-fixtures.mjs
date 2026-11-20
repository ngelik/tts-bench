import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REGISTRY_PATH = new URL('../fixtures/registry.json', import.meta.url);
const registry = JSON.parse(readFileSync(fileURLToPath(REGISTRY_PATH), 'utf8'));

if (registry.schemaVersion !== 1 || !Array.isArray(registry.fixtures) || registry.fixtures.length === 0) {
  throw new Error('Invalid benchmark fixture registry.');
}

const fixtures = new Map();
const smokeIds = new Map();
for (const fixture of registry.fixtures) {
  if (!fixture || typeof fixture.id !== 'string' || typeof fixture.language !== 'string' ||
      !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(fixture.language) || fixtures.has(fixture.id) ||
      typeof fixture.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(fixture.sha256) ||
      !Number.isSafeInteger(fixture.characters) || fixture.characters < 1 ||
      !Number.isSafeInteger(fixture.unicodeCodePoints) || fixture.unicodeCodePoints < 1 ||
      !Number.isSafeInteger(fixture.utf8Bytes) || fixture.utf8Bytes < 1 ||
      !Number.isSafeInteger(fixture.chunks) || fixture.chunks < 1 ||
      !fixture.articleFile || !fixture.chunksFile || !fixture.metadataFile ||
      typeof fixture.smokeId !== 'string' || smokeIds.has(fixture.smokeId)) {
    throw new Error('Invalid or duplicate entry in benchmark fixture registry.');
  }
  fixtures.set(fixture.id, Object.freeze({ ...fixture, source: Object.freeze({ ...fixture.source }) }));
  smokeIds.set(fixture.smokeId, fixture.language);
}

if (!fixtures.has(registry.defaultFixtureId)) throw new Error('Default benchmark fixture is not registered.');
for (const [modelId, fixtureId] of Object.entries({ ...registry.modelDefaults, ...registry.modelRequiredFixtures })) {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(modelId) || !fixtures.has(fixtureId)) {
    throw new Error(`Invalid benchmark fixture default for model ${modelId}.`);
  }
}

export function fixtureLanguage(id) {
  if (typeof id !== 'string') return null;
  return fixtures.get(id)?.language ?? smokeIds.get(id) ?? null;
}

export function getBenchmarkFixture(id) {
  const fixture = fixtures.get(id);
  return fixture ? structuredClone(fixture) : null;
}

export function listBenchmarkFixtures() {
  return [...fixtures.values()].map(fixture => structuredClone(fixture));
}

export function defaultFixtureForModel(modelId) {
  return registry.modelDefaults?.[modelId] ?? registry.defaultFixtureId;
}

export function requiredFixtureForModel(modelId) {
  return registry.modelRequiredFixtures?.[modelId] ?? null;
}
