// The official LFM3 speech prompt accepts English language names, not locale tags.
// Keep this map limited to the exact profiles enabled for Audio in the fixture registry.
const AUDIO_LANGUAGE_NAMES = Object.freeze({
  en: 'American English',
  ar: 'Arabic',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  fi: 'Finnish',
  fr: 'French',
  he: 'Hebrew',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  'pt-BR': 'Portuguese',
  'es-ES': 'Spanish',
  sv: 'Swedish',
  tr: 'Turkish',
  'zh-Hans': 'Chinese',
});

export function resolveLiquidAudioProfile(language) {
  if (!Object.hasOwn(AUDIO_LANGUAGE_NAMES, language)) {
    throw new Error(`LFM3-Audio has no approved browser speech profile for language ${String(language)}.`);
  }
  const promptLanguage = AUDIO_LANGUAGE_NAMES[language];
  const systemPrompt = `Perform TTS in ${promptLanguage} using a female voice.`;
  const voice = language === 'en'
    ? 'American English female (prompted style; no fixed voice identifier)'
    : `Female voice prompted in ${promptLanguage} (no fixed voice identifier)`;
  return Object.freeze({ language, promptLanguage, systemPrompt, voice });
}

export function liquidAudioLanguageTags() {
  return Object.keys(AUDIO_LANGUAGE_NAMES);
}
