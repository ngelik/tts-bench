// All published recordings remain addressable; defaults come only from the
// currently displayed fixture editions. This module does not select scores.
const identity = entry => JSON.stringify([
  entry.resultId, entry.model, entry.backend, entry.trialIndex, entry.voice,
  entry.language, entry.attribution, entry.modelTerms, entry.playbackNotice, entry.sourceUrls,
  entry.clip?.path, entry.clip?.sha256, entry.clip?.bytes, entry.clip?.startSample,
  entry.clip?.sampleRate, entry.clip?.samples, entry.clip?.seconds,
  entry.full?.url, entry.full?.sha256, entry.full?.bytes,
]);

export function listeningCatalog(catalog) {
  const currentModels = [...(catalog.models ?? []), ...Object.values(catalog.byLanguage ?? {}).flatMap(group => group.models ?? [])];
  const byPath = new Map();
  function add(entry) {
    if (!/^audio\/samples\/[a-z0-9][a-z0-9._-]{0,239}\.wav$/.test(entry?.clip?.path ?? '')) throw new Error('Invalid published clip path');
    const previous = byPath.get(entry.clip.path);
    if (previous && identity(previous) !== identity(entry)) throw new Error(`Conflicting recording identity: ${entry.clip.path}`);
    byPath.set(entry.clip.path, entry);
  }
  // Older site data had no complete archive. Its existing current groups remain
  // usable; newly built sites always include the verified full manifest catalog.
  for (const entry of catalog.recordings ?? []) add(entry);
  for (const model of currentModels) for (const entry of model.audio ?? []) add(entry);
  const selected = new Map();
  for (const model of currentModels) for (const backend of ['cpu','webgpu']) {
    const entry = model.playbackAudio?.[backend];
    if (!entry) continue;
    if (!byPath.has(entry.clip.path)) throw new Error(`Selected recording missing from archive: ${entry.clip.path}`);
    add(entry);
    selected.set(entry.clip.path, entry);
  }
  const models = new Map(currentModels.map(model => [model.id, model]));
  for (const entry of byPath.values()) if (!models.has(entry.model)) models.set(entry.model, {id:entry.model,name:entry.name ?? entry.model});
  return {models:[...models.values()], entries:[...byPath.values()], selectedEntries:[...selected.values()]};
}
