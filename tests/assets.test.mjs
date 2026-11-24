import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listModels } from '../lib/assets.mjs';
import { getAssetLock } from '../lib/catalog.mjs';
import { LINNET_WEBGPU_RUNTIME } from '../web/linnet/runtime-policy.mjs';
import { SANO_HEART_NANO_F32, SANO_KOKOPOP_PROFILES } from '../web/adapters/sano-kokopop-config.mjs';
import { TINY_VOCA_RU } from '../web/adapters/tiny-voca-ru-profile.mjs';
import { TINY_VOCA_GR } from '../web/adapters/tiny-voca-gr-profile.mjs';
import { MINI_VOZ } from '../web/adapters/mini-voz-profile.mjs';
import { TINY_VOCA_ES } from '../web/adapters/tiny-voca-es-profile.mjs';
import { TINY_VOCA_FR } from '../web/adapters/tiny-voca-fr-profile.mjs';
import { TINY_SWARA } from '../web/adapters/tiny-swara-profile.mjs';
import { TINY_VOCA_PTBR } from '../web/adapters/tiny-voca-ptbr-profile.mjs';
import { TINY_VOCA_PTBR_KOKORO } from '../web/adapters/tiny-voca-ptbr-kokoro-profile.mjs';
import { TINY_BROCA } from '../web/adapters/tiny-broca-profile.mjs';
import { TINY_VOCA_AR_HALABI } from '../web/adapters/tiny-voca-ar-halabi-profile.mjs';
import { TINY_VOCA_AR } from '../web/adapters/tiny-voca-ar-profile.mjs';
import { TINY_VOCA_ARABIC } from '../web/adapters/tiny-voca-arabic-profile.mjs';
import { TINY_VOCA_HE } from '../web/adapters/tiny-voca-he-profile.mjs';
import { BENGALI_VOICE_PROFILE } from '../web/adapters/bengali-voice-profile.mjs';
import { defaultFixtureForModel, frontendLanguagesForModel, requiredFixtureForModel } from '../lib/benchmark-fixtures.mjs';

const root = resolve(import.meta.dirname, '..');

