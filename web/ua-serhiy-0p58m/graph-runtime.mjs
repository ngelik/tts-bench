import { uaSerhiySpectralToPcm, UA_SERHIY_HOP_LENGTH } from './dsp.mjs';

export const UA_SERHIY_MAX_TOKENS = 255;
export const UA_SERHIY_MAX_FRAMES = 20_400;
export const UA_SERHIY_HIDDEN = 48;
export const UA_SERHIY_CODE_CHANNELS = 40;

function requirePositiveInt(value, label, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new RangeError(`${label} must be an integer in [1, ${max}].`);
  }
}

async function tensorData(tensor, Type, label) {
  if (!tensor || !Array.isArray(tensor.dims)) throw new Error(`Ukrainian Serhiy ${label} tensor is missing.`);
  const data = typeof tensor.getData === 'function' ? await tensor.getData() : tensor.data;
  if (!(data instanceof Type)) throw new Error(`Ukrainian Serhiy ${label} tensor returned an unexpected data type.`);
  return data;
}

function disposeTensors(tensors) {
  let firstError = null;
  for (const tensor of tensors) {
    try { tensor.dispose?.(); } catch (error) { firstError ??= error; }
  }
  tensors.clear();
  if (firstError) throw new Error(`Ukrainian Serhiy tensor disposal failed: ${String(firstError?.message ?? firstError)}`);
}

function registerOutputs(tensors, outputs) {
  if (!outputs || typeof outputs !== 'object') throw new Error('Ukrainian Serhiy ONNX call returned no outputs.');
  for (const tensor of Object.values(outputs)) if (tensor && typeof tensor.dispose === 'function') tensors.add(tensor);
  return outputs;
}

export function validateUaSerhiyIds(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > UA_SERHIY_MAX_TOKENS ||
      ids.some(id => !Number.isSafeInteger(id) || id < 0 || id > 255)) {
    throw new Error(`Ukrainian Serhiy needs 1..${UA_SERHIY_MAX_TOKENS} integer Piper IDs in [0,255].`);
  }
  return ids;
}

export function buildUaSerhiyDurationFeatures(tokenCount) {
  requirePositiveInt(tokenCount, 'Ukrainian Serhiy token count', UA_SERHIY_MAX_TOKENS);
  const output = new Float32Array(3 * tokenCount);
  const positionDenominator = Math.max(tokenCount - 1, 1);
  const lengthHint = Math.log1p(tokenCount) / Math.log1p(UA_SERHIY_MAX_TOKENS);
  for (let token = 0; token < tokenCount; token++) {
    output[token] = token / positionDenominator;
    output[tokenCount + token] = lengthHint;
    output[2 * tokenCount + token] = 1;
  }
  return output;
}

export function buildUaSerhiyTokenFeatures(tokenCount, durations) {
  requirePositiveInt(tokenCount, 'Ukrainian Serhiy token count', UA_SERHIY_MAX_TOKENS);
  if (!Array.isArray(durations) || durations.length !== tokenCount ||
      durations.some(value => !Number.isSafeInteger(value) || value < 1 || value > 80)) {
    throw new Error('Ukrainian Serhiy duration vector must match tokens with values in [1,80].');
  }
  const output = new Float32Array(2 * tokenCount);
  const positionDenominator = Math.max(tokenCount - 1, 1);
  const durationDenominator = Math.log1p(Math.max(...durations, 1));
  for (let token = 0; token < tokenCount; token++) {
    output[token] = token / positionDenominator;
    output[tokenCount + token] = Math.log1p(durations[token]) / durationDenominator;
  }
  return output;
}

/** Expand token contexts with the exact three per-frame hints in inference.py. */
export function buildUaSerhiyFrameFeatures(contexts, tokenCount, durations) {
  requirePositiveInt(tokenCount, 'Ukrainian Serhiy token count', UA_SERHIY_MAX_TOKENS);
  if (!Array.isArray(durations) || durations.length !== tokenCount ||
      durations.some(value => !Number.isSafeInteger(value) || value < 1 || value > 80)) {
    throw new Error('Ukrainian Serhiy duration vector must match tokens with values in [1,80].');
  }
  if (!(contexts instanceof Float32Array) && !(contexts instanceof Float64Array)) {
    throw new TypeError('Ukrainian Serhiy token contexts must be float32/float64.');
  }
  if (contexts.length !== UA_SERHIY_HIDDEN * tokenCount) {
    throw new Error('Ukrainian Serhiy token-context tensor has invalid dimensions.');
  }
  const frameCount = durations.reduce((total, duration) => total + duration, 0);
  requirePositiveInt(frameCount, 'Ukrainian Serhiy frame count', UA_SERHIY_MAX_FRAMES);
  const output = new Float32Array(51 * frameCount);
  const globalDenominator = Math.max(frameCount - 1, 1);
  const tokenDenominator = Math.max(tokenCount - 1, 1);
  let frame = 0;
  for (let token = 0; token < tokenCount; token++) {
    const duration = durations[token];
    const durationDenominator = Math.max(duration - 1, 1);
    for (let offset = 0; offset < duration; offset++, frame++) {
      for (let channel = 0; channel < UA_SERHIY_HIDDEN; channel++) {
        output[channel * frameCount + frame] = contexts[channel * tokenCount + token];
      }
      output[48 * frameCount + frame] = frame / globalDenominator;
      output[49 * frameCount + frame] = token / tokenDenominator;
      output[50 * frameCount + frame] = offset / durationDenominator;
    }
  }
  if (frame !== frameCount) {
    throw new Error('Ukrainian Serhiy frame-feature expansion did not preserve exact coverage.');
  }
  return { data: output, frameCount };
}

