import {fixtureLanguage as registeredLanguage} from '../lib/benchmark-fixtures.mjs';

// Old English receipts predate the language field. Unknown fixtures must not
// inherit English simply because it was the original benchmark default.
export function fixtureLanguage(result) {
  const fixture = result?.fixture;
  const registered = registeredLanguage(fixture?.id);
  const language = fixture?.language ?? (registered === 'en' ? 'en' : null);
  if (typeof language !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) {
    throw new Error('Fixture requires an explicit language: ' + fixture?.id);
  }
  if (!registered || language !== registered) throw new Error('Fixture language mismatch or unknown fixture: ' + fixture?.id);
  return language;
}

export function fixtureKey(result) {
  const {id, sha256, characters, chunks} = result.fixture;
  return JSON.stringify([fixtureLanguage(result), id, sha256, characters, chunks]);
}

export function fixtureGroups(results) {
  const groups = new Map();
  for (const result of results) {
    const key = fixtureKey(result);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }
  return [...groups.values()].sort((a, b) => {
    const left = fixtureLanguage(a[0]), right = fixtureLanguage(b[0]);
    return (left === 'en' ? 0 : 1) - (right === 'en' ? 0 : 1) || fixtureKey(a[0]).localeCompare(fixtureKey(b[0]));
  });
}

export const languageLabel = language => ({en: 'English', uk: 'Ukrainian'}[language] ?? language);
export const memoryChartPath = language => language === 'en' ? 'docs/reference-memory.svg' : `docs/reference-memory-${language}.svg`;
