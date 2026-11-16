export const SINGLE_REPETITION_WARM_MODEL = 'fun-cosyvoice3-0.5b-2512';

export function effectiveRepetitions(modelId, repetitions) {
  if (modelId === SINGLE_REPETITION_WARM_MODEL) return 1;
  return repetitions;
}

export function repetitionAdjustmentNotice(modelId, requested, effective) {
  if (modelId !== SINGLE_REPETITION_WARM_MODEL || requested === effective) return null;
  return `Requested --repetitions ${requested}; effective model policy ran ${effective} repetition.`;
}
