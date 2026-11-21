import { AVAILABLE_LANGS, isValidLang } from './helper.mjs';

// The official helper also exposes "na" as a language-agnostic tag, but that
// mode is not one of the model profile's 31 declared languages.
const PROFILE_LANGUAGES = new Set(AVAILABLE_LANGS.filter(language => language !== 'na'));

export function resolveSupertonicLanguage(requested, fallback = 'en') {
  const value = requested == null ? fallback : requested;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Supertonic fixture language must be a nonempty language code.');
  }
  // Fixture metadata is case-insensitive; preserve the exact language code
  // shape otherwise, because the helper accepts only its listed tags.
  const language = value.trim().toLowerCase();
  if (!PROFILE_LANGUAGES.has(language) || !isValidLang(language)) {
    throw new Error(`Supertonic does not support fixture language ${JSON.stringify(value)}; use one of ${[...PROFILE_LANGUAGES].join(', ')}.`);
  }
  return language;
}

export function describeSupertonicFrontend(description, language) {
  return description.replaceAll('<en>', `<${language}>`);
}
