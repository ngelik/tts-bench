export const SINGLE_REPETITION_WARM_MODEL = 'fun-cosyvoice3-0.5b-2512';

export function effectiveRepetitions(modelId, repetitions) {
  if (modelId === SINGLE_REPETITION_WARM_MODEL) return 1;
  return repetitions;
}
