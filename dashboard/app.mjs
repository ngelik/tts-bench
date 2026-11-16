import {matchesAuditedWav} from '../audio/waveform-integrity.mjs?v=__TTS_BENCH_SITE_VERSION__';

const siteVersion = '__TTS_BENCH_SITE_VERSION__';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits}) : '—';
const repo = 'https://github.com/ngelik/tts-bench';
const cosySelectionReportUrl = `${repo}/blob/main/reports/nov14-multilingual-english/overview.md#reviewed-partial-warm-selection`;
const labels = {cpu: 'CPU', webgpu: 'GPU'};
const shortLicense = value => {
  if (value.startsWith('Model license not separately')) return 'Unclear · CC BY-SA / BY-NC-SA';
  if (value.startsWith('OpenRAIL-M')) return 'OpenRAIL-M';
  if (value.startsWith('Underdog Non-Commercial')) return 'Underdog NC 1.0';
  if (value.startsWith('LFM Open License v1.0')) return 'LFM Open v1.0';
  if (value.startsWith('CC-BY-NC-4.0')) return 'CC BY-NC 4.0';
  if (value.startsWith('CC-BY-4.0')) return 'CC BY 4.0 · restrictions';
  if (value.startsWith('CC BY-NC 4.0')) return 'CC BY-NC 4.0';
  if (value.startsWith('Apache-2.0; preset voice')) return 'Apache-2.0 · CC BY 4.0 voice';
  return value;
};
const chromeVersion = metric => (metric?.environment?.chromeVersion ?? 'unknown').replace(/^Google Chrome\s+/, '');
const state = {data: null, view: 'table', metric: 'generation', sort: 'cpu', direction: 1, playing: null, cohorts: new Map(), modelIds: null};
const audio = $('#sample-audio');
const dialog = $('#details');
const filterDetails = $('#filter-details');
const mobileFilterViewport = matchMedia('(max-width:700px)');
const syncFilterDetails = () => { filterDetails.open = !mobileFilterViewport.matches; };
syncFilterDetails();
mobileFilterViewport.addEventListener('change', () => { syncFilterDetails(); render(); });
let playRequest = 0;
const isScheduledRetest = metric => (metric?.status === 'error' || metric?.receiptStatus === 'error') && metric.registration === 'archived' && Boolean(metric.pendingCurrent);
const statusLabel = metric => isScheduledRetest(metric) ? 'Retest scheduled' : metric?.status === 'measured' ? 'Measured' : metric?.status === 'unsupported' ? 'Unsupported' : metric?.status === 'error' ? 'Run failed' : metric?.displayStatus ?? (metric?.evidenceStatus === 'measured' ? 'Insufficient memory data' : 'Unavailable');
const statusDetails = metric => {
  const reason = metric?.receiptReason ?? metric?.reason;
  const result = isScheduledRetest(metric)
    ? `${reason ? `An earlier run failed (${reason}).` : 'An earlier run failed.'} ${metric.pendingCurrent}`
    : metric?.selectionKind && metric.receiptStatus === 'error'
      ? `${reason ? `An earlier run failed (${reason}).` : 'An earlier run failed.'} ${metric.pendingCurrent ?? 'The displayed scores use only the completed trials selected from the original receipt.'}`
      : metric?.reason || 'No published measurement for this path';
  return metric?.selectionKind
    ? `${result} Reviewed selection: ${metric.n} completed scored articles from ${metric.originalPlannedRepetitions} planned. ${metric.stopReason}`
    : result;
};
const isMeasured = metric => metric?.status === 'measured';
const isEligibleWarm = metric => isMeasured(metric) && Number.isFinite(metric.medianSeconds) && !metric.waveform;
const isMeasuredMemory = metric => isMeasured(metric) && Number.isFinite(metric.meanMB);
const isEligibleMemory = metric => isMeasuredMemory(metric) && !metric.waveform;
const hasEligibleResult = model => ['cpu', 'webgpu'].some(backend => isEligibleWarm(model.warm[backend]) || isEligibleMemory(model.memory[backend]));
const historical = model => ['cpu', 'webgpu'].some(b => model.warm[b]?.registration === 'archived' || model.memory[b]?.registration === 'archived');
const cohortName = metric => state.cohorts.get(metric?.cohortKey)?.label ?? (metric?.origin === 'historical-import' ? 'Historical' : 'Unavailable');
const metricValue = (model, key) => ({
  name: model.name,
  modelMB: model.modelMB,
  cpu: isEligibleWarm(model.warm.cpu) ? model.warm.cpu.medianSeconds : null,
  webgpu: isEligibleWarm(model.warm.webgpu) ? model.warm.webgpu.medianSeconds : null,
  cpuMemory: isEligibleMemory(model.memory.cpu) ? model.memory.cpu.meanMB : null,
  gpuMemory: isEligibleMemory(model.memory.webgpu) ? model.memory.webgpu.meanMB : null,
})[key];
const hasWarmScore = model => ['cpu', 'webgpu'].some(backend => isEligibleWarm(model.warm[backend]));
const hasHealthyCachedMemory = model => ['cpu', 'webgpu'].some(backend => isEligibleMemory(model.memory[backend]) && model.memory[backend].scenario === 'cached');
function hasCurrentWaveformFault(model) {
  return ['cpu', 'webgpu'].some(backend => {
    const warm = model.warm[backend], memory = model.memory[backend];
    if ((warm?.registration === 'current' && warm.waveform) || (memory?.registration === 'current' && memory.waveform)) return true;
    const sample = model.playbackAudio?.[backend];
    const selectedCurrentMetric = (warm?.registration === 'current' && sample?.matchesSelectedWarm) || (memory?.registration === 'current' && sample?.matchesSelectedMemory);
    return Boolean(selectedCurrentMetric && sample && matchesAuditedWav(sample.full.sha256));
  });
}
function outputWarningTag(model) {
  const defect = hasCurrentWaveformFault(model);
  const flag = defect ? `<button type="button" class="evidence-tag output-warning" data-detail="${escape(model.id)}" title="Open the affected recording and waveform audit">Waveform fault</button>` : '';
  const scored = ['cpu', 'webgpu'].flatMap(backend => model.warm[backend]?.outputNotes?.scored ? [[backend, model.warm[backend].outputNotes.scored.text]] : []);
  const warmup = ['cpu', 'webgpu'].flatMap(backend => model.warm[backend]?.outputNotes?.warmup ? [[backend, model.warm[backend].outputNotes.warmup.text]] : []);
  const button = (className, label, rows, prefix) => {
    if (!rows.length) return '';
    const detail = rows.map(([backend, text]) => `${labels[backend]}: ${text}`).join(' ');
    return `<button type="button" class="evidence-tag ${className}" data-detail="${escape(model.id)}" aria-label="${escape(`${prefix}. ${detail}`)}" title="${escape(detail)}">${label}</button>`;
  };
  return flag + button('output-warning', 'Check audio', scored, 'Check audio') + button('output-warmup', 'Warm-up note', warmup, 'Excluded warm-up note');
}
const compareValues = (a, b, av, bv, direction = 1) => {
  if (av == null && bv == null) return a.name.localeCompare(b.name);
  if (av == null) return 1;
  if (bv == null) return -1;
  return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * direction || a.name.localeCompare(b.name);
};
const compare = (a, b) => compareValues(a, b, metricValue(a, state.sort), metricValue(b, state.sort), state.direction);
function selectedModelScope() {
  if (state.modelIds === null) return null;
  const byId = new Map(state.data.models.map(model => [model.id, model]));
  return {
    models: state.modelIds.map(id => byId.get(id)).filter(model => model && hasEligibleResult(model)),
    excluded: state.modelIds.map(id => byId.get(id)).filter(model => model && !hasEligibleResult(model)),
    unknown: state.modelIds.filter(id => !byId.has(id))
  };
}
function clearModelScope() {
  state.modelIds = null;
  const url = new URL(location.href);
  url.searchParams.delete('models');
  history.replaceState(null, '', url);
}
function clearNoResults() {
  const scope = selectedModelScope();
  if (scope !== null && scope.models.length === 0) clearModelScope();
  reset();
}
function visibleModels() {
  const term = $('#search').value.trim().toLowerCase(), cohort = $('#cohort').value, license = $('#license').value;
  return state.data.models.filter(model => hasEligibleResult(model) && (state.modelIds === null || state.modelIds.includes(model.id)) && (!term || `${model.name} ${model.id}`.toLowerCase().includes(term)) && (license === 'all' || model.license.model === license) && (cohort === 'all' || (cohort === 'paired' && model.pairedWarm) || (cohort === 'historical' && historical(model)) || ['cpu', 'webgpu'].some(backend => (isEligibleWarm(model.warm[backend]) && model.warm[backend].cohortKey === cohort) || (isEligibleMemory(model.memory[backend]) && model.memory[backend].cohortKey === cohort)))).sort(compare);
}
function exampleFor(model, backend) {
  return model.playbackAudio[backend];
}
function audioButtons(model) {
  return `<div class="audio-buttons">${['cpu', 'webgpu'].map(backend => {
    const sample = exampleFor(model, backend);
    if (sample && matchesAuditedWav(sample.full.sha256)) {
      const accessible = `${labels[backend]} recording is waveform flagged and hidden from default playback. Open model details or the audio page diagnostic option to listen.`;
      return `<span class="metric-unavailable" title="${escape(accessible)}" aria-label="${escape(accessible)}">${labels[backend]} —</span>`;
    }
    const match = sample?.matchesSelectedWarm ? 'matches the selected warm score' : sample?.matchesSelectedMemory ? 'matches the cached memory run' : 'separate recording';
    const description = `${labels[backend]} ${sample?.scenario ?? 'published'} audio example, ${match}`;
    return sample ? `<button class="listen-button" data-play="${escape(model.id)}" data-backend="${backend}" aria-label="Play ${escape(model.name)} ${escape(description)}" title="${escape(description)}" aria-pressed="${state.playing?.clip.path === sample.clip.path && !audio.paused}"><span class="play-symbol" aria-hidden="true">▶</span> ${labels[backend]}</button>` : `<span class="metric-unavailable" title="No published ${labels[backend]} recording">${labels[backend]} —</span>`;
  }).join('')}</div>`;
}
function metricCell(metric, key, max, backend, label, withBar = true, showRunCount = false) {
  const value = metric?.[key];
  const warm = key === 'medianSeconds';
  const eligible = warm ? isEligibleWarm(metric) : isEligibleMemory(metric);
  if (!eligible) {
    const diagnostic = !warm && isMeasuredMemory(metric) && Boolean(metric.waveform);
    const detail = diagnostic
      ? 'Waveform-flagged recording. The numeric RAM diagnostic and receipt are available in model details.'
      : `${statusLabel(metric)}. ${statusDetails(metric)} No eligible value is shown; open model details for evidence.`;
    const accessible = `${label}: no eligible value. ${detail}`;
    return `<td data-label="${label}"><span class="metric-unavailable ${diagnostic ? 'diagnostic-state' : ''}" title="${escape(accessible)}" aria-label="${escape(accessible)}">—</span></td>`;
  }
  const href = metric?.selectionKind ? cosySelectionReportUrl : metric?.reportUrl;
  const title = metric?.selectionKind
    ? `Open reviewed selection report · ${statusDetails(metric)}`
    : `Open ${label} receipt · ${cohortName(metric)}`;
  const sampleCount = showRunCount && Number.isInteger(metric?.n)
    ? `<small class="metric-count" aria-label="${metric.selectionKind ? `${metric.n} selected from ${metric.originalPlannedRepetitions} planned repetitions` : `${metric.n} scored repetitions`}">${metric.selectionKind ? `n=${metric.n}/${metric.originalPlannedRepetitions} · partial` : `n=${metric.n}`}</small>`
    : '';
  return `<td data-label="${label}"><a class="value metric-link" href="${escape(href)}" title="${escape(title)}">${fmt(value)}</a>${sampleCount}${withBar ? `<div class="mini-track ${backend === 'webgpu' ? 'gpu' : ''}" aria-hidden="true"><span style="width:${max > 0 ? value / max * 100 : 0}%"></span></div>` : ''}</td>`;
}
function renderTable(models) {
  const maxTime = Math.max(1, ...models.flatMap(m => ['cpu', 'webgpu'].map(b => isEligibleWarm(m.warm[b]) ? m.warm[b].medianSeconds : 0)));
  $('#model-rows').innerHTML = models.map(model => {
    const rowState = model.pairedWarm ? 'Matched pair' : historical(model) ? 'Historical' : '';
    const memoryOnly = !hasWarmScore(model) && hasHealthyCachedMemory(model);
    const countPair = model.id === 'fun-cosyvoice3-0.5b-2512';
    const statusBadge = rowState ? `<span class="evidence-tag ${historical(model) ? 'historical' : ''}" title="${model.pairedWarm ? 'Native CPU/GPU pair with compatible protocol, source, assets, settings and environment' : 'At least one receipt is historical or uses earlier assets'}">${rowState}</span>` : '';
    return `<tr data-model="${escape(model.id)}"><td data-label="Model"><div class="model-cell"><span class="model-monogram" aria-hidden="true">${escape(model.name.slice(0, 2).toUpperCase())}</span><div><button class="model-name" data-detail="${escape(model.id)}">${escape(model.name)}</button><div class="model-sub">${statusBadge}${memoryOnly ? '<span class="evidence-tag cached-only">RAM only · cached</span>' : ''}${outputWarningTag(model)}</div></div></div></td><td data-label="Weights · MB"><span class="value">${fmt(model.modelMB)}</span></td><td data-label="License"><button class="license-tag" data-detail="${escape(model.id)}" title="${escape(model.license.model)}" aria-label="Model license: ${escape(model.name)}. ${escape(model.license.model)}">${escape(shortLicense(model.license.model))}</button></td>${metricCell(model.warm.cpu, 'medianSeconds', maxTime, 'cpu', 'CPU · seconds', true, countPair)}${metricCell(model.warm.webgpu, 'medianSeconds', maxTime, 'webgpu', 'GPU · seconds', true, countPair)}${metricCell(model.memory.cpu, 'meanMB', 1, 'cpu', 'Cached RAM · CPU · avg MB', false)}${metricCell(model.memory.webgpu, 'meanMB', 1, 'webgpu', 'Cached RAM · GPU · avg MB', false)}<td data-label="Listen · 30s">${audioButtons(model)}</td></tr>`;
  }).join('');
  $$('th[data-column]').forEach(th => {
    const active = th.dataset.column === state.sort;
    if (active) th.setAttribute('aria-sort', state.direction === 1 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
    th.querySelector('button > span').textContent = active ? state.direction === 1 ? '↑' : '↓' : '↕';
  });
}
function renderCharts(models) {
  const kind = state.metric, key = kind === 'generation' ? 'medianSeconds' : 'meanMB';
  const backends = kind === 'size' ? ['size'] : ['cpu', 'webgpu'];
  const get = (model, backend) => backend === 'size' ? model.modelMB : model[kind === 'generation' ? 'warm' : 'memory'][backend]?.[key];
  const eligible = (model, backend) => backend === 'size' ? Number.isFinite(model.modelMB) : kind === 'generation' ? isEligibleWarm(model.warm[backend]) : isEligibleMemory(model.memory[backend]);
  const max = Math.max(1, ...models.flatMap(m => backends.map(b => eligible(m, b) ? get(m, b) : 0)));
  const units = kind === 'generation' ? 'seconds' : 'MB';
  $('#charts').classList.toggle('single', kind === 'size');
  $('#charts').innerHTML = backends.map(backend => {
    const panelModels = models.filter(model => eligible(model, backend)).sort((a, b) => compareValues(a, b, get(a, backend), get(b, backend)));
    const chartRows = panelModels.map(model => {
    const value = get(model, backend);
    const metric = kind === 'size' ? null : model[kind === 'generation' ? 'warm' : 'memory'][backend];
    const countPair = kind === 'generation' && model.id === 'fun-cosyvoice3-0.5b-2512' && Number.isInteger(metric?.n);
    const countLabel = countPair ? `<small class="metric-count" aria-label="${metric.selectionKind ? `${metric.n} selected from ${metric.originalPlannedRepetitions} planned repetitions` : `${metric.n} scored repetitions`}">${metric.selectionKind ? `n=${metric.n}/${metric.originalPlannedRepetitions} · partial` : `n=${metric.n}`}</small>` : '';
    const score = metric?.selectionKind && kind === 'generation'
      ? `<a class="value metric-link selection-report-link" href="${escape(cosySelectionReportUrl)}" title="Open reviewed selection report · ${escape(statusDetails(metric))}">${fmt(value)} <span class="sr-only">${units}</span></a>`
      : `<span class="value">${fmt(value)} <span class="sr-only">${units}</span></span>`;
    const evidence = metric?.registration === 'archived' ? '<small class="chart-evidence">Historical</small>' : '';
    return `<div class="bar-row" data-model="${escape(model.id)}"><div class="bar-label"><button data-detail="${escape(model.id)}">${escape(model.name)}</button><span class="bar-value">${score}${countLabel}${evidence}</span></div><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${value / max * 100}%"></div></div></div>`;
  }).join('');
    const context = kind === 'generation' ? 'Warm full-article medians · lower is faster' : kind === 'memory' ? 'Chrome process RSS · cached runs · faulted audio excluded' : 'Verified core weights · MB';
    return `<section class="chart-panel ${backend === 'webgpu' ? 'gpu' : backend}" aria-label="${backend === 'size' ? 'Model size' : labels[backend]} chart"><h3>${backend === 'size' ? 'Model weights' : `<i class="key ${backend === 'cpu' ? 'cpu' : 'gpu'}"></i>${labels[backend]}`}</h3><p class="chart-context">${context}</p>${chartRows || '<p class="chart-empty">No eligible measurements.</p>'}</section>`;
  }).join('');
}
function render() {
  if (!state.data) return;
  const models = visibleModels();
  const scope = selectedModelScope();
  const denominator = scope === null ? state.data.models.filter(hasEligibleResult).length : scope.models.length;
  const filtersApplied = Boolean($('#search').value.trim() || $('#cohort').value !== 'all' || $('#license').value !== 'all' || state.modelIds !== null);
  $('#visible-count').hidden = !filtersApplied;
  $('#visible-count').textContent = `${models.length} result${models.length === 1 ? '' : 's'}`;
  $('#table-view').hidden = state.view !== 'table' || models.length === 0;
  $('#charts-view').hidden = state.view !== 'charts' || models.length === 0;
  $('.sort-field').hidden = state.view !== 'table';
  $('#no-results').hidden = models.length > 0;
  const unresolvedSelection = scope !== null && scope.models.length === 0;
  $('#no-results h3').textContent = unresolvedSelection ? 'No recognized configurations in this subset.' : 'No models match these filters.';
  $('#no-results p').textContent = unresolvedSelection
    ? `${scope.unknown.length ? `Unknown model IDs: ${scope.unknown.join(', ')}. ` : ''}${scope.excluded.length ? `No eligible published measurements for: ${scope.excluded.map(model => model.name).join(', ')}. ` : ''}${!scope.unknown.length && !scope.excluded.length ? 'No model IDs were selected. ' : ''}Clear the subset to see all configurations.`
    : 'Try a shorter name or a different license.';
  $('#clear-filters').textContent = unresolvedSelection ? 'Clear subset and filters' : 'Clear filters';
  const cohort = $('#cohort').value;
  const scopeNote = cohort === 'paired' ? 'Matched native CPU/GPU pairs.' : cohort === 'historical' ? 'Archived measurements.' : cohort === 'all' ? 'Lower is faster · cohort sources and conditions vary; only marked pairs match. Details include provenance.' : 'Selected source, Chrome and scenario cohort.';
  const selection = scope === null ? '' : ` <span class="evidence-tag">Subset · ${scope.models.length}</span> ${scope.models.map(model => escape(model.name)).join(', ') || 'No eligible configurations'}${scope.excluded.length ? ` · No eligible result: ${scope.excluded.map(model => escape(model.name)).join(', ')}` : ''}${scope.unknown.length ? ` · Unknown: ${scope.unknown.map(escape).join(', ')}` : ''} <button type="button" class="text-button" data-clear-model-scope>Clear subset</button>`;
  $('#scope-note').innerHTML = `${escape(scopeNote)}${selection}`;
  renderTable(models); renderCharts(models);
}
function reset() { $('#search').value = ''; $('#cohort').value = 'all'; $('#license').value = 'all'; state.sort = 'cpu'; state.direction = 1; $('#sort-select').value = 'cpu'; render(); }
function provenance(metric) {
  if (!metric?.resultId) return '<p class="provenance">No published result for this path.</p>';
  const env = metric.environment;
  return `<p class="provenance"><a href="${escape(metric.reportUrl)}">Open full result receipt ↗</a>${metric.selectionPath ? `<br><a href="${repo}/blob/main/${escape(metric.selectionPath)}">Reviewed selection details ↗</a>` : ''}<br>${escape(metric.origin)} · ${metric.registration === 'current' ? 'registered files verified' : 'archived evidence'} · ${escape(metric.protocolId)}<br>${escape(env?.machineLabel ?? '')}<br>Chrome ${escape(chromeVersion(metric))} · ${escape(env?.os ?? '')}<br>${metric.sourceCommit ? `<a href="${repo}/commit/${escape(metric.sourceCommit)}">Source ${escape(metric.sourceCommit.slice(0, 8))}</a>` : 'Historical source'} · ${escape(metric.createdAt?.slice(0, 10))} UTC${metric.pendingCurrent ? `<br>${escape(metric.pendingCurrent)}` : ''}</p>`;
}
function outputNoteDetails(metric) {
  const notes = metric?.outputNotes;
  if (!notes) return '';
  return `${notes.scored ? `<p class="detail-note output-warning-text"><strong>Check audio:</strong> ${escape(notes.scored.text)}</p>` : ''}${notes.warmup ? `<p class="detail-note output-warmup-text"><strong>Excluded warm-up:</strong> ${escape(notes.warmup.text)}</p>` : ''}<p class="detail-note output-archive-note">Warm-up audio is not archived. Published clips come from the scored trial listed by <code>trialIndex</code> in <code>audio/manifest.json</code>; the clip may not match the receipt or trial with the shortest source chunk.</p>`;
}
function waveformNote(metric) {
  if (!metric?.waveform) return '';
  const audit = metric.waveform;
  return `<p class="detail-note output-warning-text"><strong>Waveform fault.</strong> ${escape(audit.finding)} Recorded generation: ${audit.diagnosticSeconds.map(v => fmt(v)).join(', ')} s. <a href="${escape(audit.url)}">Full waveform audit ↗</a></p>`;
}
function detailMetric(metric, backend, kind) {
  const warm = kind === 'warm';
  return `<section class="detail-card"><h4><i class="key ${backend === 'cpu' ? 'cpu' : 'gpu'}"></i> ${labels[backend]} ${warm ? 'warm generation' : 'memory diagnostic'}</h4>${metric?.selectionKind || isScheduledRetest(metric) ? `<p class="detail-note">${statusLabel(metric)}. ${escape(statusDetails(metric))}</p>` : ''}${isMeasured(metric) ? `<dl>${warm ? `<dt>Median</dt><dd>${fmt(metric.medianSeconds)} s</dd><dt>Observed min–max</dt><dd>${fmt(metric.minSeconds)}–${fmt(metric.maxSeconds)} s</dd><dt>Scored articles</dt><dd>${fmt(metric.n, 0)}${metric.selectionKind ? ` selected / ${fmt(metric.originalPlannedRepetitions, 0)} planned` : ''}</dd><dt>First PCM (median)</dt><dd>${fmt(metric.firstPcmMs)} ms</dd><dt>Real-time factor</dt><dd>${fmt(metric.rtf, 3)}</dd><dt>Audio length (median)</dt><dd>${fmt(metric.audioSeconds)} s</dd>` : `<dt>Mean Chrome memory</dt><dd>${fmt(metric.meanMB)} MB</dd><dt>Sampled generation peak</dt><dd>${fmt(metric.peakMB)} MB</dd><dt>Diagnostic articles</dt><dd>${fmt(metric.n, 0)}</dd><dt>Memory samples</dt><dd>${fmt(metric.sampleCount, 0)}</dd><dt>Generation time${metric.n > 1 ? ' (median)' : ''}</dt><dd>${fmt(metric.generationSeconds)} s</dd><dt>${metric.waveform ? 'PCM duration, including constant intervals' : 'Audio duration'}${metric.n > 1 ? ' (median)' : ''}</dt><dd>${fmt(metric.audioSeconds)} s</dd>`}</dl>` : `<p class="detail-note">${statusLabel(metric)}. ${escape(statusDetails(metric))}</p>`}${waveformNote(metric)}${warm ? outputNoteDetails(metric) : ''}${provenance(metric)}</section>`;
}
function openDetails(id) {
  const model = state.data.models.find(m => m.id === id); if (!model) return;
  const samples = ['cpu', 'webgpu'].map(b => exampleFor(model, b)).filter(Boolean);
  const audioList = samples.map(sample => {
    const diagnostic = matchesAuditedWav(sample.full.sha256);
    const playAction = diagnostic
      ? `<a href="./audio/?sample=${encodeURIComponent(sample.clip.path.split('/').at(-1))}">Open diagnostic recording ↗</a>`
      : `<button class="listen-button" data-play="${escape(model.id)}" data-backend="${sample.backend}">▶ ${labels[sample.backend]} · ${fmt(sample.clip.seconds, 0)} seconds</button>`;
    const relation = sample.matchesSelectedWarm ? ' · matches the selected warm receipt' : sample.matchesSelectedMemory ? ' · matches the selected memory receipt' : ' · example from a separate receipt';
    return `<li>${playAction}<p>${escape(sample.voice)} · ${escape(sample.language)} · ${escape(sample.scenario)} recording${relation}${diagnostic ? ' · waveform flagged; diagnostic playback only' : ''}</p><p>${escape(sample.attribution ?? '')}</p><p>Model terms: ${escape(sample.modelTerms ?? model.license.model)}</p><a href="${escape(sample.full.url)}">Full WAV ↗</a><a href="${escape(sample.reportUrl)}">Recording receipt ↗</a></li>`;
  }).join('') || '<li>No published recording.</li>';
  $('#detail-content').innerHTML = `<h2 id="detail-title">${escape(model.name)}</h2>
    <p class="detail-subtitle">${model.pairedWarm ? 'Matched native CPU / GPU pair' : historical(model) ? 'Contains archived evidence · see each receipt for version and protocol' : 'Backend availability retained in the evidence'}</p>
    <div class="detail-stats"><div class="detail-stat"><strong>${fmt(model.modelMB)}</strong><span>MB · core weights</span></div><div class="detail-stat"><strong>${fmt(model.support.voiceCount, 0)}</strong><span>supported voices</span></div><div class="detail-stat"><strong>${fmt(model.support.languageCount, 0)}</strong><span>supported languages</span></div></div>
    <p class="detail-note">${escape(model.support.scope)}. ${escape(model.support.notes)} English and one selected voice are benchmarked.</p>
    <h3>Warm generation · 20,000 characters</h3><div class="detail-grid">${['cpu', 'webgpu'].map(b => detailMetric(model.warm[b], b, 'warm')).join('')}</div>
    <p class="detail-note">First PCM measures generated audio availability, not audible playback. Real-time factor = generation time / audio duration; lower is faster. Exact voice, precision, settings, warm-up and power conditions are recorded in each receipt.</p>
    <h3>Average memory · separate resource diagnostics</h3><div class="detail-grid">${['cpu', 'webgpu'].map(b => detailMetric(model.memory[b], b, 'memory')).join('')}</div>
    <p class="detail-note">One isolated Chrome instance with one benchmark tab, sampled during generation. Process RSS includes workers and browser baseline; shared pages may be counted more than once. Mean RAM is not a minimum hardware requirement. Sampled peaks can miss brief spikes. These diagnostics have their own source and timing.</p>
    <h3>Licenses</h3><dl class="detail-license"><dt>Model weights</dt><dd>${escape(model.license.model)}</dd><dt>Runtime / code</dt><dd>${escape(model.license.code ?? 'Not specified in the pinned catalog')}</dd></dl>
    <p class="detail-note">The model license does not cover every component or determine output rights. See the upstream terms and <a href="${repo}/blob/main/docs/LICENSING.md">license inventory</a>.</p>
    <h3>Audio examples</h3><ul class="recording-list">${audioList}</ul>
    <div class="detail-bottom">${model.sourceUrl ? `<a href="${escape(model.sourceUrl)}">Model source ↗</a>` : ''}<a href="?model=${encodeURIComponent(model.id)}">Link to this model ↗</a><a href="./audio/">Browse all recordings ↗</a></div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function updatePlaybackButtons() {
  $$('[data-play]').forEach(button => {
    const m = state.data.models.find(m => m.id === button.dataset.play);
    const selected = exampleFor(m, button.dataset.backend)?.clip.path === state.playing?.clip.path;
    button.setAttribute('aria-pressed', String(selected && !audio.paused));
  });
}
async function play(id, backend) {
  const model = state.data.models.find(m => m.id === id), sample = exampleFor(model, backend); if (!sample) return;
  const request = ++playRequest;
  const same = state.playing?.clip.path === sample.clip.path;
  $('#player').hidden = false; document.body.classList.add('has-player'); $('#player-error').hidden = true;
  if (same && !audio.paused) { audio.pause(); return; }
  state.playing = sample;
  if (!same) { audio.src = new URL(sample.clip.path, document.baseURI).href; }
  $('#player-title').textContent = `${model.name} · ${labels[backend]}`;
  $('#player-tag').textContent = `${sample.clip.seconds}-SECOND AUDIO EXAMPLE`;
  $('#player-caption').textContent = `${sample.voice} · ${sample.matchesSelectedWarm ? 'selected warm receipt' : `${sample.scenario} recording · separate receipt`}`;
  $('#player-full').href = sample.full.url; $('#player-receipt').href = sample.reportUrl;
  $('#player-details').dataset.detail = model.id;
  try { await audio.play(); } catch { if (request === playRequest) $('#player-error').hidden = false; }
  if (request === playRequest) updatePlaybackButtons();
}
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, updatePlaybackButtons);
audio.addEventListener('error', () => { $('#player-error').hidden = false; });
$('#close-player').addEventListener('click', () => { const previous = state.playing; ++playRequest; audio.pause(); audio.removeAttribute('src'); audio.load(); state.playing = null; $('#player').hidden = true; document.body.classList.remove('has-player'); updatePlaybackButtons(); const button = $$('[data-play]').find(b => b.dataset.play === previous?.model && b.dataset.backend === previous?.backend && b.getClientRects().length); button?.focus(); });
$('#close-details').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
document.addEventListener('click', event => {
  const clearModelScopeButton = event.target.closest('[data-clear-model-scope]');
  if (clearModelScopeButton) { clearModelScope(); render(); return; }
  const detail = event.target.closest('[data-detail]'); if (detail) openDetails(detail.dataset.detail);
  const playButton = event.target.closest('[data-play]'); if (playButton) play(playButton.dataset.play, playButton.dataset.backend);
  const view = event.target.closest('[data-view]'); if (view) { state.view = view.dataset.view; $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === view))); render(); }
  const metric = event.target.closest('[data-metric]'); if (metric) { state.metric = metric.dataset.metric; $$('[data-metric]').forEach(b => b.setAttribute('aria-pressed', String(b === metric))); render(); }
  const sort = event.target.closest('[data-sort]'); if (sort) { state.direction = state.sort === sort.dataset.sort ? -state.direction : 1; state.sort = sort.dataset.sort; $('#sort-select').value = state.sort; render(); }
});
$('#search').addEventListener('input', render);
$('#cohort').addEventListener('change', render);
$('#license').addEventListener('change', render);
$('#sort-select').addEventListener('change', () => {state.sort = $('#sort-select').value; state.direction = 1; render();});
$('#reset').addEventListener('click', reset);
$('#clear-filters').addEventListener('click', clearNoResults);
try {
  const response = await fetch(`./assets/data.json?v=${siteVersion}`); if (!response.ok) throw new Error(`Data HTTP ${response.status}`);
  state.data = await response.json();
  if (state.data.schemaVersion !== 1 || !state.data.models.length) throw new Error('Unsupported dashboard data');
  const cohorts = [...new Map(state.data.models.flatMap(model => ['warm', 'memory'].flatMap(kind => ['cpu', 'webgpu'].map(backend => model[kind][backend]))).filter(metric => metric?.origin === 'native' && metric.cohortKey && (isEligibleWarm(metric) || isEligibleMemory(metric))).map(metric => [metric.cohortKey, metric])).entries()].sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
  cohorts.forEach(([key, metric], index) => {
    const label = `C${index + 1} · ${metric.sourceCommit.slice(0, 8)} · Chrome ${chromeVersion(metric)} · ${metric.scenario === 'cached' ? 'cached RAM' : 'warm'}`;
    state.cohorts.set(key, {label, metric});
    const option = document.createElement('option'); option.value = key; option.textContent = label; $('#cohort').append(option);
  });
  for (const license of [...new Set(state.data.models.map(m => m.license.model))].sort()) { const option = document.createElement('option'); option.value = license; option.textContent = license; $('#license').append(option); }
  $('#model-count').textContent = state.data.models.filter(hasEligibleResult).length;
  $('#score-count').textContent = state.data.models.reduce((sum, model) => sum + ['cpu', 'webgpu'].filter(backend => isEligibleWarm(model.warm[backend])).length, 0);
  $('#updated').textContent = `Latest receipt ${state.data.updatedAt.slice(0, 10)} UTC`;
  const params = new URL(location.href).searchParams;
  state.modelIds = params.has('models')
    ? [...new Set(params.getAll('models').flatMap(value => value.split(',').map(id => id.trim()).filter(Boolean)))]
    : null;
  $('#search').value = params.get('q') ?? '';
  if (['table', 'charts'].includes(params.get('view'))) state.view = params.get('view');
  if (['generation', 'memory', 'size'].includes(params.get('metric'))) state.metric = params.get('metric');
  $$('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  $$('[data-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.metric === state.metric)));
  render();
  const requestedModel = params.get('model'); if (requestedModel) openDetails(requestedModel);
} catch (error) { $('#load-error').hidden = false; $('#table-view').hidden = true; $('#updated').textContent = 'Results unavailable'; console.error('Dashboard failed:', error); }