test('catalog entries match the pinned browser backends', () => {
  const models = listModels();
  assert.deepEqual(models.map(model => model.id), ["paradee","phonon","leokani-7m","leokani-4.5m","pivo-curated","woof","piper-en-gb-southern-english-female-low","supertonic-3","kokoro-82m","mms-english","kitten-nano-0.8","sano-amy","inflect-micro-v2","lfm3-audio-2b-gguf","lfm3-omni-2b-gguf","lfm3-audio-2b-fusor-q7-cpu","lfm3-omni-2b-fusor-q7-cpu","mach-boom","pocket-tts-100m-english-int8","fun-cosyvoice3-0.5b-2512","audio8-realistic-0.6b-int4","ming-3.0-tts-0.5b-gguf","ming-3.0-tts-0.5b-fusor-mix-cpu","tiny-voca","korean-tts","slyszeglosy-v1","tiny-voca-de-en","apptor-tiny-tts","sopro-v2-turbo","supratts-1.0-preview","klein-tts-x1.5-pro","linnet-en-35m","silencio-2","zonos3-mini","sano-heart-nano-gguf-f32","sano-robot-mcu","sano-trellis","inflect-atom-v3","sano-heart-gguf","sano-amy-gguf","sano-amy-small-gguf","sano-amy-1p8m-gguf","sano-hfc-gguf","sano-kristin-gguf","inflect-micro-v3","inflect-mini-v3-browser-port","ua-serhiy-0p58m","kale-tts-1-nano-int8","kale-tts-1-nano-fp32","apptor-tiny-tts-at","tiny-voca-it","zerre-tts","vocina-it","clarvia-tts-tiny","tiny-voca-ja-v3","tiny-voca-ja-tsukuyomi-chan","tiny-voca-ru","tiny-voca-gr","mini-voz","tiny-voca-es","tiny-swara","tiny-voca-fr","alpa-es","tiny-voca-ptpt","tiny-voca-ptbr","tiny-voca-ptbr-kokoro","tui-voice-mini-ml","tiny-broca","tiny-voca-ar-halabi","tiny-voca-he","tiny-voca-arabic","tiny-voca-ar","bengali-voice","tiny-voca-hindi","tiny-urdu","tiny-voca-swahili","sobbie-tts","alpa-sanskrit","fiato","tiny-voca-lg","browser-voice-gu-int6"]);
  const korean = getAssetLock().models['korean-tts'];
  assert.equal(korean.modelRevision, 'c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c');
  assert.deepEqual(korean.backends, ['cpu', 'webgpu']);
  assert.equal(korean.license.requiresAcceptance, true);
  assert.equal(korean.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(korean.assets.filter(asset => asset.kind === 'runtime').length, 15);
  assert.equal(korean.runtime.files.length, 0);
  const miniVoz = getAssetLock().models['mini-voz'];
  assert.equal(miniVoz.modelRevision, MINI_VOZ.modelRevision);
  assert.deepEqual(miniVoz.backends, ['cpu', 'webgpu']);
  assert.deepEqual(miniVoz.support.languages, ['es-ES']);
  assert.equal(miniVoz.support.voiceCount, 4);
  assert.equal(miniVoz.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(miniVoz.assets.filter(asset => asset.kind === 'runtime').length, 8);
  assert.equal(miniVoz.assets.find(asset => asset.id === 'mini-voz-stock-frontend').sourcePath,
    'web/mini-voz/frontend.js');
  const alpaEs = getAssetLock().models['alpa-es'];
  assert.equal(alpaEs.modelRevision, 'de2bf894bdd9eb768ae03fc6b385176a0ff505d1');
  assert.equal(alpaEs.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(alpaEs.assets.find(asset => asset.kind === 'model-weights').bytes, 22533274);
  assert.equal(alpaEs.license.requiresAcceptance, false);
  assert.deepEqual(alpaEs.support.languages, ['es-AR']);
  const tinyVocaEs = getAssetLock().models['tiny-voca-es'];
  assert.equal(tinyVocaEs.modelRevision, TINY_VOCA_ES.modelRevision);
  assert.equal(tinyVocaEs.sourceRevision, TINY_VOCA_ES.sourceRevision);
  assert.deepEqual(tinyVocaEs.backends, ['cpu', 'webgpu']);
  assert.deepEqual(tinyVocaEs.support.languages, ['es-ES']);
  assert.equal(tinyVocaEs.support.voiceCount, 2);
  assert.equal(tinyVocaEs.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(tinyVocaEs.assets.filter(asset => asset.target.includes('/runtime/')).length, 6);
  assert.ok(!tinyVocaEs.assets.some(asset => asset.target.includes('LICENSE-ONNXRUNTIME')));
  const tinyVocaFr = getAssetLock().models['tiny-voca-fr'];
  assert.equal(tinyVocaFr.modelRevision, TINY_VOCA_FR.modelRevision);
  assert.equal(tinyVocaFr.sourceRevision, TINY_VOCA_FR.sourceRevision);
  assert.deepEqual(tinyVocaFr.backends, ['cpu', 'webgpu']);
  assert.deepEqual(tinyVocaFr.support.languages, ['fr']);
  const tinySwara = getAssetLock().models['tiny-swara'];
  assert.equal(tinySwara.modelRevision, TINY_SWARA.modelRevision);
  assert.equal(tinySwara.sourceRevision, TINY_SWARA.sourceRevision);
  assert.deepEqual(tinySwara.backends, ['cpu', 'webgpu']);
  assert.deepEqual(tinySwara.support.languages, ['bn']);
  assert.equal(tinySwara.support.voiceCount, 2);
  assert.equal(tinySwara.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(tinySwara.runtime.files.filter(asset => asset.generated).length, 3);
  assert.equal(defaultFixtureForModel('tiny-swara'), 'bn-article-v1');
  assert.equal(requiredFixtureForModel('tiny-swara'), 'bn-article-v1');
  assert.deepEqual(frontendLanguagesForModel('tiny-swara'), ['bn']);
  const tinyVocaPtbr = getAssetLock().models['tiny-voca-ptbr'];
  assert.equal(tinyVocaPtbr.modelRevision, TINY_VOCA_PTBR.modelRevision);
  assert.equal(tinyVocaPtbr.sourceRevision, TINY_VOCA_PTBR.sourceRevision);
  assert.deepEqual(tinyVocaPtbr.backends, ['cpu', 'webgpu']);
  assert.deepEqual(tinyVocaPtbr.support.languages, ['pt-BR']);
  assert.equal(tinyVocaPtbr.support.voiceCount, 2);
  assert.equal(tinyVocaPtbr.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(tinyVocaPtbr.assets.filter(asset => asset.target.includes('/runtime/')).length, 3);
  assert.equal(tinyVocaPtbr.runtime.version, '1.22.0');
  assert.equal(tinyVocaPtbr.assets.filter(asset => asset.target.includes('/runtime/') && asset.url?.includes('onnxruntime-web@1.22.0')).length, 3);
  const ptbrRoot = `models/tiny-voca-ptbr/${tinyVocaPtbr.modelRevision}/${tinyVocaPtbr.sourceRevision}/`;
  const ptbrAssets = new Map(tinyVocaPtbr.assets.map(asset => [asset.target, asset]));
  for (const [name, { bytes, sha256 }] of Object.entries(TINY_VOCA_PTBR.assets)) {
    const asset = ptbrAssets.get(ptbrRoot + name);
    assert.ok(asset, `Missing pinned Portuguese asset: ${name}`);
    assert.deepEqual([asset.bytes, asset.sha256], [bytes, sha256]);
  }
  const frenchRoot = `models/tiny-voca-fr/${tinyVocaFr.modelRevision}/${tinyVocaFr.sourceRevision}/`;
  const frenchAssets = new Map(tinyVocaFr.assets.map(asset => [asset.target, asset]));
  for (const name of ['site/espeak-ng.js', 'site/espeak-ng.wasm', 'runtime/cpu/ort.wasm.min.mjs',
    'runtime/cpu/ort-wasm-simd-threaded.mjs', 'runtime/cpu/ort-wasm-simd-threaded.wasm']) {
    const asset = frenchAssets.get(frenchRoot + name);
    assert.ok(asset?.url, `Missing URL-backed French asset: ${name}`);
    assert.deepEqual([asset.bytes, asset.sha256], TINY_VOCA_FR.assets[name]);
  }
  assert.deepEqual(tinyVocaFr.runtime.files.map(asset => [asset.package, asset.version]), [
    ['onnxruntime-web-pocket', '1.31.1'], ['onnxruntime-web-pocket', '1.31.1'], ['onnxruntime-web-pocket', '1.31.1'],
  ]);
  assert.deepEqual(korean.support.languages, ['ko', 'en']);
  const clarvia = getAssetLock().models['clarvia-tts-tiny'];
  assert.equal(clarvia.modelRevision, '51023684a0a39742455c838e9d1d8714d3ae7289');
  assert.equal(clarvia.browserSourceRevision, 'bf1b1aab40e24ca3f6700980427c386f4f171f6f');
  assert.deepEqual(clarvia.backends, ['cpu', 'webgpu']);
  assert.equal(clarvia.support.voiceCount, 10);
  assert.equal(clarvia.support.bundledVoiceCount, 10);
  assert.equal(clarvia.assets.find(asset => asset.kind === 'model-weights').bytes, 21378871);
  assert.equal(clarvia.assets.filter(asset => asset.target.includes('/runtime/')).length, 6);
  assert.equal(clarvia.assets.filter(asset => asset.target.startsWith('runtimes/pyodide/')).length, 5);
  const apptor = getAssetLock().models['apptor-tiny-tts'];
  assert.equal(apptor.modelRevision, '0b6962273a1d6618f250cdbd621b56ba04b62cef');
  assert.equal(apptor.browserSourceRevision, 'e28eb444250b4d06162e6ba8e5090c4284345913');
  assert.deepEqual(apptor.backends, ['cpu', 'webgpu']);
  assert.deepEqual(apptor.support.languages, ['de']);
  assert.deepEqual(apptor.assets.filter(asset => asset.kind === 'model-weights').map(asset => asset.bytes), [21379442, 16655451]);
  assert.ok(!apptor.assets.some(asset => asset.target.includes('-at')));
  const apptorAt = getAssetLock().models['apptor-tiny-tts-at'];
  assert.equal(apptorAt.modelRevision, 'e28eb444250b4d06162e6ba8e5090c4284345913');
  assert.equal(apptorAt.support.voiceCount, 2);
  assert.equal(apptorAt.support.bundledVoiceCount, 2);
  assert.deepEqual(apptorAt.support.languages, ['de-AT']);
  assert.deepEqual(apptorAt.backends, ['cpu', 'webgpu']);
  assert.deepEqual(apptorAt.assets.filter(asset => asset.kind === 'model-weights').map(asset => asset.sha256), [
    'a478c9827965aceadd03d812a74ecdaed856296fc2a577e1e1625e339299d568',
    '417f2413163d666b23a89dd73b1829a34ac316fb524a02cc6a4120660a40e6eb',
  ]);
  assert.ok(apptorAt.assets.some(asset => asset.id === 'apptor-at-pronunciation-data'));
  assert.deepEqual(models.find(m => m.id === 'ming-3.0-tts-0.5b-fusor-mix-cpu').backends,['cpu']);
  for (const [id, backend, bytes] of [
    ['kale-tts-1-nano-int8', 'cpu', 14767138],
    ['kale-tts-1-nano-fp32', 'webgpu', 30592691],
  ]) {
    const profile = getAssetLock().models[id];
    assert.deepEqual(profile.backends, [backend]);
    assert.deepEqual(profile.assets.filter(asset => asset.kind === 'model-weights').map(asset => asset.bytes), [bytes]);
    assert.deepEqual(profile.assets.filter(asset => asset.kind === 'voice').map(asset => asset.target.split('/').at(-1)),
      ['s057b.bin', 's057b.extra.bin']);
  }
  const supra = models.find(model => model.id === 'supratts-1.0-preview');
  assert.deepEqual(supra.backends, ['cpu', 'webgpu']);
  assert.equal(supra.modelRevision, '80a6b0bd13c92e30e88b0c22183be9c2bdc7061c');
  const mini = models.find(model => model.id === 'inflect-mini-v3-browser-port');
  assert.deepEqual(mini.backends, ['cpu', 'webgpu']);
  assert.equal(mini.modelRevision, 'fdefa06ed090ba0f3e1c5e455c492d2a0b9512e6');
  assert.equal(mini.support.voiceCount, 6);
  assert.equal(mini.support.bundledVoiceCount, 1);
  assert.equal(mini.support.languageCount, 1);
  const miniLock = getAssetLock().models['inflect-mini-v3-browser-port'];
  assert.deepEqual(miniLock.runtime.files.filter(file => file.path.includes('webgpu') || file.path.includes('asyncify'))
    .map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })).sort((a, b) => a.path.localeCompare(b.path)), [
      { path: 'dist/ort-wasm-simd-threaded.asyncify.mjs', bytes: 51913,
        sha256: '249b4dc791f081d33bd11760bfd669fe85f97289e679bbeb291b874272125dff' },
      { path: 'dist/ort-wasm-simd-threaded.asyncify.wasm', bytes: 25499390,
        sha256: 'babec0bbddb6d3082623b99b7e1391b75e0729bcca076ff8424d7753af97fada' },
      { path: 'dist/ort.webgpu.min.mjs', bytes: 66261,
        sha256: '8ae8f1340dd86f8aaa5acc0fd5ec2f42ae874ffd7c9cd804281b73fd177c9864' },
    ]);
  assert.equal(miniLock.assets.filter(asset => asset.kind === 'model-weights').reduce((sum, asset) => sum + asset.bytes, 0), 137110819);
  assert.equal(miniLock.assets.filter(asset => asset.generated).length, 6);
  assert.ok(miniLock.assets.some(asset => asset.id === 'inflect-mini-v3-browser-klein-en-us-lexicon'));
  const klein = models.find(model => model.id === 'klein-tts-x1.5-pro');
  assert.deepEqual(klein.backends, ['cpu', 'webgpu']);
  assert.equal(klein.modelRevision, '25e0e73bebba71e5985bc369628ebdcb81bf7116');
  assert.equal(klein.support.voiceCount, 17);
  assert.equal(klein.support.languageCount, 4);
  const zonos = getAssetLock().models['zonos3-mini'];
  assert.deepEqual(zonos.backends, ['cpu', 'webgpu']);
  assert.equal(zonos.modelRevision, '2921b8821772b0bd10a04456863d21abf9d2f283');
  assert.equal(zonos.runtime.version, 'a50e14117d99181ba7f28047b451ba03ba1a09a9');
  assert.deepEqual(zonos.runtime.files.map(file => file.path).sort(), ['BUILD-MANIFEST.json', 'codec-worker.js', 'engine.js', 'worker.js']);
  assert.ok(zonos.runtime.files.every(file => file.sourcePath.startsWith('web/zonos3/runtime/') && file.kind === 'runtime'));
  assert.equal(zonos.support.voiceCount, 27);
  assert.equal(zonos.support.bundledVoiceCount, 1);
  assert.equal(zonos.support.languageCount, 43);
  assert.equal(zonos.assets.length, 75);
  assert.equal(zonos.assets.find(asset => asset.id === 'zonos3-web-voices-English-Imogen_en-British_F_1-embedding-npy').sha256,
    '683424b91faeade48c8a92e05e1c3679366abbba443ef62eccba8dc40de48e9e');
  assert.equal(zonos.assets.find(asset => asset.id === 'zonos3-cpu-backbone-q4q8').bytes, 663150624);
  assert.equal(zonos.assets.filter(asset => asset.id.startsWith('zonos3-web-backbone-shard-') || asset.id.startsWith('zonos3-web-zac-shard-') || asset.id === 'zonos3-web-companions-steer-gguf').reduce((sum, asset) => sum + asset.bytes, 0), 920731032);
  assert.equal(zonos.assets.filter(asset => asset.id.startsWith('zonos3-cpu-') && asset.kind === 'model-weights').reduce((sum, asset) => sum + asset.bytes, 0), 1160861792);
  const sanoF32 = getAssetLock().models['sano-heart-nano-gguf-f32'];
  assert.deepEqual(sanoF32.backends, ['cpu', 'webgpu']);
  assert.equal(sanoF32.modelRevision, '4a8194aa1dd958033ee449b3ad30c37e536b216e');
  assert.equal(sanoF32.runtime.version, SANO_HEART_NANO_F32.runtime.version);
  assert.equal(sanoF32.assets.find(asset => asset.kind === 'model-weights').sha256, SANO_HEART_NANO_F32.model.sha256);
  assert.equal(sanoF32.assets.filter(asset => asset.kind === 'model-weights').reduce((sum, asset) => sum + asset.bytes, 0), 1462248);
  assert.equal(sanoF32.runtime.files.reduce((sum, asset) => sum + asset.bytes, 0), 5166171);
  assert.ok([...sanoF32.runtime.files, ...sanoF32.assets].every(asset => asset.generated?.artifactPath));
  assert.deepEqual(sanoF32.runtime.files.map(file => ({ target: '/' + file.target, bytes: file.bytes, sha256: file.sha256 })),
    SANO_HEART_NANO_F32.runtime.files.map(file => ({ target: file.url, bytes: file.bytes, sha256: file.sha256 })));
  assert.equal(SANO_HEART_NANO_F32.model.bytes, 1462248);
  assert.equal(SANO_HEART_NANO_F32.model.sha256, '5e4389e27a9db6d18c5e7d479374f0bdb6eb97ab22273edb8d89c879cc97af1e');
  const cpuRuntime = zonos.assets.filter(asset => asset.id.startsWith('zonos3-cpu-runtime-'));
  assert.equal(cpuRuntime.reduce((sum, asset) => sum + asset.bytes, 0), 4402467);
  assert.ok(cpuRuntime.every(asset => asset.url.includes('/releases/download/zonos3-cpu-wasm-v3-59ca2ce1c12b/')));
  assert.equal(cpuRuntime.find(asset => asset.id === 'zonos3-cpu-runtime-wasm').sha256,
    '59ca2ce1c12bffd27fa13beb00e2d90d919f00bcc083c963ce29878de3502bf8');
  const linnet = getAssetLock().models['linnet-en-35m'];
  assert.deepEqual(linnet.backends, ['cpu', 'webgpu']);
  assert.equal(linnet.modelRevision, 'a75fdfe50bc3d3e776b9c5040f149f49a054aaf5');
  assert.equal(linnet.license.requiresAcceptance, true);
  assert.equal(linnet.license.model, 'Linnet Weights License 1.0');
  assert.equal(linnet.support.voiceCount, 2);
  assert.equal(linnet.support.bundledVoiceCount, 1);
  assert.equal(linnet.support.languages[0], 'en');
  assert.equal(linnet.runtime.version, '0.1.1');
  assert.match(linnet.runtime.license, /official CPU demo WASM license unspecified and not redistributed/);
  const hybridRuntime = linnet.assets.find(asset => asset.id === 'linnet-en-35m-webgpu-hybrid-runtime');
  assert.equal(hybridRuntime.target, LINNET_WEBGPU_RUNTIME.target);
  assert.equal(hybridRuntime.bytes, LINNET_WEBGPU_RUNTIME.bytes);
  assert.equal(hybridRuntime.sha256, LINNET_WEBGPU_RUNTIME.sha256);
  assert.equal(hybridRuntime.url,
    `https://github.com/ngelik/tts-bench/releases/download/${LINNET_WEBGPU_RUNTIME.releaseTag}/linnet-tts-webgpu-hybrid.wasm`);
  for (const [id, filename] of [
    ['linnet-en-35m-webgpu-runtime-license', 'LICENSE'],
    ['linnet-en-35m-webgpu-runtime-notice', 'NOTICE'],
  ]) {
    const asset = linnet.assets.find(entry => entry.id === id);
    assert.equal(asset.kind, 'license');
    assert.ok(asset.url.endsWith(`/${LINNET_WEBGPU_RUNTIME.releaseTag}/${filename}`));
  }
  assert.equal(linnet.runtime.files.length, 0, 'hybrid runtime is a release asset, not an undeclared npm file');
  const silencio = getAssetLock().models['silencio-2'];
  assert.deepEqual(silencio.backends, ['cpu', 'webgpu']);
  assert.equal(silencio.modelRevision, '20930f5f6a6bb564f2a8207152fd5c5d8eecff03');
  assert.equal(silencio.support.voiceCount, 8);
  assert.equal(silencio.support.bundledVoiceCount, 1);
  assert.deepEqual(silencio.support.languages, ['en']);
  assert.equal(silencio.runtime.version, '1.31.1');
  assert.equal(silencio.assets.length, 17);
  assert.ok(silencio.assets.every(asset => asset.url.includes('/releases/download/silencio-2-onnx-v1/')));
  assert.deepEqual(models[0].backends, ['cpu', 'webgpu']);
  assert.equal(models[0].modelRevision, 'ed2934d4df8a4fd891e29584c5e1104649409765');
  assert.deepEqual(models[1].backends, ['cpu', 'webgpu']);
  assert.equal(models[1].modelRevision, '92741c5b07d085ff840e26fea8ce43110b87852f');
  assert.deepEqual(models[2].backends, ['cpu', 'webgpu']);
  assert.deepEqual(models[3].backends, ['cpu', 'webgpu']);
  assert.deepEqual(models[4].backends, ['cpu', 'webgpu']);
  assert.deepEqual(models[5].backends, ['webgpu']);
  assert.deepEqual(models[6].backends, ['cpu', 'webgpu']);
  assert.equal(models[6].modelRevision, 'e7229f7d33a10e145e109b886d661984201ac3c4');
  assert.equal(models[6].license.requiresAcceptance, true);
  assert.deepEqual(models[7].backends,['cpu','webgpu']);
  assert.equal(models[7].support.voiceCount,10);
  assert.equal(models[7].support.languageCount,31);
  assert.equal(models[7].support.bundledVoiceCount,1);
  for (const id of ['lfm3-audio-2b-gguf','lfm3-omni-2b-gguf']) {
    const m=models.find(model=>model.id===id);assert.deepEqual(m.backends,['webgpu']);assert.equal(m.support.languageCount,18);assert.equal(m.support.voiceCount,null);
  }
  const microV3 = models.find(model => model.id === 'inflect-micro-v3');
  assert.deepEqual(microV3.backends, ['cpu', 'webgpu']);
  assert.equal(microV3.modelRevision, 'c1a7db6ef44c931623fc2028cb0409659b83156c');
  assert.deepEqual([microV3.support.voiceCount, microV3.support.bundledVoiceCount, microV3.support.languageCount], [6, 1, 1]);
  assert.equal(microV3.license.requiresAcceptance, false);
});

test('Bengali Voice pins its CPU route, deployed voice, and two input-script fixtures', async () => {
  const model = getAssetLock().models['bengali-voice'];
  assert.equal(model.modelRevision, BENGALI_VOICE_PROFILE.modelRevision);
  assert.equal(model.browserSourceRevision, BENGALI_VOICE_PROFILE.browserSourceRevision);
  assert.deepEqual(model.backends, ['cpu']);
  assert.deepEqual(model.support.languages, ['bn']);
  assert.deepEqual(model.support.voiceCount, 1);
  assert.deepEqual(model.support.bundledVoiceCount, 1);
  assert.equal(model.runtime.version, '1.24.3');
  assert.equal(defaultFixtureForModel('bengali-voice'), 'bn-article-v1');
  assert.deepEqual(frontendLanguagesForModel('bengali-voice'), ['bn', 'bn-Latn']);
  assert.equal(requiredFixtureForModel('bengali-voice'), null);
  for (const [fixtureId, fixture] of Object.entries(BENGALI_VOICE_PROFILE.fixtures)) {
    const registered = JSON.parse(await readFile(resolve(root, 'fixtures/registry.json'), 'utf8')).fixtures.find(item => item.id === fixtureId);
    assert.ok(registered, `Missing Bengali Voice fixture ${fixtureId}`);
    assert.equal(registered.language, fixture.language);
    assert.equal(registered.sha256, fixture.sourceSha256);
    assert.equal(registered.chunks, fixture.spans);
  }
  for (const [name, [bytes, sha256]] of Object.entries(BENGALI_VOICE_PROFILE.assetDigests)) {
    const asset = model.assets.find(item => item.target.endsWith('/' + name) || item.target.endsWith('/' + name.replace('.gz', '')));
    assert.ok(asset, `Missing Bengali Voice asset ${name}`);
    assert.equal(asset.bytes, bytes);
    assert.equal(asset.sha256, sha256);
  }
});

test('Haple Tiny Voca pt-BR Kokoro has independent checkpoint, eSpeak and runtime pins', () => {
  const model = getAssetLock().models['tiny-voca-ptbr-kokoro'];
  assert.equal(model.modelRevision, TINY_VOCA_PTBR_KOKORO.modelRevision);
  assert.equal(model.sourceRevision, TINY_VOCA_PTBR_KOKORO.sourceRevision);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['pt-BR']);
  assert.equal(model.support.voiceCount, 2);
  assert.equal(model.parameterCount, 4535755);
  assert.equal(model.assets.find(asset => asset.kind === 'model-weights').sha256, TINY_VOCA_PTBR_KOKORO.modelAssets['models/tiny-voca-ptbr.onnx'].sha256);
  assert.equal(model.assets.filter(asset => asset.generated && asset.target.includes('/espeak-ng/tiny-voca-ptbr-kokoro-1.51/')).length, 3);
  assert.equal(model.runtime.package, TINY_VOCA_PTBR_KOKORO.runtimePackage);
  assert.equal(model.runtime.version, TINY_VOCA_PTBR_KOKORO.runtimeVersion);
  assert.deepEqual(model.runtime.files.filter(file => file.path.includes('asyncify')).map(file => file.path).sort(), [
    'dist/ort-wasm-simd-threaded.asyncify.mjs',
    'dist/ort-wasm-simd-threaded.asyncify.wasm',
  ]);
});

test('Piper has voice and lineage cards plus immutable cache-only runtime pins', async () => {
  const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
  const model = lock.models['piper-en-gb-southern-english-female-low'];
  assert.equal(model.runtime.package, 'onnxruntime-web');
  assert.equal(model.runtime.version, '1.23.2');
  const assets = new Map(model.assets.map(asset => [asset.id, asset]));
  assert.equal(assets.get('piper-southern-english-female-low-voice').bytes, 63104526);
  assert.equal(assets.get('piper-southern-english-female-low-voice').sha256, 'f2f37aed1b3a093476f719d1379ba0c0b1b1cf6f1ef99288e2ebf502971a07c3');
  assert.equal(assets.get('piper-southern-english-female-low-model-card').bytes, 296);
  assert.equal(assets.get('piper-southern-english-female-low-ryan-ancestry-card').bytes, 263);
  for (const id of ['piper-browser-frontend', 'piper-espeak-module', 'piper-espeak-wasm', 'piper-espeak-data']) {
    assert.match(assets.get(id).url, /piper-samples\/da672d1157136d07365790f51da3357a17cf9650/);
  }
  for (const asset of model.assets.filter(asset => asset.id.startsWith('piper-') && asset.id !== 'piper-espeak-ng-license')) {
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0);
  }
  assert.equal(model.license.requiresAcceptance, true);
});

test('asset lock pins content and permits only identical shared runtime targets', async () => {
  const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
  const phonon = lock.models.phonon;
  const paradee = lock.models.paradee;
  assert.equal(lock.schemaVersion, 1);
  assert.equal(phonon.runtime.package, 'phonon-tts');
  assert.equal(phonon.runtime.version, '0.6.0');
  assert.equal(paradee.runtime.package, 'onnxruntime-web');
  assert.equal(paradee.runtime.version, '1.23.2');
  const ids = new Set();
  const targets = new Map();
  for (const model of Object.values(lock.models)) {
    const runtimeFiles = new Set(model.runtime.files);
    for (const asset of [...model.runtime.files, ...model.assets]) {
      assert.ok(asset.path || asset.target);
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0);
      if (asset.id) {
        assert.ok(!ids.has(asset.id), 'duplicate asset id: ' + asset.id);
        ids.add(asset.id);
      }
      const isPinnedNpmRuntime = runtimeFiles.has(asset)
        && Boolean(asset.package ?? model.runtime.package)
        && Boolean(asset.version ?? model.runtime.version);
      assert.ok(asset.url || asset.sourcePath || asset.generated || isPinnedNpmRuntime,
        'asset needs a pinned URL, checked-in source, or package-pinned runtime path: ' + asset.target);
      if (asset.generated) {
        assert.ok(asset.generated.artifactPath);
        assert.match(asset.generated.build, /tools\/[A-Za-z0-9_./-]+\.(?:sh|py|mjs)/);
      }
      const existing = targets.get(asset.target);
      if (existing) {
        assert.equal(asset.bytes, existing.bytes, 'shared target byte count differs: ' + asset.target);
        assert.equal(asset.sha256, existing.sha256, 'shared target hash differs: ' + asset.target);
      } else {
        targets.set(asset.target, { bytes: asset.bytes, sha256: asset.sha256 });
      }
      if (asset.url) assert.equal(new URL(asset.url).protocol, 'https:');
    }
  }
  const phonemizer = paradee.runtime.files.find(file => file.package === 'phonemizer');
  assert.equal(phonemizer.version, '1.2.1');
  assert.equal(phonemizer.target, 'runtimes/phonemizer/1.2.1/phonemizer.js');
  assert.equal(lock.models['leokani-7m'].license.requiresAcceptance, true);
  assert.equal(lock.models['leokani-4.5m'].license.requiresAcceptance, true);
  assert.equal(lock.models.woof.license.requiresAcceptance, true);
  assert.equal(lock.models['leokani-4.5m'].assets.find(asset => asset.id === 'leokani-4-5m-config').sourcePath, 'web/data/leokani/config-4.5m.json');
});


