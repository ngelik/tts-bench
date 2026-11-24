import { BLUE_BUFF_UPSTREAM as upstream } from './blue-buff-upstream.mjs';

/** Static identities for the Blue-Buff Mandarin F profile. The generated ONNX
 * graph and seed streams are intentionally supplied only by the validated
 * blue-build/proof.json finalizer; no output hash is guessed here. */
export const BLUE_BUFF = Object.freeze({
  id: 'tiny-voca-zh-blue-buff',
  modelId: upstream.model.id,
  modelRevision: upstream.model.revision,
  sourceId: upstream.source.id,
  sourceRevision: upstream.source.revision,
  checkpointSha256: '862293aaf5e97fdc8ed01d9d774603dc21e03d3642f188f651e20a92fbeef722',
  modelLicense: Object.freeze({ path: 'LICENSE', bytes: 11358, sha256: 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30' }),
  fixtureId: 'zh-hans-article-v1',
  fixtureSha256: 'e3d2cc5e084b4eaca45a17e5856f3eb6b8225a60c31a19395512cb51b3db0336',
  language: 'zh-Hans',
  locale: 'zh-Hans',
  sampleRate: 24000,
  hop: 256,
  maxTokens: 512,
  tokenLimit: 500,
  maxFrames: 3000,
  framePlan: Object.freeze({
    policy: 'zh-natural-boundary-v1',
    policyVersion: 1,
    policyModule: 'tiny_voca/frame_plan_policy.py',
    tokenTarget: 240,
    noiseReset: 'per-outer-span',
  }),
  parameterCount: 4545355,
  voice: 'F',
  voiceIndex: 0,
  speed: 1,
  pitchShift: 0,
  pitchRange: 1,
  peak: 0.99,
  precision: 'FP32 ONNX checkpoint',
  runtimeVersion: '1.31.1',
  runtimeRoot: '/runtimes/onnxruntime-web-pocket/1.31.1/',
  runtimeAssets: Object.freeze({
    'ort.wasm.min.mjs': [53725, 'c21d9c326d453a4a61398270c804d5979e118540597cb0c07f7b3d64e6098234'],
    'ort.webgpu.min.mjs': [70742, '329cd956772397a1aedd668e911195d39afefb182f6fc14aafa4f08ac8d8f379'],
    'ort-wasm-simd-threaded.mjs': [24738, '30ed0b5cd1182ede931fea448afb567d4dc705ec957af09f108a2be5f770dac3'],
    'ort-wasm-simd-threaded.wasm': [14848852, '4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d'],
    'ort-wasm-simd-threaded.asyncify.mjs': [53457, '59cf781530e1a16df2a291d78798e3ec1152467edaec402d6f9599d85047c302'],
    'ort-wasm-simd-threaded.asyncify.wasm': [28747738, 'ca319e9539cd0f1e291cf56074760121eaf39650f5dbf84b6e52c07f4b2944ec'],
  }),
  pyodideVersion: '0.29.3',
  pyodideRoot: '/runtimes/mach-boom/pyodide-0.29.3/',
  pyodideAssets: Object.freeze({
    'pyodide.mjs': [17616, '23213d27e9dacbda6f25f955fb38dabfc40ada082c04ee253047ea5dddcaa3b5'],
    'pyodide.asm.js': [1074322, '1263f02b5b26099b96112378156f242dd98b39a8201ba7765e5fe3d455c5ce91'],
    'pyodide.asm.wasm': [8647684, 'e2f4ee75b325e35eb31bfb8c613d4dd5098f5502c156a97847686875b5025480'],
    'python_stdlib.zip': [2423989, '4298b6ee445cb724c3973437da47789752b9e6ff4e26619026b283ec801fc46b'],
    'pyodide-lock.json': [120010, '3256ffc76388de0e37f4b34d42ab484268d1afc675179ff97b2a5bb14f84ccac'],
  }),
  frontendZip: Object.freeze({ path: 'mandarin-frontend.zip', bytes: 3461659, sha256: '7d559d88d0d5b1ab0c31f512fa35fba14ed3b9c3aacf73daa4bc8d5f0f1d9747' }),
  frontendNotices: Object.freeze({
    'NOTICE.md': [441, 'a8e403b17a5591b61ebcc382440b6853828dd76642eb6ea404511fcdf785e68b'],
    'frontend-notices/manifest.json': [2731, '2f3ce85f5f3304a7a6998441b725c13b0784268cd76ff460af7b898be3a7d79b'],
    'frontend-notices/pypinyin-LICENSE.txt': [1105, '1e6c90014b4912815c296ee64bb6f6280af47e6d4c5d80e86232dfc5defe764c'],
    'frontend-notices/cn2an-LICENSE.txt': [1062, 'b18d8d4ad8bc57e00ae80d08d9da80a32176f031062f87c739ea7557c1b5d759'],
    'frontend-notices/proces-LICENSE.txt': [1062, '5d91f10d65a205287675a1308b35989979e0a0b15007119b2b539a67643223f0'],
    'frontend-notices/jieba-LICENSE.txt': [1075, '18ba0984839f85853b29fadaf992f7dba8fd0ca0fbeae34de2b8735222dc7a37'],
  }),
  runtimeNotices: Object.freeze({
    'runtime-notices/pyodide-LICENSE': [16725, '1f256ecad192880510e84ad60474eab7589218784b9a50bc7ceee34c2b91f1d5'],
    'runtime-notices/python-LICENSE': [13809, '78b12c3a81360b357002334f0e70ea0e92eebf7a9b358805c03c48484945f3bb'],
  }),
});

// Filled only by tools/finalize-blue-buff-lock.mjs after it has verified the
// export proof and independent native/browser frontend receipts.
export const BLUE_BUFF_BUILD = Object.freeze({
  "graph": "mandarin-f-external-noise.onnx",
  "bytes": 21413272,
  "sha256": "0ba0b4d3ffaf70ffbce2ac31205248d7506f12a85639fd5530630c85fb50028a",
  "sourceCheckpoint": "862293aaf5e97fdc8ed01d9d774603dc21e03d3642f188f651e20a92fbeef722",
  "parameters": 4545355,
  "config": {
    "path": "config.json",
    "bytes": 2225,
    "sha256": "78db443a5d510240f8c073776d8804d39858843182c0bb39b0f9d7d25561e464"
  },
  "noise": [
    {
      "file": "noise-0.f32le",
      "seed": 0,
      "bytes": 3072000,
      "sha256": "9b0877ff8cbe099f0873f0d6e87afcc06fa28436edba96755424951a7cb0421a"
    },
    {
      "file": "noise-1.f32le",
      "seed": 1,
      "bytes": 3072000,
      "sha256": "6e5a2e184b919af5f2476c942dbc963f74b3881b8a115d6061a97a0e496b6a27"
    },
    {
      "file": "noise-2.f32le",
      "seed": 2,
      "bytes": 3072000,
      "sha256": "b50c610eb72a34fbd053716a0489c69428f7772037cf2cf04f98340e7e6940de"
    },
    {
      "file": "noise-3.f32le",
      "seed": 3,
      "bytes": 3072000,
      "sha256": "403ad908de2496aa4d22acc9351f439e7612177ffc763923f232b572fd650630"
    }
  ],
  "frontend": {
    "path": "mandarin-frontend.zip",
    "bytes": 3461659,
    "sha256": "7d559d88d0d5b1ab0c31f512fa35fba14ed3b9c3aacf73daa4bc8d5f0f1d9747"
  },
  "notices": {
    "runtime-notices/pyodide-LICENSE": {
      "bytes": 16725,
      "sha256": "1f256ecad192880510e84ad60474eab7589218784b9a50bc7ceee34c2b91f1d5"
    },
    "runtime-notices/python-LICENSE": {
      "bytes": 13809,
      "sha256": "78b12c3a81360b357002334f0e70ea0e92eebf7a9b358805c03c48484945f3bb"
    },
    "NOTICE.md": {
      "bytes": 441,
      "sha256": "a8e403b17a5591b61ebcc382440b6853828dd76642eb6ea404511fcdf785e68b"
    },
    "frontend-notices/manifest.json": {
      "bytes": 2731,
      "sha256": "2f3ce85f5f3304a7a6998441b725c13b0784268cd76ff460af7b898be3a7d79b"
    },
    "frontend-notices/pypinyin-LICENSE.txt": {
      "bytes": 1105,
      "sha256": "1e6c90014b4912815c296ee64bb6f6280af47e6d4c5d80e86232dfc5defe764c"
    },
    "frontend-notices/cn2an-LICENSE.txt": {
      "bytes": 1062,
      "sha256": "b18d8d4ad8bc57e00ae80d08d9da80a32176f031062f87c739ea7557c1b5d759"
    },
    "frontend-notices/proces-LICENSE.txt": {
      "bytes": 1062,
      "sha256": "5d91f10d65a205287675a1308b35989979e0a0b15007119b2b539a67643223f0"
    },
    "frontend-notices/jieba-LICENSE.txt": {
      "bytes": 1075,
      "sha256": "18ba0984839f85853b29fadaf992f7dba8fd0ca0fbeae34de2b8735222dc7a37"
    }
  },
  "framePlan": {
    "policy": "zh-natural-boundary-v1",
    "policyVersion": 1,
    "policySha256": "da40affe377b8fb79d54d7620ba0793eb2afe902edca0aa862738fddab52db51",
    "tokenTarget": 240,
    "allPlanSha256": "60b4ce5df21aff4f62a857a9c3c16919ab0848f66285634869dd65b4cbf52191",
    "internalPieceCount": 92,
    "maximumPiecesPerSpan": 4,
    "noiseReset": "per-outer-span"
  },
  "frontendOracle": {
    "spanCount": 30,
    "utterances": 92,
    "maximumTokens": 240,
    "unknownTokens": 0,
    "frontendFingerprint": "c1d3f1a39a1887a6f39691a5d687dceb97f8e3c268ab9783827027a7ec7a7543",
    "allPlanSha256": "60b4ce5df21aff4f62a857a9c3c16919ab0848f66285634869dd65b4cbf52191",
    "splitPolicy": "zh-natural-boundary-v1",
    "splitPolicySha256": "da40affe377b8fb79d54d7620ba0793eb2afe902edca0aa862738fddab52db51",
    "tokenTarget": 240,
    "maximumPiecesPerSpan": 4
  }
});
