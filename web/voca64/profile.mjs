export const modelRevision = '57fe34dfc061e6cc58e27d186bf7ba16d82d2def';
export const browserSourceRevision = 'a8ee94178a6f9b703e89e113a3354549d1bdc38d';
export const sampleRate = 24000;
export const hop = 256;
export const maxFrames = 3000;
export const voices = Object.freeze({ de: 'fresh-de-f00', en: 'fresh-en-f00' });
export const fixtureOracle = Object.freeze({
  'de-article-v1': Object.freeze({ language: 'de', spans: 109, utterances: 349, maximumTokens: 130,
    tokenStressSha256: 'a9900703dd4607881f0170b303b533d7ead28a5057208fee033ddf10f5029633' }),
  'english-20k-v1': Object.freeze({ language: 'en', spans: 93, utterances: 279, maximumTokens: 129,
    tokenStressSha256: '250950b3b3c6ae1f51264948131bbc56d90d85b16bb100a9a1e4471ea7350dfd' }),
});

export const assetDigests = Object.freeze({
  'assets/frontend/frontend.json': [109724, '1f797b3ba6745f89238e2b61bda3d724227d5d59935810448a015f6c90965daa'],
  'assets/frontend/german.lex': [2731208, '78cbf8f9b6f68d237910c6973f033ff218cec69351432af53e0cbb1634e24793'],
  'assets/frontend/english.lex': [1887253, 'eaab393744309667ef25b05362922d33728fc1ecff90c6e3d162e92cface9083'],
  'assets/frontend/models.safetensors': [13137752, 'bcf78fae71e9d065be3514cf1130ef2bfdf2514da384fa095db3a5be4d0c05a5'],
  'assets/phony/phony_wasm.js': [23927, 'a308847e6e3fa32641cdec4b8e6fd5be64e3130b3003f6d8eb57e81e8c4d9d42'],
  'assets/phony/phony_wasm_bg.wasm': [1662891, 'd4a6721e7c50916c6959884842f1f9953698eb5cf933372fdf9d20a27b9b2da5'],
  'assets/nrmlz/nrmlz_wasm.js': [19507, '7e6704c9e0723b9a5811ef7383d8a4b3580393695280307f4df2adbc01949663'],
  'assets/nrmlz/nrmlz_wasm_bg.wasm': [1459385, 'dc4e42632debf6a663b2a4ee10f0a804f9c41ff76a0d1f178b7a520430f858c6'],
  'assets/quickjs.wasm': [518880, '0c031dd404df00f2d1ed9491a6590d014e88a50424996e5fd70feff1c931c045'],
  'english.js': [205282, '267f590ea6936eeade775aa5693c5da7c227ac40452aa283361401cc86264c17'],
  'assets/voca64/config.json': [2649, 'b8072af2496fcb82890ff2bb0eb437914fd7b0c7aca9a1cc40116735804625eb'],
  'assets/voca64/plan.onnx': [7081928, '28664e25b60d6c3238b740c84326fc4e7158718ac0441835ae74ab55d9a11412'],
  'assets/voca64/wave.onnx': [14403483, '69d88851104e1476f8ca1dc7cd0b5fca39c7283aa5ed4730ed2d9301a031dc85'],
  'assets/voca64/noise.bin': [3072000, '729f345829d572bbe6704057f6a37a273a5152ce2976b7b2628f793f2f982ab3'],
  'assets/voca64/noise-tails.bin': [192000, '7aa268514bf82df347e740e56da6902e73af01b41c00344f15180bf909d53437'],
});

export function voiceIndex(language) {
  if (!Object.hasOwn(voices, language)) throw new Error('Tiny Voca DE/EN does not support ' + language);
  return language === 'de' ? 0 : 32;
}

export function resolveFixtureLanguage(fixtureId, language) {
  // The canonical English fixture's legacy receipt intentionally has no
  // `language` field. Resolve only that exact fixture ID when it is absent.
  const resolved = language === undefined && fixtureId === 'english-20k-v1' ? 'en' : language;
  if (!Object.hasOwn(fixtureOracle, fixtureId) || resolved !== fixtureOracle[fixtureId].language) {
    throw new Error('Tiny Voca DE/EN requires the fixed English or German fixture route');
  }
  return resolved;
}

export function validatePlan(plan) {
  if (!Array.isArray(plan?.ids) || !Array.isArray(plan?.stress) || plan.ids.length !== plan.stress.length || !plan.ids.length) {
    throw new Error('Official Voca64 frontend returned an invalid token/stress plan');
  }
  if (plan.ids.length > 512 || plan.ids.some(id => !Number.isInteger(id) || id < 0 || id >= 88) ||
      plan.stress.some(value => !Number.isInteger(value) || value < 0 || value > 2)) {
    throw new Error('Official Voca64 frontend exceeded its pinned phoneme ABI');
  }
  return plan;
}