test('Robot and Trellis have complete separate official browser closures', () => {
  for (const [id, script, bytes] of [['sano-robot-mcu','snt_tts.js',679832],['sano-trellis','snt_trellis.js',3982096]]) {
    const m = getAssetLock().models[id];
    assert.deepEqual(m.backends, ['cpu']);
    assert.equal(m.support.voiceCount, 1);
    assert.equal(m.support.languageCount, 1);
    assert.equal(m.assets.filter(a=>a.kind==='model-weights').reduce((n,a)=>n+a.bytes,0),bytes);
    for (const file of ['snt_g2p.js','snt_g2p.wasm','snt_g2p.data',script,script.replace('.js','.wasm')]) {
      assert.ok(m.assets.some(a=>a.target.endsWith('/'+file)),`${id}: ${file}`);
    }
    assert.ok(m.assets.every(a=>a.url.includes(m.modelRevision)));
  }
});

test('each Kokopop voice has one individually pinned GGUF and the shared verified runtime', () => {
  for (const [id, profile] of Object.entries(SANO_KOKOPOP_PROFILES)) {
    const lock = getAssetLock().models[id];
    const models = lock.assets.filter(a => a.kind === 'model-weights');
    assert.equal(models.length, 1);
    assert.equal('/' + models[0].target, profile.model.url);
    assert.equal(models[0].sha256, profile.model.sha256);
    assert.equal(models[0].bytes, profile.model.bytes);
    assert.deepEqual(lock.runtime.files.map(a => [a.target,a.bytes,a.sha256]), profile.runtime.files.map(a => [a.target,a.bytes,a.sha256]));
    assert.equal(lock.support.voiceCount, 1);
    assert.equal(lock.support.bundledVoiceCount, 1);
  }
});