/** Run one already-phonemized bounded unit through the four pinned graphs. */
export async function synthesizeUaSerhiyIds({ ort, sessions, ids, dsp = uaSerhiySpectralToPcm }) {
  validateUaSerhiyIds(ids);
  for (const name of ['duration', 'acousticToken', 'acousticFrame', 'decoder']) {
    if (!sessions?.[name]) throw new Error(`Ukrainian Serhiy ${name} session is not initialized.`);
  }
  const tensors = new Set();
  try {
    const idsTensor = new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]);
    tensors.add(idsTensor);
    const durationFeatures = new ort.Tensor('float32', buildUaSerhiyDurationFeatures(ids.length), [1, 3, ids.length]);
    tensors.add(durationFeatures);
    const durationOutput = registerOutputs(tensors, await sessions.duration.run(
      { ids: idsTensor, features: durationFeatures }, ['durations'],
    ));
    if (durationOutput.durations.dims?.length !== 2 || durationOutput.durations.dims[0] !== 1 ||
        durationOutput.durations.dims[1] !== ids.length) {
      throw new Error('Ukrainian Serhiy duration graph returned unexpected dimensions.');
    }
    const durationData = await tensorData(durationOutput.durations, BigInt64Array, 'duration');
    const durations = Array.from(durationData, value => Number(value));
    if (durations.some(value => !Number.isSafeInteger(value) || value < 1 || value > 80)) {
      throw new Error('Ukrainian Serhiy duration graph returned values outside [1,80].');
    }
    const frameCount = durations.reduce((sum, value) => sum + value, 0);
    requirePositiveInt(frameCount, 'Ukrainian Serhiy frame count', UA_SERHIY_MAX_FRAMES);
    disposeTensors(tensors);

    const idsForContext = new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]);
    const tokenFeatures = new ort.Tensor('float32', buildUaSerhiyTokenFeatures(ids.length, durations), [1, 2, ids.length]);
    tensors.add(idsForContext);
    tensors.add(tokenFeatures);
    const contextOutput = registerOutputs(tensors, await sessions.acousticToken.run(
      { ids: idsForContext, token_features: tokenFeatures }, ['contextual_tokens'],
    ));
    if (contextOutput.contextual_tokens.dims?.length !== 3 || contextOutput.contextual_tokens.dims[0] !== 1 ||
        contextOutput.contextual_tokens.dims[1] !== UA_SERHIY_HIDDEN || contextOutput.contextual_tokens.dims[2] !== ids.length) {
      throw new Error('Ukrainian Serhiy acoustic token graph returned unexpected dimensions.');
    }
    const contextData = await tensorData(contextOutput.contextual_tokens, Float32Array, 'acoustic token context');
    const features = buildUaSerhiyFrameFeatures(contextData, ids.length, durations);
    disposeTensors(tensors);

    const featureTensor = new ort.Tensor('float32', features.data, [1, 51, frameCount]);
    tensors.add(featureTensor);
    const frameOutput = registerOutputs(tensors, await sessions.acousticFrame.run(
      { frame_features: featureTensor }, ['codes'],
    ));
    if (frameOutput.codes.dims?.length !== 3 || frameOutput.codes.dims[0] !== 1 ||
        frameOutput.codes.dims[1] !== UA_SERHIY_CODE_CHANNELS || frameOutput.codes.dims[2] !== frameCount) {
      throw new Error('Ukrainian Serhiy acoustic frame graph returned unexpected dimensions.');
    }
    const codeData = Float32Array.from(await tensorData(frameOutput.codes, Float32Array, 'acoustic code'));
    disposeTensors(tensors);

    const codesTensor = new ort.Tensor('float32', codeData, [1, UA_SERHIY_CODE_CHANNELS, frameCount]);
    tensors.add(codesTensor);
    const decoderOutput = registerOutputs(tensors, await sessions.decoder.run(
      { codes: codesTensor }, ['spectral_params'],
    ));
    if (decoderOutput.spectral_params.dims?.length !== 3 || decoderOutput.spectral_params.dims[0] !== 1 ||
        decoderOutput.spectral_params.dims[1] !== 1_539 || decoderOutput.spectral_params.dims[2] !== frameCount) {
      throw new Error('Ukrainian Serhiy decoder graph returned unexpected spectral dimensions.');
    }
    const params = Float32Array.from(await tensorData(decoderOutput.spectral_params, Float32Array, 'spectral output'));
    const pcm = dsp(params, frameCount);
    if (pcm.length !== frameCount * UA_SERHIY_HOP_LENGTH || !pcm.length) {
      throw new Error('Ukrainian Serhiy DSP returned invalid or incomplete PCM.');
    }
    return pcm;
  } finally {
    disposeTensors(tensors);
  }
}

/**
 * Shared CPU/WebGPU inference path. Session keys and I/O names are fixed:
 * `duration(ids,features)->durations`, `acousticToken(ids,token_features)->contextual_tokens`,
 * `acousticFrame(frame_features)->codes`, and
 * `decoder(codes)->spectral_params`. The caller owns sessions and text G2P.
 */
export function createUaSerhiyGraphRuntime({ ort, sessions, dsp = uaSerhiySpectralToPcm }) {
  if (!ort?.Tensor || !sessions || typeof dsp !== 'function') {
    throw new TypeError('Ukrainian Serhiy graph runtime needs ONNX Tensor, sessions, and DSP.');
  }
  return {
    synthesizeUnit(ids) { return synthesizeUaSerhiyIds({ ort, sessions, ids, dsp }); },
  };
}
