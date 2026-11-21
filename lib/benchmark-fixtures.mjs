import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = new URL('../fixtures/registry.json', import.meta.url);
const registry = JSON.parse(readFileSync(fileURLToPath(REGISTRY_PATH), 'utf8'));
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function canonicalLanguageTag(value) {
  if (typeof value !== 'string' || value.length > 64 || !LANGUAGE_PATTERN.test(value)) return null;
  try { return Intl.getCanonicalLocales(value)[0] ?? null; }
  catch { return null; }
}

function validModelId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9.-]*$/.test(value);
}

function normalizeProfileMap(value, label = 'modelFrontendLanguages') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${label} map in benchmark fixture registry.`);
  }
  const output = new Map();
  for (const [modelId, languages] of Object.entries(value)) {
    if (!validModelId(modelId) || !Array.isArray(languages) || languages.length === 0) {
      throw new Error(`Invalid frontend language profile for ${modelId}.`);
    }
    const canonical = languages.map(canonicalLanguageTag);
    if (canonical.some(language => language === null) || new Set(canonical).size !== canonical.length) {
      throw new Error(`Invalid or duplicate BCP-47 tag in frontend language profile for ${modelId}.`);
    }
    output.set(modelId, Object.freeze(canonical));
  }
  return output;
}

if (registry.schemaVersion !== 1 || !Array.isArray(registry.fixtures) || registry.fixtures.length === 0) {
  throw new Error('Invalid benchmark fixture registry.');
}

const fixtures = new Map();
const smokeIds = new Map();
for (const fixture of registry.fixtures) {
  const canonicalFixtureLanguage = canonicalLanguageTag(fixture?.language);
  if (!fixture || typeof fixture.id !== 'string' || !canonicalFixtureLanguage || canonicalFixtureLanguage !== fixture.language || fixtures.has(fixture.id) ||
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
  if (!validModelId(modelId) || !fixtures.has(fixtureId)) {
    throw new Error(`Invalid benchmark fixture default for model ${modelId}.`);
  }
}

const currentProfiles = normalizeProfileMap(registry.modelFrontendLanguages ?? {});
const sourceProfileCache = new Map();
const SOURCE_REGISTRY_UNAVAILABLE = Object.freeze({ unavailable: true });
const DEFAULT_FRONTEND_LANGUAGES = Object.freeze(['en']);

function profileLanguages(profiles, modelId) {
  return [...(profiles.get(modelId) ?? DEFAULT_FRONTEND_LANGUAGES)];
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

/** Exact BCP-47 tags the registered browser frontend can accept; legacy profiles stay English-only. */
export function frontendLanguagesForModel(modelId) {
  return profileLanguages(currentProfiles, modelId);
}

/**
 * Get the language profile that existed in a scoring source. null means that source predates
 * this policy field, so archived results must be judged by their own recorded language evidence.
 */
export function frontendLanguagesForModelAtSource(modelId, sourceCommit, { strict = false } = {}) {
  if (typeof sourceCommit !== 'string' || !/^[a-f0-9]{40,64}$/.test(sourceCommit)) {
    return strict ? frontendLanguagesForModel(modelId) : null;
  }
  if (!sourceProfileCache.has(sourceCommit)) {
    let parsed = null;
    try {
      const raw = execFileSync('git', ['show', `${sourceCommit}:fixtures/registry.json`], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 2_000_000,
      });
      parsed = JSON.parse(raw);
    } catch {
      if (strict) throw new Error(`Cannot inspect fixture language profile at scoring source ${sourceCommit}.`);
    }
    const result = parsed === null ? SOURCE_REGISTRY_UNAVAILABLE : parsed && Object.hasOwn(parsed, 'modelFrontendLanguages')
        ? normalizeProfileMap(parsed.modelFrontendLanguages, `modelFrontendLanguages at ${sourceCommit}`)
        : null;
    sourceProfileCache.set(sourceCommit, result);
  }
  const sourceProfiles = sourceProfileCache.get(sourceCommit);
  if (sourceProfiles === SOURCE_REGISTRY_UNAVAILABLE) {
    if (strict) throw new Error(`Cannot inspect fixture language profile at scoring source ${sourceCommit}.`);
    return null;
  }
  return sourceProfiles === null ? null : profileLanguages(sourceProfiles, modelId);
}

/** Fail before synthesis when the selected fixture language is absent from this exact frontend profile. */
export function assertFixtureLanguageForModel(modelId, fixtureOrId, { frontendLanguages } = {}) {
  const fixture = typeof fixtureOrId === 'string' ? getBenchmarkFixture(fixtureOrId) : fixtureOrId;
  if (!fixture || typeof fixture.language !== 'string') throw new Error('Unknown or invalid benchmark fixture.');
  const requested = canonicalLanguageTag(fixture.language);
  if (!requested) throw new Error(`Fixture ${fixture.id ?? '(unknown)'} has an invalid BCP-47 language tag.`);
  const allowed = frontendLanguages ?? frontendLanguagesForModel(modelId);
  if (!Array.isArray(allowed) || allowed.length === 0) throw new Error(`Model ${modelId} has no executable frontend languages.`);
  const canonicalAllowed = allowed.map(canonicalLanguageTag);
  if (canonicalAllowed.some(language => language === null)) throw new Error(`Model ${modelId} has an invalid frontend language profile.`);
  if (!canonicalAllowed.includes(requested)) {
    throw new Error(`Model ${modelId} frontend profile [${canonicalAllowed.join(', ')}] does not accept fixture language ${requested}. Add that exact BCP-47 tag only after the frontend supports it.`);
  }
  return requested;
}

/** Validate that a measured result records the language actually selected from its fixture. */
export function assertSettingsLanguageMatchesFixture(settings, fixture) {
  const expected = canonicalLanguageTag(fixture?.language);
  const actual = canonicalLanguageTag(settings?.language);
  if (!expected || !actual || actual !== expected) {
    throw new Error(`Measured cell settings.language must match fixture language ${fixture?.language ?? '(unknown)'}.`);
  }
  return actual;
}
