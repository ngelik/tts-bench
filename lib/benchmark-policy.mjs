import { getModelParameters } from './model-parameters.mjs';

export const SINGLE_REPETITION_WARM_MODEL = 'fun-cosyvoice3-0.5b-2512';
export const LARGE_MODEL_PARAMETER_THRESHOLD = 1_000_000_000;

export function requiresSingleWarmRepetition(parameterCount) {
  return Number.isSafeInteger(parameterCount) && parameterCount > LARGE_MODEL_PARAMETER_THRESHOLD;
}

export function minimumWarmRepetitionsForParameterCount(parameterCount) {
  return requiresSingleWarmRepetition(parameterCount) ? 1 : 5;
}

export function effectiveWarmRepetitions(parameterCount, repetitions) {
  return requiresSingleWarmRepetition(parameterCount) ? 1 : repetitions;
}

export function minimumWarmRepetitions(modelId) {
  if (modelId === SINGLE_REPETITION_WARM_MODEL) return 1;
  return minimumWarmRepetitionsForParameterCount(getModelParameters(modelId)?.parameterCount);
}

export function effectiveRepetitions(modelId, repetitions, scenario = 'warm') {
  if (modelId === SINGLE_REPETITION_WARM_MODEL) return 1;
  if (scenario === 'warm') return effectiveWarmRepetitions(getModelParameters(modelId)?.parameterCount, repetitions);
  return repetitions;
}

export function repetitionAdjustmentNotice(requested, effective, explicit = true) {
  if (requested === effective) return null;
  const source = explicit ? `Requested --repetitions ${requested}` : `Default repetition count ${requested}`;
  return `${source}; effective model policy ran ${effective} ${effective === 1 ? 'repetition' : 'repetitions'}.`;
}

export function resolveRepetitionPlan({ modelId, scenario = 'warm', smoke = false, requested }) {
  const requestedRepetitions = Number(requested ?? (smoke ? 1 : scenario === 'warm' ? 5 : ['cold', 'cached', 'network'].includes(scenario) ? 3 : 1));
  const effective = effectiveRepetitions(modelId, requestedRepetitions, scenario);
  return {
    requestedRepetitions,
    effectiveRepetitions: effective,
    adjustment: repetitionAdjustmentNotice(requestedRepetitions, effective, requested !== undefined),
  };
}

export function receiptRepetitionEvidence(plan) {
  return {
    repetitions: plan.effectiveRepetitions,
    notes: plan.adjustment ? [plan.adjustment] : [],
  };
}
