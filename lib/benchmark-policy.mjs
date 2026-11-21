import { getModelParameters } from './model-parameters.mjs';

export const SINGLE_REPETITION_WARM_MODEL = 'fun-cosyvoice3-0.5b-2512';
export const LARGE_MODEL_PARAMETER_THRESHOLD = 1_000_000_000;

export function resolveProtocolId({ scenario, warmProtocol = null, resources = false }) {
  if (warmProtocol === 'v2') return 'browser-tts-warm-v2';
  return `browser-tts-${scenario}-v1${resources ? '-resources' : ''}`;
}

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

export function minimumWarmRepetitionsForProtocol(modelId, warmProtocol = null) {
  if (warmProtocol !== 'v2') return minimumWarmRepetitions(modelId);
  if (modelId === SINGLE_REPETITION_WARM_MODEL || requiresSingleWarmRepetition(getModelParameters(modelId)?.parameterCount)) return 1;
  return 3;
}

export function effectiveRepetitions(modelId, repetitions, scenario = 'warm', warmProtocol = null) {
  if (modelId === SINGLE_REPETITION_WARM_MODEL) return 1;
  if (scenario === 'warm') {
    const effective = effectiveWarmRepetitions(getModelParameters(modelId)?.parameterCount, repetitions);
    return warmProtocol === 'v2' && effective !== 1 ? 3 : effective;
  }
  return repetitions;
}

export function repetitionAdjustmentNotice(requested, effective, explicit = true) {
  if (requested === effective) return null;
  const source = explicit ? `Requested --repetitions ${requested}` : `Default repetition count ${requested}`;
  return `${source}; effective model policy ran ${effective} ${effective === 1 ? 'repetition' : 'repetitions'}.`;
}

export function resolveRepetitionPlan({ modelId, scenario = 'warm', smoke = false, resources = false, requested, warmProtocol = null }) {
  if (warmProtocol !== null && warmProtocol !== 'v2') throw new Error('Use --warm-protocol v2');
  if (warmProtocol === 'v2') {
    if (scenario !== 'warm') throw new Error('--warm-protocol v2 is only valid for warm runs');
    if (smoke) throw new Error('--warm-protocol v2 cannot be used with --smoke');
    if (resources) throw new Error('--warm-protocol v2 cannot be used with --resources');
    if (requested !== undefined && Number(requested) !== 3) throw new Error('Warm v2 requires exactly three requested repetitions');
  }
  const defaultRepetitions = warmProtocol === 'v2' ? 3 : (smoke ? 1 : scenario === 'warm' ? 5 : ['cold', 'cached', 'network'].includes(scenario) ? 3 : 1);
  const requestedRepetitions = Number(requested ?? defaultRepetitions);
  const effective = effectiveRepetitions(modelId, requestedRepetitions, scenario, warmProtocol);
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
