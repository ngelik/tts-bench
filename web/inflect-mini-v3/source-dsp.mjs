const f32 = Math.fround;

function interpolateLinear(input, inputLength, outputLength, sourceScale) {
  const output = new Float32Array(outputLength);
  for (let position = 0; position < outputLength; position++) {
    let sourcePosition = (position + 0.5) * sourceScale - 0.5;
    sourcePosition = Math.max(0, Math.min(inputLength - 1, sourcePosition));
    const lower = Math.floor(sourcePosition);
    const upper = Math.min(inputLength - 1, lower + 1);
    const fraction = f32(sourcePosition - lower);
    const left = input[lower];
    const right = input[upper];
    output[position] = f32(f32(left * f32(1 - fraction)) + f32(right * fraction));
  }
  return output;
}

function reflectIndex(index, length) {
  while (index < 0 || index >= length) {
    index = index < 0 ? -index : 2 * length - 2 - index;
  }
  return index;
}

/**
 * Pinned Mini harmonic source and TorchSTFT source features, evaluated on CPU
 * outside the neural ONNX session. This isolates phase accumulation and DFT
 * reduction from a WebGPU provider while retaining the complete source stage
 * inside benchmark generation timing.
 */
export function inflectMiniSourceFeatures({
  f0,
  frameCount,
  phaseUniform,
  harmonicNoise,
  linearWeights,
  linearBias,
  sampleRate = 24_000,
  upsampleScale = 300,
  nFft = 20,
  hopLength = 5,
  sineAmplitude = 0.1,
  noiseStd = 0.003,
  voicedThreshold = 0,
  includeDiagnostics = false,
}) {
  if (!Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > 1200) {
    throw new Error('Inflect Mini source frontend frame count is outside 1–1200.');
  }
  const harmonicCount = phaseUniform?.length;
  const sourceLength = frameCount * 600;
  if (!Number.isInteger(harmonicCount) || harmonicCount < 1
      || f0?.length !== frameCount * 2
      || harmonicNoise?.length !== sourceLength * harmonicCount
      || linearWeights?.length !== harmonicCount
      || !Number.isFinite(linearBias)) {
    throw new Error('Inflect Mini source frontend inputs have invalid tensor dimensions.');
  }
  for (const value of linearWeights) if (!Number.isFinite(value)) throw new Error('Mini source linear weights are nonfinite.');

  const downsampledLength = Math.floor(sourceLength / upsampleScale);
  const radByHarmonic = new Float32Array(sourceLength);
  const sourceAccumulator = new Float32Array(sourceLength);
  const phaseByHarmonic = new Float32Array(downsampledLength);
  for (let harmonic = 0; harmonic < harmonicCount; harmonic++) {
    for (let sample = 0; sample < sourceLength; sample++) {
      let radians = f32(f32(f0[Math.floor(sample / upsampleScale)] * (harmonic + 1)) / sampleRate);
      radians = f32(radians % 1);
      if (sample === 0) radians = f32(radians + (harmonic === 0 ? 0 : phaseUniform[harmonic]));
      radByHarmonic[sample] = radians;
    }
    const down = interpolateLinear(radByHarmonic, sourceLength, downsampledLength, upsampleScale);
    let cumulative = 0;
    for (let sample = 0; sample < downsampledLength; sample++) {
      cumulative = f32(cumulative + down[sample]);
      const phase = f32(f32(f32(cumulative * 2) * Math.PI));
      phaseByHarmonic[sample] = f32(phase * upsampleScale);
    }
    const up = interpolateLinear(phaseByHarmonic, downsampledLength, sourceLength, 1 / upsampleScale);
    for (let sample = 0; sample < sourceLength; sample++) {
      const uv = f0[Math.floor(sample / upsampleScale)] > voicedThreshold ? 1 : 0;
      const sine = f32(f32(Math.sin(up[sample])) * sineAmplitude);
      const noiseAmplitude = uv
        ? f32(uv * noiseStd)
        : f32(f32(1 - uv) * f32(sineAmplitude / 3));
      const clean = f32(sine * uv);
      const noise = f32(noiseAmplitude * harmonicNoise[sample * harmonicCount + harmonic]);
      const source = f32(clean + noise);
      sourceAccumulator[sample] = f32(sourceAccumulator[sample] + f32(source * linearWeights[harmonic]));
    }
  }

  const harmonicSource = new Float32Array(sourceLength);
  for (let sample = 0; sample < sourceLength; sample++) {
    harmonicSource[sample] = f32(Math.tanh(f32(sourceAccumulator[sample] + f32(linearBias))));
  }

  if (nFft !== 20 || hopLength !== 5 || nFft % 2 !== 0) {
    throw new Error('Inflect Mini source STFT is only qualified for pinned n_fft=20, hop=5.');
  }
  const bins = nFft / 2 + 1;
  const stftFrames = Math.floor(sourceLength / hopLength) + 1;
  const window = new Float32Array(nFft);
  for (let index = 0; index < nFft; index++) {
    window[index] = f32(0.5 - 0.5 * Math.cos((2 * Math.PI * index) / nFft));
  }
  const featureCount = bins * stftFrames;
  const sourceSpec = new Float32Array(2 * featureCount);
  const magnitude = sourceSpec.subarray(0, featureCount);
  const phaseOutput = sourceSpec.subarray(featureCount);
  const sourceReal = includeDiagnostics ? new Float32Array(featureCount) : null;
  const sourceImag = includeDiagnostics ? new Float32Array(featureCount) : null;
  const cosine = new Float32Array(bins * nFft);
  const sine = new Float32Array(bins * nFft);
  for (let bin = 0; bin < bins; bin++) {
    for (let n = 0; n < nFft; n++) {
      const angle = (2 * Math.PI * bin * n) / nFft;
      cosine[bin * nFft + n] = f32(Math.cos(angle));
      sine[bin * nFft + n] = f32(Math.sin(angle));
    }
  }
  for (let frame = 0; frame < stftFrames; frame++) {
    const start = frame * hopLength - nFft / 2;
    for (let bin = 0; bin < bins; bin++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < nFft; n++) {
        const sample = harmonicSource[reflectIndex(start + n, sourceLength)];
        const windowed = f32(sample * window[n]);
        real = f32(real + f32(windowed * cosine[bin * nFft + n]));
        imag = f32(imag - f32(windowed * sine[bin * nFft + n]));
      }
      // The reflected first frame is even about sample zero. Also enforce
      // the real-only endpoints of an RFFT, avoiding reduction-order noise.
      if (frame === 0 || bin === 0 || bin === bins - 1) imag = 0;
      const offset = bin * stftFrames + frame;
      if (includeDiagnostics) {
        sourceReal[offset] = real;
        sourceImag[offset] = imag;
      }
      magnitude[offset] = f32(Math.sqrt(f32(f32(real * real) + f32(imag * imag))));
      phaseOutput[offset] = f32(Math.atan2(imag, real));
    }
  }

  return { ...(includeDiagnostics ? { harmonicSource, sourceReal, sourceImag,
    magnitude: new Float32Array(magnitude), phase: new Float32Array(phaseOutput) } : {}),
    sourceSpec, bins, stftFrames, samples: sourceLength };
}
