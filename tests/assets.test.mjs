import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listModels } from '../lib/assets.mjs';
import { getAssetLock } from '../lib/catalog.mjs';
import { LINNET_WEBGPU_RUNTIME } from '../web/linnet/runtime-policy.mjs';
import { SANO_HEART_NANO_F32, SANO_KOKOPOP_PROFILES } from '../web/adapters/sano-kokopop-config.mjs';

const root = resolve(import.meta.dirname, '..');

test('catalog entries match the pinned browser backends', () => {
  const models = listModels();
  assert.deepEqual(models.map(model => model.id), ["paradee","phonon","leokani-7m","leokani-4.5m","pivo-curated","woof","piper-en-gb-southern-english-female-low","supertonic-3","kokoro-82m","mms-english","kitten-nano-0.8","sano-amy","inflect-micro-v2","lfm3-audio-2b-gguf","lfm3-omni-2b-gguf","lfm3-audio-2b-fusor-q7-cpu","lfm3-omni-2b-fusor-q7-cpu","mach-boom","pocket-tts-100m-english-int8","fun-cosyvoice3-0.5b-2512","audio8-realistic-0.6b-int4","ming-3.0-tts-0.5b-gguf","ming-3.0-tts-0.5b-fusor-mix-cpu","tiny-voca","korean-tts","tiny-voca-de-en","apptor-tiny-tts","sopro-v2-turbo","supratts-1.0-preview","klein-tts-x1.5-pro","linnet-en-35m","silencio-2","zonos3-mini","sano-heart-nano-gguf-f32","sano-robot-mcu","sano-trellis","inflect-atom-v3","sano-heart-gguf","sano-amy-gguf","sano-amy-small-gguf","sano-amy-1p8m-gguf","sano-hfc-gguf","sano-kristin-gguf","inflect-micro-v3","inflect-mini-v3-browser-port","ua-serhiy-0p58m","kale-tts-1-nano-int8","kale-tts-1-nano-fp32","apptor-tiny-tts-at","tiny-voca-it","zerre-tts","vocina-it","clarvia-tts-tiny","tiny-voca-ja-tsukuyomi-chan"]);
  const korean = getAssetLock().models['korean-tts'];
  assert.equal(korean.modelRevision, 'c63fc0de00de22203f4ccfd3dd8a2cd5a20f560c');
  assert.deepEqual(korean.backends, ['cpu', 'webgpu']);
  assert.equal(korean.license.requiresAcceptance, true);
  assert.equal(korean.assets.filter(asset => asset.kind === 'model-weights').length, 1);
  assert.equal(korean.assets.filter(asset => asset.kind === 'runtime').length, 15);
  assert.equal(korean.runtime.files.length, 0);
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