test('Inflect Mini browser-port registration binds its exact upstream license and strict parity scope', async () => {
  const model = getAssetLock().models['inflect-mini-v3-browser-port'];
  const license = model.assets.find(asset => asset.id === 'inflect-mini-v3-browser-license');
  const bytes = await readFile(resolve(root, license.sourcePath));
  assert.equal(bytes.length, license.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), license.sha256);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.equal(model.assets.filter(asset => asset.generated).length, 6);
  assert.match(model.support.notes, /distinct frontend\/source-DSP port/);
  assert.match(model.support.notes, /failed the recorded strict native waveform gate/);
  assert.match(model.support.notes, /only the duration graph uses WebGPU with WASM fallback/);
  assert.match(model.support.notes, /all-graph WebGPU control clipped output/);
});


test('Tiny Voca Russian keeps the exact model, voice, fixture, and parameter pins', async () => {
  const lock = getAssetLock().models['tiny-voca-ru'];
  assert.equal(TINY_VOCA_RU.modelRevision, '2723b0e71fea216001bd4f6caf0866eb06879339');
  assert.equal(TINY_VOCA_RU.modelRevision.length, 40);
  assert.equal(lock.modelRevision, TINY_VOCA_RU.modelRevision);
  assert.equal(lock.sourceRevision, 'aa7086b3b6522f5a5d8cadb11cc5c8b3fde98784');
  assert.equal(lock.spaceRevision, 'bf78c265c4cd02a7853d1bcf1d8bcc1fa72aa69e');
  assert.deepEqual(lock.backends, ['cpu', 'webgpu']);
  assert.deepEqual(lock.support.languages, ['ru']);
  assert.equal(TINY_VOCA_RU.defaultVoice, 'M');
  assert.equal(TINY_VOCA_RU.defaultVoiceIndex, 1);
  assert.equal(TINY_VOCA_RU.sampleRate, 24000);
  assert.equal(TINY_VOCA_RU.fixtureOracle['ru-article-v1'].spans, 95);
  assert.equal(TINY_VOCA_RU.fixtureOracle['ru-article-v1'].tokenStressSha256,
    'dd87fc357784ef2b74dbb70ab6c884746fccd55fffc4908db2838b6185b449f9');
  const parameters = JSON.parse(await readFile(resolve(root, 'lib/model-parameters.json'), 'utf8'))['tiny-voca-ru'];
  assert.equal(parameters.parameterCount, 4534411);
  assert.equal(parameters.countKind, 'exact');
  assert.match(parameters.parameterCountSource, /egnch\/tiny-voca-ru\/blob\/2723b0e71fea216001bd4f6caf0866eb06879339\/README\.md$/);
  assert.match(parameters.scope, /publisher reports exactly 4,534,411 parameters.*waveform generator/i);
});


