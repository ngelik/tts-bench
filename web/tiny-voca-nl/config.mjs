export function validateTinyVocaNlConfig(value, profile) {
  if (value.language !== profile.locale || value.calibrated_excitation !== true ||
      value.sample_rate !== profile.sampleRate || value.hop !== profile.hop ||
      value.max_tokens !== profile.maxTokens || value.max_frames !== profile.maxFrames ||
      value.step !== profile.step || value.frontend !== 'espeak-ng' ||
      value.frontend_fingerprint !== profile.frontendFingerprint ||
      JSON.stringify(value.voices) !== JSON.stringify([profile.voice]) ||
      JSON.stringify(value.inputs) !== JSON.stringify(['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range']) ||
      JSON.stringify(value.outputs) !== JSON.stringify(['audio', 'durations']) ||
      !Array.isArray(value.symbols) || value.symbols.length !== profile.symbolCount ||
      new Set(value.symbols).size !== profile.symbolCount) {
    throw new Error('Tiny Voca Dutch config differs from the pinned calibrated model');
  }
}
