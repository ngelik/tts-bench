import catalog from './model-parameters.json' with { type: 'json' };

/** parameterCount is exact or a demonstrated lower bound. An optional upper bound is separate. */
export function validateModelParameterEvidence(entry) {
  if (!entry || !['exact', 'lower-bound'].includes(entry.countKind)) {
    throw new Error('Expected exact or lower-bound model parameter evidence');
  }
  if (!Number.isSafeInteger(entry.parameterCount) || entry.parameterCount <= 0) {
    throw new Error('Model parameter count must be a positive safe integer');
  }
  const upper = entry.parameterCountUpperBound;
  if (upper !== undefined && (!Number.isSafeInteger(upper) || upper < entry.parameterCount ||
      (entry.countKind === 'exact' && upper !== entry.parameterCount))) {
    throw new Error('Model parameter bounds are inconsistent');
  }
  if (typeof entry.scope !== 'string' || !entry.scope.trim() ||
      !URL.canParse(entry.parameterCountSource) || new URL(entry.parameterCountSource).protocol !== 'https:') {
    throw new Error('Model parameter evidence must include its scope and an HTTPS source');
  }
  return entry;
}

for (const entry of Object.values(catalog)) Object.freeze(validateModelParameterEvidence(entry));

/** Return sourced evidence for this model registration, or null when no count is documented. */
export function getModelParameters(modelId) {
  return Object.hasOwn(catalog, modelId) ? catalog[modelId] : null;
}