test('Tiny Voca Greek pins the released Greek model, base source, voice profile and fixture oracle', () => {
  const model = getAssetLock().models['tiny-voca-gr'];
  assert.equal(model.modelRevision, '927ea15cf4edcb8695b75328c9c90c5c53928554');
  assert.equal(model.sourceId, 'n4ze3m/tiny-voca');
  assert.equal(model.sourceRevision, '62e2adef158bc997042cc6234f541f1e0e4cd55d');
  assert.equal(model.espeakRevision, '2e9a5fccbb0095e87b2769e9249ea1f821918ecd');
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['el']);
  assert.deepEqual(TINY_VOCA_GR.voices, [{ id: 'M', index: 0 }, { id: 'F', index: 1 }]);
  assert.equal(TINY_VOCA_GR.defaultVoice, 'M');
  assert.equal(TINY_VOCA_GR.fixtureOracle.spans, 109);
  assert.equal(TINY_VOCA_GR.fixtureOracle.utterances, 335);
  assert.equal(TINY_VOCA_GR.fixtureOracle.maximumTokens, 179);
  assert.equal(TINY_VOCA_GR.fixtureOracle.unknownPhones, 28);
  assert.equal(TINY_VOCA_GR.fixtureOracle.tokenStressSha256, 'e18578d68850f35da5143037440032de7ccd63aaeaf568940be00c25ef47323b');
  assert.deepEqual(model.assets.filter(asset => asset.kind === 'model-weights').map(asset => [asset.bytes, asset.sha256]), [[21359657, '66076bccad4520afb275c4ec2d25a696f580d3ebcb827faeeb5990df11733c9f']]);
});


