import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResult } from '../tools/results.mjs';

const hash = value => value.repeat(64);

function capability() {
  return {
    gpuDispatchVerified: true,
    description: 'Hardware WebGPU dispatched Kokopop heart-nano neural work.',
    hardwareAdapter: {
      identity: 'apple',
      vendor: 'apple',
      architecture: null,
      device: null,
      description: null,
      features: ['shader-f16', 'subgroups'],
    },
    dispatches: 213,
    schedulerOperations: { MUL_MAT: 37, IM2COL: 24, ADD: 57, SILU: 9 },
    probeFrames: 70_784,
    probeSampleRate: 24_000,
  };
}

function result({model = 'sano-heart-nano-gguf-f32', origin = 'native', proof = capability()} = {}) {
  return {
    schemaVersion: 1,
    id: 'kokopop-capability-smoke',
    createdAt: '2026-11-18T00:00:00.000Z',
    origin,
    protocol: {
      id: 'browser-tts-offline-v1',
      scenario: 'offline',
      timingBoundary: 'Synthetic receipt fixture for schema validation.',
      warmupRuns: 0,
      repetitions: 1,
      smoke: true,
      networkMbps: null,
    },
    environment: {
      machineLabel: 'Hosted macOS-15',
      os: 'Darwin 25.0.0',
      arch: 'arm64',
      cpu: 'Apple M1',
      logicalCores: 3,
      ramBytes: 7_000_000_000,
      chromeVersion: 'Google Chrome 157.0.0.0',
      gpu: 'apple',
      headless: false,
    },
    fixture: { id: 'smoke-fixture', sha256: hash('a'), characters: 44, chunks: 1 },
    source: { gitCommit: hash('b').slice(0, 40), dirty: false, manifestSha256: hash('c') },
    assets: [{ id: 'kokopop-test-asset', sha256: hash('d'), bytes: 1 }],
    cells: [{
      model,
      backendRequested: 'webgpu',
      backendEffective: 'webgpu+wasm',
      status: 'measured',
      reason: null,
      voice: 'heartnano (US English)',
      precision: 'F32 GGUF',
      settings: {},
      capability: proof,
      warmup: [],
      trials: [{
        index: 1,
        generationMs: 1000,
        samples: 70_784,
        sampleRate: 24_000,
        pcmSha256: hash('e'),
        validation: { finitePcm: true, chunkCount: 1, nonemptyChunks: true },
      }],
    }],
  };
}

test('native Kokopop WebGPU receipt retains bounded hardware and neural dispatch telemetry', () => {
  const input = result();
  const validated = validateResult(input);
  assert.deepEqual(validated.cells[0].capability, capability());
});

test('legacy capability shape remains valid for other GPU models', () => {
  const proof = { gpuDispatchVerified: true, description: 'Legacy model reports verified dispatch.' };
  const validated = validateResult(result({ model: 'legacy-webgpu-model', proof }));
  assert.deepEqual(validated.cells[0].capability, proof);
});

test('historical Kokopop records with legacy capability fields remain readable', () => {
  const proof = { gpuDispatchVerified: true, description: 'Historical dispatch note.' };
  const validated = validateResult(result({ origin: 'historical-import', proof }));
  assert.deepEqual(validated.cells[0].capability, proof);
});

test('native Kokopop WebGPU records require the full telemetry bundle', () => {
  const proof = { gpuDispatchVerified: true, description: 'Dispatch was reported.' };
  assert.throws(() => validateResult(result({ proof })), /named hardware adapter/);
  const partial = capability();
  delete partial.probeSampleRate;
  assert.throws(() => validateResult(result({ proof: partial })), /supplied together/);
});

test('Kokopop dispatch counters and scheduler operations must be meaningful and bounded', () => {
  const zeroDispatches = capability();
  zeroDispatches.dispatches = 0;
  assert.throws(() => validateResult(result({ proof: zeroDispatches })), /compute-dispatch count/);

  const noSchedulerWork = capability();
  noSchedulerWork.schedulerOperations = { MUL_MAT: 0, ADD: 0 };
  assert.throws(() => validateResult(result({ proof: noSchedulerWork })), /positive operation count/);

  const invalidOperation = capability();
  invalidOperation.schedulerOperations = { 'mul_mat': 4 };
  assert.throws(() => validateResult(result({ proof: invalidOperation })), /operation name\/count/);

  const oversizedFeatures = capability();
  oversizedFeatures.hardwareAdapter.features = Array.from({ length: 65 }, (_, index) => 'feature-' + index);
  assert.throws(() => validateResult(result({ proof: oversizedFeatures })), /adapter features/);

  const oversizedFeatureName = capability();
  oversizedFeatureName.hardwareAdapter.features[0] = 'x'.repeat(81);
  assert.throws(() => validateResult(result({ proof: oversizedFeatureName })), /adapter feature/);

  const oversizedAdapterName = capability();
  oversizedAdapterName.hardwareAdapter.identity = 'x'.repeat(161);
  assert.throws(() => validateResult(result({ proof: oversizedAdapterName })), /adapter identity/);

  const oversizedOperationMap = capability();
  oversizedOperationMap.schedulerOperations = Object.fromEntries(Array.from({ length: 65 }, (_, index) => ['OP_' + index, 1]));
  assert.throws(() => validateResult(result({ proof: oversizedOperationMap })), /scheduler operation counts/);

  const oversizedOperationCount = capability();
  oversizedOperationCount.schedulerOperations = { MUL_MAT: 1_000_001 };
  assert.throws(() => validateResult(result({ proof: oversizedOperationCount })), /operation name\/count/);

  const oversizedProbeFrames = capability();
  oversizedProbeFrames.probeFrames = 10_000_001;
  assert.throws(() => validateResult(result({ proof: oversizedProbeFrames })), /Probe frame count/);

  const oversizedCount = capability();
  oversizedCount.dispatches = 1_000_001;
  assert.throws(() => validateResult(result({ proof: oversizedCount })), /compute-dispatch count/);
});

test('Kokopop probe sample rate must match recorded trial PCM', () => {
  const proof = capability();
  proof.probeSampleRate = 16_000;
  assert.throws(() => validateResult(result({ proof })), /sample rate must match/);
});