test('Tiny Broca has pinned model, frontend, runtimes, and fixture metadata', async () => {
  const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
  const model = lock.models['tiny-broca'];
  assert.equal(model.modelRevision, TINY_BROCA.modelRevision);
  assert.equal(model.sourceRevision, TINY_BROCA.sourceRevision);
  assert.equal(model.parameterCount, 4533835);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.equal(model.support.voiceCount, 2);
  assert.deepEqual(model.support.languages, ['pt-BR']);
  assert.equal(model.assets.find(asset => asset.id === 'tiny-broca-onnx').sha256, TINY_BROCA.assets['assets/model.onnx'].sha256);
  assert.equal(model.assets.filter(asset => asset.kind === 'runtime').length, 11);
  assert.ok(model.assets.some(asset => asset.id === 'tiny-broca-ort-ort-wasm-simd-threaded-jsep-wasm'));
});

test('Tiny Voca Arabic Halabi profile binds only the reviewed Arabic fixture and pinned release assets', async () => {
  const lock = JSON.parse(await readFile(resolve(root, 'assets.lock.json'), 'utf8'));
  const model = lock.models['tiny-voca-ar-halabi'];
  assert.equal(defaultFixtureForModel('tiny-voca-ar-halabi'), 'ar-article-v1');
  assert.equal(requiredFixtureForModel('tiny-voca-ar-halabi'), 'ar-article-v1');
  assert.deepEqual(frontendLanguagesForModel('tiny-voca-ar-halabi'), ['ar']);
  assert.equal(model.modelRevision, '4601b2bdb44bc52ebf73e87d5082b49fa138c6fb');
  assert.equal(model.sourceRevision, '4601b2bdb44bc52ebf73e87d5082b49fa138c6fb');
  assert.equal(model.parameterCount, TINY_VOCA_AR_HALABI.parameterCount);
  assert.deepEqual(model.backends, ['cpu', 'webgpu']);
  assert.deepEqual(model.support.languages, ['ar']);
  assert.equal(model.support.voiceCount, 1);
  assert.equal(model.support.bundledVoiceCount, 1);
  assert.equal(model.assets.filter(asset => asset.generated).length, 3);
  assert.deepEqual(model.assets.filter(asset => asset.generated).map(asset => asset.generated.artifactPath).sort(),
    ['ATTRIBUTION.md', 'config.json', 'model.onnx']);
  assert.equal(new Set(model.assets.filter(asset => asset.generated).map(asset => asset.target.slice(0, asset.target.lastIndexOf('/')))).size, 1);
  assert.equal(model.assets.find(asset => asset.kind === 'model-weights').sha256,
    TINY_VOCA_AR_HALABI.assets['assets/model.onnx'].sha256);
  assert.equal(model.assets.filter(asset => asset.kind === 'runtime').length, 11);
  assert.equal(model.assets.filter(asset => asset.target.startsWith('runtimes/pyodide/')).length, 5);
  assert.ok(model.assets.some(asset => asset.url?.includes('/src/tiny_voca/arabic_text.py')));
  assert.equal(TINY_VOCA_AR_HALABI.fixtureOracle.utterances, 557);
  const abdullah = lock.models['tiny-voca-ar'];
  assert.equal(defaultFixtureForModel('tiny-voca-ar'), 'ar-article-v1');
  assert.equal(requiredFixtureForModel('tiny-voca-ar'), 'ar-article-v1');
  assert.deepEqual(frontendLanguagesForModel('tiny-voca-ar'), ['ar']);
  assert.equal(abdullah.modelRevision, TINY_VOCA_AR.modelRevision);
  assert.equal(abdullah.sourceRevision, TINY_VOCA_AR.sourceRevision);
  assert.equal(abdullah.parameterCount, TINY_VOCA_AR.parameterCount);
  assert.deepEqual(abdullah.backends, ['cpu', 'webgpu']);
  assert.deepEqual(abdullah.support.languages, ['ar']);
  assert.equal(abdullah.support.voiceCount, 1);
  assert.equal(abdullah.assets.find(asset => asset.kind === 'model-weights').sha256, TINY_VOCA_AR.assets['assets/model.onnx'].sha256);
  assert.equal(abdullah.assets.find(asset => asset.id === 'tiny-voca-ar-frontend').sourcePath, 'web/tiny-voca-ar/text.py');
  assert.equal(abdullah.assets.filter(asset => asset.kind === 'runtime').length, 11);
  assert.equal(TINY_VOCA_AR.fixtureOracle.utterances, 340);
  assert.equal(TINY_VOCA_AR.fixtureOracle.maximumTokens, 189);
  assert.equal(TINY_VOCA_AR.fixtureOracle.tokenStressSha256, 'aff88555e8f3b33e73656fbdc38cbc8fca3b345d3128a1a0d1316be5e03ffc0d');
  assert.equal(TINY_VOCA_AR_HALABI.fixtureOracle.maximumTokens, 147);
  assert.equal(TINY_VOCA_AR_HALABI.fixtureOracle.tokenStressSha256,
    '8e6f250074d7930ba07fd5e552e57c5a54e8298e6f16c498d3524b5f41a7055e');
  const oddadmix = lock.models['tiny-voca-arabic'];
  assert.equal(defaultFixtureForModel('tiny-voca-arabic'), 'ar-article-v1');
  assert.equal(requiredFixtureForModel('tiny-voca-arabic'), 'ar-article-v1');
  assert.deepEqual(frontendLanguagesForModel('tiny-voca-arabic'), ['ar']);
  assert.equal(oddadmix.modelRevision, TINY_VOCA_ARABIC.modelRevision);
  assert.equal(oddadmix.sourceRevision, TINY_VOCA_ARABIC.sourceRevision);
  assert.equal(oddadmix.parameterCount, TINY_VOCA_ARABIC.parameterCount);
  assert.deepEqual(oddadmix.backends, ['cpu', 'webgpu']);
  assert.deepEqual(oddadmix.support.languages, ['ar']);
  assert.equal(oddadmix.support.voiceCount, 1);
  assert.equal(oddadmix.support.bundledVoiceCount, 1);
  assert.deepEqual(oddadmix.assets.filter(asset => asset.generated).map(asset => asset.generated.artifactPath).sort(), ['decoder.onnx', 'encoder.onnx']);
  assert.equal(new Set(oddadmix.assets.filter(asset => asset.generated).map(asset => asset.target.slice(0, asset.target.lastIndexOf('/')))).size, 1);
  assert.ok(!oddadmix.assets.some(asset => asset.target.endsWith('ed_model_onnx.zip')));
  assert.equal(oddadmix.assets.find(asset => asset.id === 'tiny-voca-arabic-numpy-wheel').sha256,
    '4a2f5303a88a0747c5e6c80701e0ff4ff5667e487c0c9f9c73875e4d88f4cf9a');
  assert.equal(TINY_VOCA_ARABIC.fixtureOracle.tokenStressSha256,
    '1f5bce0f95699c495b17ec67838ba5f3269bbd2fb631499ab40b26eebe8b3194');
  const hebrew = lock.models['tiny-voca-he'];
  assert.equal(defaultFixtureForModel('tiny-voca-he'), 'he-article-v1');
  assert.equal(requiredFixtureForModel('tiny-voca-he'), 'he-article-v1');
  assert.deepEqual(frontendLanguagesForModel('tiny-voca-he'), ['he']);
  assert.equal(hebrew.modelRevision, TINY_VOCA_HE.modelRevision);
  assert.equal(hebrew.sourceRevision, TINY_VOCA_HE.sourceRevision);
  assert.equal(hebrew.parameterCount, TINY_VOCA_HE.parameterCount);
  assert.deepEqual(hebrew.backends, ['cpu', 'webgpu']);
  assert.deepEqual(hebrew.support.languages, ['he']);
  assert.equal(hebrew.license.requiresAcceptance, false);
  assert.equal(hebrew.assets.find(asset => asset.id === 'tiny-voca-he-config').sha256,
    '5d7972962b02f6907a272f798b35ca2752aed08367af50573983617f6f283eb9');
  assert.deepEqual(hebrew.assets.filter(asset => asset.kind === 'model-weights').map(asset => asset.bytes),
    [21361734, 311605741]);
  assert.equal(hebrew.assets.filter(asset => asset.kind === 'model-weights').reduce((sum, asset) => sum + asset.bytes, 0), 332967475);
  assert.equal(TINY_VOCA_HE.fixtureOracle.tokenStressSha256,
    '4bd0027e1c7429bca336b5dc7c79ea789fe996f7bf79ac37e0dfd6972a8db3d7');
});
