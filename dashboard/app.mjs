import {matchesAuditedWav} from '../audio/waveform-integrity.mjs?v=__TTS_BENCH_SITE_VERSION__';
import {HOSTED_ONLY_LANGUAGES} from './coverage.mjs?v=__TTS_BENCH_SITE_VERSION__';

const siteVersion = '__TTS_BENCH_SITE_VERSION__';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits}) : '—';
const repo = 'https://github.com/ngelik/tts-bench';
const labels = {cpu: 'CPU', webgpu: 'GPU', languages:'Supported languages', voices:'Supported voices'};
const shortLicense = value => {
  // Compact summaries are navigation to the complete terms, not new licenses.
  // In particular, an upstream code license cannot stand in for unstated weights.
  if (/not separately|no license declaration|does not declare/i.test(value)) return 'See terms';
  if (value.startsWith('OpenRAIL-M')) return 'OpenRAIL-M · restricted';
  if (value.startsWith('Underdog Non-Commercial')) return 'Underdog NC 1.0';
  if (value.startsWith('LFM Open License v1.0')) return 'LFM Open · $10M limit';
  if (/^CC[- ]BY[- ]NC[- ]4\.0/.test(value)) return 'CC BY-NC 4.0';
  if (value.startsWith('CC-BY-4.0')) return value.includes('conditions') ? 'CC BY 4.0 + restrictions' : 'CC BY 4.0';
  if (value.startsWith('Apache-2.0; preset voice')) return 'Apache-2.0 + CC BY voice';
  if (value.startsWith('Apache-2.0 for the pinned Inflect-owned')) return 'Apache-2.0 · scoped';
  if (value.startsWith('MIT; bundled English G2P')) return 'MIT + Apache-2.0';
  return value.length <= 36 ? value : 'See terms';
};
const chromeVersion = metric => (metric?.environment?.chromeVersion ?? 'unknown').replace(/^Google Chrome\s+/, '');
const state = {data: null, view: 'charts', metric: 'generation', sort: 'cpu', direction: 1, playing: null, cohorts: new Map(), modelIds: null, language: 'all', editions: [], allModels: []};
const languageName = () => languageLabel(state.language);
const capabilityFilters = ['weight-filter', 'supported-language', 'language-count', 'voice-count'];
const filterParams = {'weight-filter':'weight', 'supported-language':'supports', 'language-count':'languages', 'voice-count':'voices'};
const countValue = (value, minimum = 1) => Number.isSafeInteger(value) && value >= minimum ? value : null;
const weightValue = model => Number.isFinite(model.modelMB) && model.modelMB >= 0 ? model.modelMB : null;
const supportCodes = model => [...new Set((Array.isArray(model.support?.languages) ? model.support.languages : []).filter(code => typeof code === 'string' && code.trim()).map(code => code.trim()))];
const languageNames = new Intl.DisplayNames(['en'], {type:'language'});
const languageLabel = code => { try { return languageNames.of(code) || code; } catch { return code; } };
const languageIdPattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
// Match labels pasted with Latin accents, Hebrew marks, or Arabic marks and tatweel.
const foldSearch = value => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u0640\u064b-\u0652\u0670]/gu, '').toLocaleLowerCase('en');
function languageGroup(id = state.language) {
  return id === 'en' ? state.data : state.data?.byLanguage?.[id];
}
function hostedOnlyCoverage(id = state.language) {
  return HOSTED_ONLY_LANGUAGES[id] && !languageGroup(id)?.models?.some(hasEligibleResult) ? HOSTED_ONLY_LANGUAGES[id] : null;
}
function languageDetails(id, registryLabel = '') {
  if (id === 'bn-Latn') return {
    englishName: 'Romanized Bengali',
    nativeName: 'Bangla (Roman horofe)',
    meta: 'Latin script',
    aliases: ['Romanised Bengali', 'Bengali Latin', 'Bangla (Latin)', 'বাংলা'],
  };
  if (id === 'ur-Latn') return {
    englishName: 'Roman Urdu',
    nativeName: null,
    meta: 'Latin script',
    aliases: ['Romanized Urdu', 'Romanised Urdu', 'Urdu (Latin)', 'اردو'],
  };
  const hostedCoverage = HOSTED_ONLY_LANGUAGES[id];
  const englishName = hostedCoverage?.label ?? languageLabel(id);
  let nativeName = null;
  if (!hostedCoverage) {
    // Chrome may lack the locale data used to build the dashboard registry.
    nativeName = registryLabel && registryLabel !== id ? registryLabel : null;
    if (!nativeName) {
      try { nativeName = new Intl.DisplayNames([id], {type:'language'}).of(id); } catch {}
      if (!nativeName || nativeName === id) nativeName = englishName;
    }
  }
  if (nativeName) nativeName = Array.from(nativeName).map((part,index)=>index===0?part.toLocaleUpperCase(id):part).join('');
  const subtags = id.split('-').slice(1);
  const script = subtags.find(part => /^[A-Za-z]{4}$/.test(part));
  const region = subtags.find(part => /^(?:[A-Za-z]{2}|\d{3})$/.test(part));
  let scriptName = '', regionName = '';
  try { if (script) scriptName = new Intl.DisplayNames(['en'], {type:'script'}).of(script) || script; } catch {}
  try { if (region) regionName = new Intl.DisplayNames(['en'], {type:'region'}).of(region) || region; } catch {}
  const meta = hostedCoverage ? '' : [scriptName && `${scriptName} script`, regionName].filter(Boolean).join(' · ');
  const aliases = hostedCoverage ? hostedCoverage.aliases : id === 'bn' ? ['Bengali'] : [];
  if (script === 'Latn' && !hostedCoverage) {
    const spoken = languageLabel(id.split('-')[0]);
    aliases.push(`Roman ${spoken}`, `Romanized ${spoken}`, `Romanised ${spoken}`, `${spoken} Latin`);
  }
  return {englishName, nativeName, meta, aliases};
}
function registeredLanguages() {
  const records = new Map([['en', {id:'en', ...languageDetails('en')}]]);
  for (const entry of Array.isArray(state.data?.languages) ? state.data.languages : []) {
    if (!entry || typeof entry.id !== 'string' || !languageIdPattern.test(entry.id) || records.has(entry.id)) continue;
    if (!Object.hasOwn(state.data?.byLanguage ?? {}, entry.id) || !Array.isArray(languageGroup(entry.id)?.models)) continue;
    let registryLabel = typeof entry.label === 'string' ? entry.label.trim() : '';
    if (registryLabel.length > 80) registryLabel = '';
    const details = languageDetails(entry.id, registryLabel);
    records.set(entry.id, {id:entry.id, ...details});
  }
  for (const [id, coverage] of Object.entries(HOSTED_ONLY_LANGUAGES)) {
    const existing = records.get(id);
    if (existing) records.set(id, {...existing, coverage});
    else records.set(id, {id, ...languageDetails(id), coverage});
  }
  return [...records.values()].map(record => ({...record, count:languageGroup(record.id)?.models?.filter(hasEligibleResult).length ?? 0}))
    .sort((a,b) => Number(b.count > 0) - Number(a.count > 0) || a.englishName.localeCompare(b.englishName, 'en') || a.id.localeCompare(b.id));
}
function normalizeLanguage(id) {
  return state.editions.some(entry => entry.id === id) ? id : 'all';
}
function stateUrl(language = state.language, {removeModel = false} = {}) {
  const url = new URL(location.href);
  const values = {lang:language === 'all' ? '' : language, q:$('#search').value,
    view:state.view === 'charts' ? '' : state.view, metric:state.metric === 'generation' ? '' : state.metric,
    sort:state.sort === 'cpu' ? '' : state.sort, direction:state.direction === 1 ? '' : 'desc',
    license:$('#license').value === 'all' ? '' : $('#license').value};
  url.searchParams.delete('cohort');
  if (removeModel) url.searchParams.delete('model');
  for (const id of capabilityFilters) values[filterParams[id]] = $(`#${id}`).value === 'all' ? '' : $(`#${id}`).value;
  const targetModels = activeModels(language);
  if (values.supports && values.supports !== 'unlisted' && !targetModels.some(model=>supportCodes(model).includes(values.supports))) values.supports = '';
  if (values.license && !targetModels.some(model=>model.license?.model === values.license)) values.license = '';
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  return url;
}
function languageHref(language) {
  const url = stateUrl(language, {removeModel:true});
  return url.pathname + url.search + url.hash;
}
function buildLanguagePicker() {
  const measured = $('#measured-languages'), pending = $('#pending-languages');
  measured.replaceChildren(); pending.replaceChildren();
  const overview = {id: 'all', englishName: 'All languages', aliases: [], count: new Set(state.allModels.map(model => model.id)).size};
  for (const language of [overview, ...state.editions]) {
    const li = document.createElement('li'), link = document.createElement('a');
    link.id = `language-${language.id}`; link.href = languageHref(language.id); link.dataset.language = language.id;
    link.className = 'language-option';
    if (language.id === state.language) link.setAttribute('aria-current','page');
    const names = document.createElement('span'); names.className = 'language-option-names';
    if (language.nativeName) {
      const native = document.createElement('span'); native.className = 'language-option-native';
      const nativeBdi = document.createElement('bdi'); nativeBdi.lang = language.id; nativeBdi.dir = 'auto'; nativeBdi.textContent = language.nativeName;
      native.append(nativeBdi); names.append(native);
    }
    if (!language.nativeName || language.englishName !== language.nativeName) {
      const english = document.createElement('span'); english.className = 'language-option-english';
      english.textContent = language.englishName; names.append(english);
    }
    if (language.meta) { const meta = document.createElement('span'); meta.className = 'language-option-meta'; meta.textContent = language.meta; names.append(meta); }
    const tag = document.createElement('span'); tag.className = 'language-option-tag'; tag.textContent = language.id;
    if (language.id !== 'all') names.append(tag);
    const count = document.createElement('span'); count.className = 'language-option-count'; count.dataset.languageCount = language.id;
    count.textContent = language.count > 0 ? `${language.count} ${language.count === 1 ? 'model' : 'models'}` : language.coverage ? language.coverage.status : 'Awaiting results';
    link.append(names, count);
    link.dataset.search = foldSearch([language.id, language.englishName, language.nativeName, language.meta, ...language.aliases].join(' '));
    li.append(link); (language.count > 0 ? measured : pending).append(li);
  }
}
function filterLanguagePicker() {
  const query = foldSearch($('#language-search').value.trim());
  let visible = 0;
  for (const link of $$('#language-options [data-language]')) {
    const show = !query || link.dataset.search.includes(query);
    link.closest('li').hidden = !show; if (show) visible++;
  }
  for (const group of $$('.language-option-group')) group.hidden = !group.querySelector('li:not([hidden])');
  $('#language-no-match').hidden = visible > 0;
}
function renderLanguageChoice() {
  const selected = state.editions.find(entry => entry.id === state.language) ?? {englishName:'All languages'};
  const current = $('#current-language'); current.replaceChildren();
  if (selected.nativeName) {
    const native = document.createElement('bdi'); native.lang = selected.id; native.dir = 'auto'; native.textContent = selected.nativeName; current.append(native);
  } else current.textContent = selected.englishName;
  $('#language-picker-trigger').removeAttribute('lang');
  $('#language-picker-trigger').setAttribute('aria-label', `Benchmark language: ${selected.englishName}. Choose a benchmark language`);
  for (const link of $$('#language-options [data-language]')) {
    if (link.dataset.language === state.language) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
    link.href = languageHref(link.dataset.language);
  }
}
function fixtureLink() {
  const fixture = languageGroup()?.fixture, file = fixture?.articleFile;
  // The server supplies a registry basename, never an arbitrary URL or path.
  if (hostedOnlyCoverage()) return null;
  if (fixture?.language !== state.language || typeof file !== 'string' || file.length > 255 || !/^[a-z0-9][a-z0-9._-]*\.txt$/i.test(file)) return null;
  return `${repo}/blob/main/fixtures/${encodeURIComponent(file)}`;
}
const supportCount = (value, noun) => countValue(value) === null ? `${noun[0].toUpperCase()+noun.slice(1)}s not specified` : `${value.toLocaleString('en-US')} ${noun}${value === 1 ? '' : 's'}`;
function matchesRange(value, range) {
  if (range === 'all') return true;
  if (range === 'unknown') return value === null;
  if (value === null) return false;
  return ({zero:value === 0, one:value === 1, le10:value <= 10,
    '10to50':value > 10 && value <= 50, '50to200':value > 50 && value <= 200,
    '200to1000':value > 200 && value <= 1000, gt1000:value > 1000,
    '2to5':value >= 2 && value <= 5, '6to20':value >= 6 && value <= 20, gt20:value > 20,
    '2to10':value >= 2 && value <= 10, '11to100':value >= 11 && value <= 100, gt100:value > 100})[range] ?? false;
}
function matchesCapabilities(model) {
  const language = $('#supported-language').value, codes = supportCodes(model);
  return matchesRange(weightValue(model), $('#weight-filter').value)
    && matchesRange(countValue(model.support?.languageCount), $('#language-count').value)
    && matchesRange(countValue(model.support?.voiceCount), $('#voice-count').value)
    && (language === 'all' || (language === 'unlisted' ? codes.length === 0 : codes.includes(language)));
}
function capabilitySummary(model) {
  const support = model.support ?? {}, codes = supportCodes(model), names = codes.map(languageLabel);
  const counts = `${supportCount(support.languageCount,'language')} · ${supportCount(support.voiceCount,'voice')}`;
  const compact = names.length ? names.slice(0,2).join(', ') + (names.length > 2 ? ` +${names.length-2}` : '') : 'Languages not listed';
  const full = `${counts}. ${names.length ? names.join(', ') : 'Languages not listed'}. Open model support details.`;
  return `<button class="model-capabilities" data-detail="${escape(model.id)}" title="${escape(full)}" aria-label="${escape(full)}"><span class="capability-counts">${escape(counts)}</span><span class="capability-languages">${escape(compact)}</span></button>`;
}
function fixtureDescription(language = state.language) {
  if (language === 'all') return `${state.editions.length} benchmark languages`;
  const group = languageGroup(language);
  if (hostedOnlyCoverage(language)) return languageLabel(language);
  const characters = group?.fixture?.characters ?? (language === 'en' ? 20000 : null);
  return Number.isSafeInteger(characters) && characters > 0
    ? `${characters.toLocaleString('en-US')} ${languageLabel(language)} characters`
    : `${languageLabel(language)} benchmark`;
}
// These datasets are assembled from receipt fixture language. Never infer a
// benchmark language from the model's advertised supported languages.
function activeModels(language = state.language) {
  return language === 'all' ? state.allModels : languageGroup(language)?.models ?? [];
}
function modelLink(id, edition) {
  const url = new URL(location.href);
  url.searchParams.set('model', id);
  url.searchParams.set('lang', edition);
  return url.pathname + url.search + url.hash;
}
function syncUrl({ push = false, removeModel = false } = {}) {
  const url = stateUrl(state.language, {removeModel});
  history[push ? 'pushState' : 'replaceState'](null, '', url);
}
function rebuildLanguageFilters({ license = 'all', supportedLanguage = 'all' } = {}) {
  state.cohorts.clear();
  $('#license').innerHTML = '<option value="all">All licenses</option>';
  const cohorts = [...new Map(activeModels().flatMap(model => ['warm', 'memory'].flatMap(kind => ['cpu', 'webgpu'].map(backend => model[kind][backend]))).filter(metric => metric?.origin === 'native' && metric.cohortKey && (isEligibleWarm(metric) || isEligibleMemory(metric))).map(metric => [metric.cohortKey, metric])).entries()].sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
  cohorts.forEach(([key, metric], index) => {
    const label = `C${index + 1} · ${metric.sourceCommit.slice(0, 8)} · Chrome ${chromeVersion(metric)} · ${metric.scenario === 'cached' ? 'cached RAM' : 'warm'}`;
    state.cohorts.set(key, {label, metric});
  });
  for (const value of [...new Set(activeModels().map(model => model.license.model))].sort()) {
    const option = document.createElement('option'); option.value = value; option.textContent = value; $('#license').append(option);
  }
  $('#supported-language').innerHTML = '<option value="all">Any language</option>';
  for (const code of [...new Set(activeModels().flatMap(supportCodes))].sort((a,b)=>languageLabel(a).localeCompare(languageLabel(b)))) {
    const option = document.createElement('option'); option.value = code; option.textContent = `${languageLabel(code)} (${code})`; $('#supported-language').append(option);
  }
  const unlisted = document.createElement('option'); unlisted.value = 'unlisted'; unlisted.textContent = 'Not listed'; $('#supported-language').append(unlisted);
  for (const [selector, value] of [['#license', license], ['#supported-language',supportedLanguage]]) {
    const select = $(selector);
    select.value = [...select.options].some(option => option.value === value) ? value : 'all';
  }
}
function stopPlayback({ restoreFocus = false } = {}) {
  const previous = state.playing; ++playRequest; audio.pause(); audio.removeAttribute('src'); audio.load();
  state.playing = null; $('#player').hidden = true; document.body.classList.remove('has-player'); $('#player-error').hidden = true;
  updatePlaybackButtons();
  if (restoreFocus) $$('[data-play], [data-diagnostic-play]').find(button => (button.dataset.play ?? button.dataset.diagnosticPlay) === previous?.model && (button.dataset.backend ?? previous?.backend) === previous?.backend && (button.closest('[data-edition]')?.dataset.edition ?? state.language) === previous?.language && button.getClientRects().length)?.focus();
}
function setLanguage(language, { push = true } = {}) {
  language = normalizeLanguage(language);
  if (language === state.language) { if ($('#language-picker').open) $('#language-picker').close(); $('#language-picker-trigger').focus(); return; }
  const filters = { license: $('#license').value, supportedLanguage: $('#supported-language').value };
  if (push) syncUrl();
  stopPlayback(); dialog.close(); state.language = language;
  rebuildLanguageFilters(filters); render();
  if (push) syncUrl({ push: true, removeModel: true });
  const selected = state.editions.find(entry => entry.id === state.language);
  const count = new Set(activeModels().filter(hasEligibleResult).map(model => model.id)).size;
  const status = hostedOnlyCoverage() ? 'Hosted demo available. Local benchmark results are unavailable.' : `${count} ${count === 1 ? 'model' : 'models'} have eligible results.`;
  $('#language-announcement').textContent = `Benchmark language changed to ${selected?.englishName ?? 'All languages'}. ${status}`;
  if ($('#language-picker').open) $('#language-picker').close();
  $('#language-picker-trigger').focus();
}
function restoreLocation() {
  const url = new URL(location.href), params = url.searchParams;
  if (params.has('cohort')) { params.delete('cohort'); history.replaceState(null,'',url); }
  const language = normalizeLanguage(params.get('lang'));
  if (params.has('lang') && language === 'all') { params.delete('lang'); history.replaceState(null,'',url); }
  if (language !== state.language) { stopPlayback(); state.language = language; }
  dialog.close();
  state.modelIds = params.has('models') ? [...new Set(params.getAll('models').flatMap(value => value.split(',').map(id => id.trim()).filter(Boolean)))] : null;
  $('#search').value = params.get('q') ?? '';
  state.view = params.get('view') === 'table' ? 'table' : 'charts';
  state.metric = ['generation', 'memory', 'size', 'coverage'].includes(params.get('metric')) ? params.get('metric') : 'generation';
  state.sort = ['name', 'modelMB', 'cpu', 'webgpu', 'cpuMemory', 'gpuMemory'].includes(params.get('sort')) ? params.get('sort') : 'cpu';
  state.direction = params.get('direction') === 'desc' ? -1 : 1; $('#sort-select').value = state.sort;
  rebuildLanguageFilters({license: params.get('license') ?? 'all', supportedLanguage:params.get('supports') ?? 'all'});
  for (const id of capabilityFilters.filter(id=>id!=='supported-language')) {
    const select = $(`#${id}`), value = params.get(filterParams[id]) ?? 'all';
    select.value = [...select.options].some(option=>option.value===value) ? value : 'all';
  }
  render();
  if (params.get('model')) {
    const id = params.get('model');
    const edition = language === 'all' && activeModels('en').some(model => model.id === id) ? 'en' : language;
    openDetails(id, edition);
  }
}
let theme;
try { theme = localStorage.getItem('tts-bench-theme'); } catch {}
if (!['light', 'dark'].includes(theme)) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
function setTheme(value) {
  theme = value; document.documentElement.dataset.theme = value;
  $('#theme-toggle').setAttribute('aria-pressed', String(value === 'dark'));
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${value === 'dark' ? 'light' : 'dark'} theme`);
  try { localStorage.setItem('tts-bench-theme', value); } catch {}
}
setTheme(theme);
$('#theme-toggle').addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark'));
const audio = $('#sample-audio');
const dialog = $('#details');
const languageDialog = $('#language-picker');
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
    ? `${result} Reviewed selection: ${metric.n} completed scored ${metric.n === 1 ? 'article' : 'articles'} from ${metric.originalPlannedRepetitions} planned. ${metric.stopReason}`
    : result;
};
const isMeasured = metric => metric?.status === 'measured';
const isEligibleWarm = metric => isMeasured(metric) && Number.isFinite(metric.medianSeconds) && !metric.waveform;
const isMeasuredMemory = metric => isMeasured(metric) && Number.isFinite(metric.meanMB);
const isEligibleMemory = metric => isMeasuredMemory(metric) && !metric.waveform;
const hasEligibleResult = model => ['cpu', 'webgpu'].some(backend => isEligibleWarm(model.warm[backend]) || isEligibleMemory(model.memory[backend]));
const cohortName = metric => state.cohorts.get(metric?.cohortKey)?.label ?? (metric?.origin === 'historical-import' ? 'Published receipt' : 'Unavailable');
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
  const byId = new Map();
  for (const model of activeModels()) {
    if (!byId.has(model.id) || hasEligibleResult(model)) byId.set(model.id, model);
  }
  return {
    models: state.modelIds.map(id => byId.get(id)).filter(model => model && (state.language === 'all' || hasEligibleResult(model))),
    excluded: state.language === 'all' ? [] : state.modelIds.map(id => byId.get(id)).filter(model => model && !hasEligibleResult(model)),
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
  const term = $('#search').value.trim().toLowerCase(), license = $('#license').value;
  return activeModels().filter(model => (state.language === 'all' || hasEligibleResult(model) || model.diagnosticAudio?.length) && matchesCapabilities(model) && (state.modelIds === null || state.modelIds.includes(model.id)) && (!term || `${model.name} ${model.id}`.toLowerCase().includes(term)) && (license === 'all' || model.license.model === license)).sort(compare);
}
function exampleFor(model, backend) {
  return model?.playbackAudio?.[backend];
}
function audioButtons(model) {
  const scored = ['cpu', 'webgpu'].map(backend => {
    const sample = exampleFor(model, backend);
    if (sample && matchesAuditedWav(sample.full.sha256)) {
      const accessible = `${labels[backend]} recording is waveform flagged and hidden from default playback. Open model details or the audio page diagnostic option to listen.`;
      return `<span class="metric-unavailable" title="${escape(accessible)}" aria-label="${escape(accessible)}">${labels[backend]} —</span>`;
    }
    const match = sample?.matchesSelectedWarm ? 'matches the selected warm score' : sample?.matchesSelectedMemory ? 'matches the cached memory run' : 'separate recording';
    const description = `${labels[backend]} ${sample?.scenario ?? 'published'} audio example, ${match}`;
    return sample ? `<button class="listen-button" data-play="${escape(model.id)}" data-backend="${backend}" aria-label="Play ${escape(model.name)} ${escape(description)}" title="${escape(description)}" aria-pressed="${state.playing?.clip.path === sample.clip.path && !audio.paused}"><span class="play-symbol" aria-hidden="true">▶</span> ${labels[backend]}</button>` : `<span class="metric-unavailable" title="No published ${labels[backend]} recording">${labels[backend]} —</span>`;
  }).join('');
  const diagnostic = model.diagnosticAudio?.[0];
  const diagnosticButton = diagnostic
    ? `<button class="listen-button diagnostic-listen-button" data-diagnostic-play="${escape(model.id)}" data-diagnostic-id="${escape(diagnostic.id)}" aria-label="Play ${escape(model.name)} diagnostic audio, excluded from scores" title="Diagnostic audio · excluded from scores and rankings"><span class="play-symbol" aria-hidden="true">▶</span> Diagnostic</button>`
    : '';
  return `<div class="audio-buttons">${scored}${diagnosticButton}</div>`;
}
function showWarmCounts(model) {
  return ['cpu', 'webgpu'].some(backend => {
    const score = model.warm[backend];
    return isEligibleWarm(score) && (score.n === 1 || score.selectionKind);
  });
}
function warmCountLabel(metric) {
  if (!Number.isInteger(metric?.n)) return '';
  const label = metric.selectionKind
    ? `${metric.n} selected from ${metric.originalPlannedRepetitions} planned repetitions`
    : `${metric.n} scored ${metric.n === 1 ? 'article' : 'articles'}`;
  const count = metric.selectionKind ? `n=${metric.n}/${metric.originalPlannedRepetitions} · partial` : `n=${metric.n}`;
  return `<small class="metric-count" aria-label="${escape(label)}">${escape(count)}</small>`;
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
  const href = metric?.selectionKind ? metric.selectionReportUrl : metric?.reportUrl;
  const title = metric?.selectionKind
    ? `Open reviewed selection report · ${statusDetails(metric)}`
    : `Open ${label} receipt · ${cohortName(metric)}`;
  const sampleCount = showRunCount ? warmCountLabel(metric) : '';
  return `<td data-label="${label}"><a class="value metric-link" href="${escape(href)}" title="${escape(title)}">${fmt(value)}</a>${sampleCount}${withBar ? `<div class="mini-track ${backend === 'webgpu' ? 'gpu' : ''}" aria-hidden="true"><span style="width:${max > 0 ? value / max * 100 : 0}%"></span></div>` : ''}</td>`;
}
function tableRows(models) {
  const maxTime = Math.max(1, ...models.flatMap(m => ['cpu', 'webgpu'].map(b => isEligibleWarm(m.warm[b]) ? m.warm[b].medianSeconds : 0)));
  return models.map(model => {
    const memoryOnly = !hasWarmScore(model) && hasHealthyCachedMemory(model);
    const countPair = showWarmCounts(model);

    return `<tr data-edition="${escape(model.edition ?? state.language)}" data-model="${escape(model.id)}"><td data-label="Model"><div class="model-cell"><span class="model-monogram" aria-hidden="true">${escape(model.name.slice(0, 2).toUpperCase())}</span><div><button class="model-name" data-detail="${escape(model.id)}">${escape(model.name)}</button><div class="model-sub">${memoryOnly ? '<span class="evidence-tag cached-only">RAM only · cached</span>' : ''}${outputWarningTag(model)}</div>${capabilitySummary(model)}</div></div></td><td data-label="Weights · MB"><span class="value">${fmt(model.modelMB)}</span></td><td data-label="License"><button class="license-tag" data-detail="${escape(model.id)}" title="${escape(model.license.model)}" aria-label="Model license: ${escape(model.name)}. ${escape(model.license.model)}">${escape(shortLicense(model.license.model))}</button></td>${metricCell(model.warm.cpu, 'medianSeconds', maxTime, 'cpu', 'CPU · seconds', true, countPair)}${metricCell(model.warm.webgpu, 'medianSeconds', maxTime, 'webgpu', 'GPU · seconds', true, countPair)}${metricCell(model.memory.cpu, 'meanMB', 1, 'cpu', 'Cached RAM · CPU · avg MB', false)}${metricCell(model.memory.webgpu, 'meanMB', 1, 'webgpu', 'Cached RAM · GPU · avg MB', false)}<td data-label="Listen · 30s">${audioButtons(model)}</td></tr>`;
  }).join('');
}
function renderTable(models, boards) {
  const body = $('#model-rows');
  body.innerHTML = boards ? '' : tableRows(models);
  if (boards) {
    const groups = boards.map(({edition, rows}) => {
      const status = rows.length ? '' : ` · ${edition.coverage ? 'Hosted demo' : 'Awaiting results'}`;
      return `<tbody class="edition-rows"><tr class="board-heading"><th colspan="8" scope="rowgroup">${boardHeading(edition)}${status}</th></tr>${tableRows(rows)}</tbody>`;
    });
    body.insertAdjacentHTML('afterend', groups.join(''));
  }
  $$('th[data-column]').forEach(th => {
    const active = th.dataset.column === state.sort;
    if (active) th.setAttribute('aria-sort', state.direction === 1 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort');
    th.querySelector('button > span').textContent = active ? state.direction === 1 ? '↑' : '↓' : '↕';
  });
}
function chartPanels(models) {
  const kind = state.metric, key = kind === 'generation' ? 'medianSeconds' : 'meanMB';
  const backends = kind === 'size' ? ['size'] : kind === 'coverage' ? ['languages','voices'] : ['cpu', 'webgpu'];
  const get = (model, backend) => backend === 'size' ? weightValue(model) : kind === 'coverage' ? countValue(model.support?.[backend === 'languages' ? 'languageCount' : 'voiceCount']) : model[kind === 'generation' ? 'warm' : 'memory'][backend]?.[key];
  const eligible = (model, backend) => kind === 'size' || kind === 'coverage' ? get(model,backend) !== null : kind === 'generation' ? isEligibleWarm(model.warm[backend]) : isEligibleMemory(model.memory[backend]);
  const max = Math.max(1, ...models.flatMap(m => backends.map(b => eligible(m, b) ? get(m, b) : 0)));
  const heading = state.language === 'all' ? 'h4' : 'h3';
  const units = kind === 'generation' ? 'seconds' : kind === 'coverage' ? 'supported' : 'MB';
  return backends.map(backend => {
    const panelModels = models.filter(model => eligible(model, backend)).sort((a, b) => compareValues(a, b, get(a, backend), get(b, backend), kind === 'coverage' ? -1 : 1));
    const chartRows = panelModels.map(model => {
      const value = get(model, backend);
      const metric = kind === 'size' || kind === 'coverage' ? null : model[kind === 'generation' ? 'warm' : 'memory'][backend];
      const countLabel = kind === 'generation' && showWarmCounts(model) ? warmCountLabel(metric) : '';
      const selected = kind === 'generation' && metric?.selectionKind;
      const report = selected ? metric.selectionReportUrl : metric?.reportUrl;
      const number = `${fmt(value, kind === 'coverage' ? 0 : 2)} <span class="sr-only">${units}</span>`;
      const score = report
        ? `<a class="value metric-link${selected ? ' selection-report-link' : ''}" href="${escape(report)}" title="${selected ? escape(statusDetails(metric)) : 'Open benchmark receipt'}" aria-label="${escape(model.name)} · ${labels[backend]} · ${fmt(value)} ${units} · open receipt">${number}</a>`
        : `<span class="value">${number}</span>`;
      const edition = model.edition ?? state.language;
      const sample = kind === 'generation' ? exampleFor(model, backend) : null;
      const matchingRecording = sample?.matchesSelectedWarm && sample.resultId === metric?.resultId && !matchesAuditedWav(sample.full?.sha256);
      const editionName = languageLabel(edition);
      const chartPlayLabel = `Play or pause ${model.name} ${labels[backend]} recording for the ${editionName} edition, matching the displayed warm result`;
      const chartPlayPressed = matchingRecording && sameRecording(sample, state.playing) && !audio.paused;
      const playControl = matchingRecording
        ? `<button type="button" class="chart-play-button" data-chart-play data-play="${escape(model.id)}" data-backend="${backend}" data-edition="${escape(edition)}" aria-label="${escape(chartPlayLabel)}" title="${escape(chartPlayLabel)}" aria-pressed="${chartPlayPressed}"><span class="chart-play-icon" aria-hidden="true"></span></button>`
        : '';
      return `<div class="bar-row" data-model="${escape(model.id)}"><div class="bar-label"><span class="bar-title"><button type="button" data-detail="${escape(model.id)}">${escape(model.name)}</button>${playControl}</span><span class="bar-value">${score}${countLabel}</span></div><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${value / max * 100}%"></div></div></div>`;
    }).join('');
    const context = kind === 'generation' ? 'Warm generation · seconds · lower is faster' : kind === 'memory' ? 'Chrome process RSS · cached runs · faulted audio excluded' : kind === 'coverage' ? 'Reported model support · unspecified counts excluded' : 'Verified core weights · MB';
    return `<section class="chart-panel ${kind === 'coverage' ? 'coverage' : backend === 'webgpu' ? 'gpu' : backend}" aria-label="${backend === 'size' ? 'Model size' : labels[backend]} chart"><${heading}>${backend === 'size' ? 'Model weights' : kind === 'coverage' ? labels[backend] : `<i class="key ${backend === 'cpu' ? 'cpu' : 'gpu'}"></i>${labels[backend]}`}</${heading}><p class="chart-context">${context}</p>${chartRows || '<p class="chart-empty">No eligible measurements.</p>'}</section>`;
  }).join('');
}
function boardHeading(edition) {
  return `<a href="${escape(languageHref(edition.id))}">${escape(edition.englishName)} <span aria-hidden="true">↗</span></a>`;
}
function diagnosticAudioGroup(models) {
  const rows = models.filter(model => !hasEligibleResult(model) && model.diagnosticAudio?.length);
  if (!rows.length) return '';
  const examples = rows.flatMap(model => model.diagnosticAudio.map(sample => `<li data-diagnostic-model="${escape(model.id)}">
    <button class="listen-button diagnostic-listen-button" data-diagnostic-play="${escape(model.id)}" data-diagnostic-id="${escape(sample.id)}" aria-label="Play ${escape(model.name)} diagnostic audio, excluded from rankings" title="Diagnostic audio · excluded from scores and rankings"><span class="play-symbol" aria-hidden="true">▶</span> ${escape(model.name)} · ${escape(sample.clip.seconds)}s</button>
    <span>${escape(sample.voice)} · ${escape(sample.diagnosticStatus)}</span>
  </li>`)).join('');
  return `<section class="diagnostic-audio-group" aria-label="Unranked diagnostic audio"><h4>Diagnostic audio · not ranked</h4><p>These short clips are supported-prefix examples. They do not count as full-article scores or ranking results.</p><ul>${examples}</ul></section>`;
}
function renderCharts(models, boards) {
  const kind = state.metric;
  $('#chart-order').textContent = kind === 'coverage' ? 'Reported support · broadest first' : 'Eligible results · lowest first';
  $('#charts').classList.toggle('single', kind === 'size');
  $('#charts').classList.toggle('by-edition', Boolean(boards));
  $('#charts').innerHTML = boards ? boards.map(({edition, rows}) => {
    const panels = rows.length ? `<div class="charts ${kind === 'size' ? 'single' : ''}">${chartPanels(rows)}</div>` : '';
    const missing = rows.filter(model => {
      if (kind === 'size') return weightValue(model) === null;
      if (kind === 'coverage') return countValue(model.support?.languageCount) === null && countValue(model.support?.voiceCount) === null;
      return !['cpu','webgpu'].some(backend => kind === 'generation' ? isEligibleWarm(model.warm[backend]) : isEligibleMemory(model.memory[backend]));
    });
    const unavailable = missing.length ? `<details class="missing-values"><summary>Without a published value (${missing.length})</summary>${missing.map(model => `<button data-detail="${escape(model.id)}">${escape(model.name)}</button>`).join('')}</details>` : '';
    const diagnosticExamples = kind === 'generation' ? diagnosticAudioGroup(rows) : '';
    return `<section class="edition-section" data-edition="${escape(edition.id)}"><h3>${boardHeading(edition)}</h3>${panels || `<p class="chart-empty">${edition.coverage ? 'Hosted demo available' : 'Awaiting results'}</p>`}${diagnosticExamples}${unavailable}</section>`;
  }).join('') : `${chartPanels(models)}${kind === 'generation' ? diagnosticAudioGroup(models) : ''}`;
}
function render() {
  if (!state.data) return;
  const models = visibleModels();
  renderLanguageChoice();
  $('#fixture-language').textContent = fixtureDescription();
  $('#method-fixture').textContent = state.language === 'all' ? 'each language’s benchmark article' : hostedOnlyCoverage() ? 'a local benchmark article fixture' : fixtureDescription();
  $('#language-hint').hidden = Boolean(hostedOnlyCoverage());
  const fixtureUrl = fixtureLink(), fixtureAnchor = $('#fixture-link');
  fixtureAnchor.hidden = !fixtureUrl;
  if (fixtureUrl) fixtureAnchor.href = fixtureUrl; else fixtureAnchor.removeAttribute('href');
  const overview = state.language === 'all';
  const modelCount = overview ? new Set(state.allModels.map(model => model.id)).size : activeModels().filter(hasEligibleResult).length;
  $('#language-hint').textContent = overview ? 'Results grouped by benchmark language' : 'Results use the selected article edition';
  const scoreCount = activeModels().reduce((sum, model) => sum + ['cpu', 'webgpu'].filter(backend => isEligibleWarm(model.warm[backend])).length, 0);
  $('#model-count').textContent = modelCount;
  $('#model-count-label').textContent = modelCount === 1 ? 'configuration' : 'configurations';
  $('#score-count').textContent = scoreCount;
  $('#score-count-label').textContent = scoreCount === 1 ? 'eligible timing' : 'eligible timings';
  $$('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  $$('[data-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.metric === state.metric)));
  const latest = state.language === 'en' ? state.data.updatedAt : activeModels().flatMap(model => ['warm', 'memory'].flatMap(kind => ['cpu', 'webgpu'].map(backend => model[kind][backend]?.createdAt))).filter(Boolean).sort().at(-1);
  $('#updated').textContent = latest ? `Latest receipt ${latest.slice(0, 10)} UTC` : '';
  const emptyLanguage = activeModels().filter(hasEligibleResult).length === 0;
  const hostedOnly = emptyLanguage ? hostedOnlyCoverage() : null;
  const scope = selectedModelScope();
  const filtersApplied = Boolean($('#search').value.trim() || $('#license').value !== 'all' || state.modelIds !== null || capabilityFilters.some(id=>$(`#${id}`).value!=='all'));
  $('#visible-count').hidden = !filtersApplied;
  const visibleResults = models.filter(hasEligibleResult).length;
  $('#visible-count').textContent = `${visibleResults} result${visibleResults === 1 ? '' : 's'}`;
  $('#table-view').hidden = state.view !== 'table' || models.length === 0;
  $('#charts-view').hidden = state.view !== 'charts' || models.length === 0;
  $('.sort-field').hidden = state.view !== 'table';
  $('#no-results').hidden = models.length > 0;
  const unresolvedSelection = scope !== null && scope.models.length === 0;
  $('#no-results h3').textContent = hostedOnly ? 'Kurdish Behdînî Voice' : emptyLanguage ? `No published ${languageName()} results yet.` : unresolvedSelection ? 'No recognized configurations in this subset.' : 'No models match these filters.';
  $('#no-results p').textContent = hostedOnly ? `The hosted demo offers ${hostedOnly.voiceCount} voices. Local benchmark results are unavailable.` : emptyLanguage ? 'Results will appear here when a benchmark in this language is published.' : unresolvedSelection
    ? `${scope.unknown.length ? `Unknown model IDs: ${scope.unknown.join(', ')}. ` : ''}${scope.excluded.length ? `No eligible published measurements for: ${scope.excluded.map(model => model.name).join(', ')}. ` : ''}${!scope.unknown.length && !scope.excluded.length ? 'No model IDs were selected. ' : ''}Clear the subset to see all configurations.`
    : 'Try a different name, size, language, voice count or license.';
  const hostedLink = $('#hosted-only-demo-link');
  hostedLink.hidden = !hostedOnly;
  if (hostedOnly) hostedLink.href = hostedOnly.demoUrl; else hostedLink.removeAttribute('href');
  $('#clear-filters').hidden = emptyLanguage;
  $('#clear-filters').textContent = unresolvedSelection ? 'Clear subset and filters' : 'Clear filters';
  const scopeNote = overview ? 'Each language uses its own benchmark article. Compare measurements within an edition.' : 'Lower is faster · open a model for settings, source receipts and full support details.';
  const selection = scope === null ? '' : ` <span class="evidence-tag">Subset · ${scope.models.length}</span> ${scope.models.map(model => escape(model.name)).join(', ') || 'No eligible configurations'}${scope.excluded.length ? ` · No eligible result: ${scope.excluded.map(model => escape(model.name)).join(', ')}` : ''}${scope.unknown.length ? ` · Unknown: ${scope.unknown.map(escape).join(', ')}` : ''} <button type="button" class="text-button" data-clear-model-scope>Clear subset</button>`;
  $('#scope-note').innerHTML = `${escape(scopeNote)}${selection}`;
  const boards = overview ? state.editions.map(edition => ({edition, rows:models.filter(model => model.edition === edition.id)}))
    .filter(board => board.rows.length || !filtersApplied) : null;
  for (const body of $$('.edition-rows')) body.remove();
  if (!overview || state.view === 'table') renderTable(models, boards);
  else $('#model-rows').replaceChildren();
  if (!overview || state.view === 'charts') renderCharts(models, boards);
  else $('#charts').replaceChildren();
}
function reset() { $('#search').value = ''; $('#license').value = 'all'; for (const id of capabilityFilters) $(`#${id}`).value = 'all'; state.sort = 'cpu'; state.direction = 1; $('#sort-select').value = 'cpu'; render(); syncUrl(); }
function provenance(metric) {
  if (!metric?.resultId) return '<p class="provenance">No published result for this path.</p>';
  const env = metric.environment;
  return `<p class="provenance"><a href="${escape(metric.reportUrl)}">Open full result receipt ↗</a>${metric.selectionPath ? `<br><a href="${repo}/blob/main/${escape(metric.selectionPath)}">Reviewed selection details ↗</a>` : ''}<br>${metric.origin === 'native' ? 'Native browser receipt' : 'Published receipt'} · ${metric.registration === 'current' ? 'registered files verified' : 'recorded source files'} · ${escape(metric.protocolId)}<br>${escape(env?.machineLabel ?? '')}<br>Chrome ${escape(chromeVersion(metric))} · ${escape(env?.os ?? '')}<br>${metric.sourceCommit ? `<a href="${repo}/commit/${escape(metric.sourceCommit)}">Source ${escape(metric.sourceCommit.slice(0, 8))}</a>` : 'Source recorded in receipt'} · ${escape(metric.createdAt?.slice(0, 10))} UTC${metric.pendingCurrent ? `<br>${escape(metric.pendingCurrent)}` : ''}</p>`;
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
  return `<section class="detail-card"><h4><i class="key ${backend === 'cpu' ? 'cpu' : 'gpu'}"></i> ${labels[backend]} ${warm ? 'warm generation' : 'memory diagnostic'}</h4>${metric?.selectionKind || isScheduledRetest(metric) ? `<p class="detail-note">${statusLabel(metric)}. ${escape(statusDetails(metric))}</p>` : ''}${isMeasured(metric) ? `<dl>${warm ? `<dt>${metric.n === 1 ? 'Generation time' : 'Median'}</dt><dd>${fmt(metric.medianSeconds)} s</dd>${metric.n === 1 ? '' : `<dt>Observed min–max</dt><dd>${fmt(metric.minSeconds)}–${fmt(metric.maxSeconds)} s</dd>`}<dt>Scored articles</dt><dd>${fmt(metric.n, 0)}${metric.selectionKind ? ` selected / ${fmt(metric.originalPlannedRepetitions, 0)} planned` : ''}</dd><dt>First PCM${metric.n === 1 ? '' : ' (median)'}</dt><dd>${fmt(metric.firstPcmMs)} ms</dd><dt>Real-time factor</dt><dd>${fmt(metric.rtf, 3)}</dd><dt>Audio length${metric.n === 1 ? '' : ' (median)'}</dt><dd>${fmt(metric.audioSeconds)} s</dd>` : `<dt>Mean Chrome memory</dt><dd>${fmt(metric.meanMB)} MB</dd><dt>Sampled generation peak</dt><dd>${fmt(metric.peakMB)} MB</dd><dt>Diagnostic articles</dt><dd>${fmt(metric.n, 0)}</dd><dt>Memory samples</dt><dd>${fmt(metric.sampleCount, 0)}</dd><dt>Generation time${metric.n > 1 ? ' (median)' : ''}</dt><dd>${fmt(metric.generationSeconds)} s</dd><dt>${metric.waveform ? 'PCM duration, including constant intervals' : 'Audio duration'}${metric.n > 1 ? ' (median)' : ''}</dt><dd>${fmt(metric.audioSeconds)} s</dd>`}</dl>` : `<p class="detail-note">${statusLabel(metric)}. ${escape(statusDetails(metric))}</p>`}${waveformNote(metric)}${warm ? outputNoteDetails(metric) : ''}${metric?.selectionKind && metric.pairedCachedResultId ? `<p class="detail-note">Audio comes from a <a href="${repo}/blob/main/results/${escape(metric.pairedCachedResultId)}/summary.md">separate cached recording</a>. ${metric.cachedAudioMatchesSelectedPcm ? 'Its PCM hash, frame count and sample rate match the selected warm article.' : 'It is a different recording, not the selected warm output.'}</p>` : ''}${provenance(metric)}</section>`;
}
function supertonicCoverage(model, edition) {
  const nonEnglish = Object.values(state.data.byLanguage).map(board =>
    board.models.find(model => model.id === 'supertonic-3')).filter(Boolean);
  const cpu = nonEnglish.filter(model => isEligibleWarm(model.warm.cpu)).length;
  const pending = model.warm.cpu?.status === 'unavailable' && !model.warm.cpu.resultId
    ? `The CPU timing for ${escape(languageLabel(edition))} is pending. ` : '';
  return `<p class="detail-note">${pending}The first multilingual campaign measured WebGPU. One-thread WebAssembly CPU timings are available for ${cpu} of ${nonEnglish.length} non-English editions. <a href="./assets/supertonic-3-non-english.tsv?v=${siteVersion}" download="supertonic-3-non-english.tsv">Download CPU and WebGPU rounds, memory and recordings (TSV)</a></p>`;
}
function openDetails(id, language = state.language) {
  const model = activeModels(language).find(m => m.id === id); if (!model) return;
  const edition = model.edition ?? language;
  $('#detail-content').dataset.edition = edition;
  const samples = ['cpu', 'webgpu'].map(b => exampleFor(model, b)).filter(Boolean);
  const audioList = samples.map(sample => {
    const diagnostic = matchesAuditedWav(sample.full.sha256);
    const playAction = diagnostic
      ? `<a href="./audio/?sample=${encodeURIComponent(sample.clip.path.split('/').at(-1))}">Open diagnostic recording ↗</a>`
      : `<button class="listen-button" data-play="${escape(model.id)}" data-backend="${sample.backend}">▶ ${labels[sample.backend]} · ${fmt(sample.clip.seconds, 0)} seconds</button>`;
    const relation = sample.matchesSelectedWarm ? ' · matches the selected warm receipt' : sample.matchesSelectedMemory ? ' · matches the selected memory receipt' : ' · example from a separate receipt';
    return `<li>${playAction}<p>${escape(sample.voice)} · ${escape(sample.language)} · ${escape(sample.scenario)} recording${relation}${diagnostic ? ' · waveform flagged; diagnostic playback only' : ''}</p><p>${escape(sample.attribution ?? '')}</p><p>Model terms: ${escape(sample.modelTerms ?? model.license.model)}</p>${sample.full?.url ? `<a href="${escape(sample.full.url)}">Full WAV ↗</a>` : ''}<a href="${escape(sample.reportUrl)}">Recording receipt ↗</a></li>`;
  }).join('') || '<li>No published recording.</li>';
  const diagnosticAudio = (model.diagnosticAudio ?? []).map(sample => `<li class="diagnostic-recording">
      <p><strong>Diagnostic only · excluded from scores and rankings</strong></p>
      <audio controls preload="none" src="./${escape(sample.clip.path)}" aria-label="${escape(model.name)} diagnostic audio"></audio>
      <p>${escape(sample.voice)} · ${escape(sample.language)} · ${escape(sample.diagnosticStatus)}</p>
      <p>${escape(sample.attribution)} Model terms: ${escape(sample.modelTerms)}</p>
      <a href="${escape(sample.smokeReceiptUrl)}">Three-span smoke receipt ↗</a>
      <a href="${escape(sample.fullAttemptReceiptUrl)}">Failed full-article receipt ↗</a>
    </li>`).join('');
  $('#detail-content').innerHTML = `<h2 id="detail-title">${escape(model.name)}</h2>
    <p class="detail-subtitle">Model capabilities and published browser measurements</p>
    <div class="detail-stats"><div class="detail-stat"><strong>${fmt(model.modelMB)}</strong><span>MB · core weights</span></div><div class="detail-stat"><strong>${countValue(model.support?.voiceCount) === null ? 'Not specified' : fmt(model.support.voiceCount, 0)}</strong><span>supported voices</span></div><div class="detail-stat"><strong>${countValue(model.support?.languageCount) === null ? 'Not specified' : fmt(model.support.languageCount, 0)}</strong><span>supported languages</span></div></div>
    <h3>Supported languages</h3><p class="detail-language-list">${supportCodes(model).length ? supportCodes(model).map(code=>`${escape(languageLabel(code))} <span class="mono">(${escape(code)})</span>`).join(' · ') : 'Languages not listed'}</p>
    <p class="detail-note">Bundled voices: ${countValue(model.support?.bundledVoiceCount,0) === null ? 'Not specified' : fmt(model.support.bundledVoiceCount,0)}. ${escape(model.support?.scope)} ${escape(model.support?.notes)} ${escape(languageLabel(edition))} and one selected voice are benchmarked.</p>
    <h3>Warm generation · ${escape(fixtureDescription(edition))}</h3>${id === 'supertonic-3' && edition !== 'en' ? supertonicCoverage(model, edition) : ''}<div class="detail-grid">${['cpu', 'webgpu'].map(b => detailMetric(model.warm[b], b, 'warm')).join('')}</div>
    <p class="detail-note">First PCM measures generated audio availability, not audible playback. Real-time factor = generation time / audio duration; lower is faster. Exact voice, precision, settings, warm-up and power conditions are recorded in each receipt.</p>
    <h3>Average memory · separate resource diagnostics</h3><div class="detail-grid">${['cpu', 'webgpu'].map(b => detailMetric(model.memory[b], b, 'memory')).join('')}</div>
    <p class="detail-note">One isolated Chrome instance with one benchmark tab, sampled during generation. Process RSS includes workers and browser baseline; shared pages may be counted more than once. Mean RAM is not a minimum hardware requirement. Sampled peaks can miss brief spikes. These diagnostics have their own source and timing.</p>
    <h3>Licenses</h3><dl class="detail-license"><dt>Model weights</dt><dd>${escape(model.license.model)}</dd><dt>Runtime / code</dt><dd>${escape(model.license.code ?? 'Not specified in the pinned catalog')}</dd></dl>
    <p class="detail-note">The model license does not cover every component or determine output rights. See the upstream terms and <a href="${repo}/blob/main/docs/LICENSING.md">license inventory</a>.</p>
    <h3>Audio examples</h3><ul class="recording-list">${audioList}</ul>
    ${diagnosticAudio ? `<h3>Diagnostic audio</h3><ul class="recording-list">${diagnosticAudio}</ul>` : ''}
    <div class="detail-bottom">${model.sourceUrl ? `<a href="${escape(model.sourceUrl)}">Model source ↗</a>` : ''}<a href="${escape(modelLink(model.id, edition))}">Link to this model ↗</a><a href="./audio/">Browse all recordings ↗</a></div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function sameRecording(a, b) {
  return Boolean(a && b && a.clip?.path === b.clip?.path && (a.diagnosticOnly && b.diagnosticOnly ? a.id === b.id : a.resultId === b.resultId)
    && a.language === b.language && a.backend === b.backend);
}
function updatePlaybackButtons() {
  $$('[data-play]').forEach(button => {
    const edition = button.dataset.edition || button.closest('[data-edition]')?.dataset.edition || state.language;
    const m = activeModels(edition).find(m => m.id === button.dataset.play);
    const sample = exampleFor(m, button.dataset.backend);
    button.setAttribute('aria-pressed', String(sameRecording(sample, state.playing) && !audio.paused));
  });
  $$('[data-diagnostic-play]').forEach(button => {
    const edition = button.closest('[data-edition]')?.dataset.edition || state.language;
    const model = activeModels(edition).find(item => item.id === button.dataset.diagnosticPlay);
    const sample = model?.diagnosticAudio?.find(item => item.id === button.dataset.diagnosticId);
    button.setAttribute('aria-pressed', String(sameRecording(sample, state.playing) && !audio.paused));
  });
}
async function play(id, backend, edition = state.language, diagnosticId = null) {
  const model = activeModels(edition).find(m => m.id === id);
  const sample = diagnosticId ? (model?.diagnosticAudio ?? []).find(item => item.id === diagnosticId) : exampleFor(model, backend);
  if (!sample) return;
  const request = ++playRequest;
  const same = sameRecording(state.playing, sample);
  $('#player').hidden = false; document.body.classList.add('has-player'); $('#player-error').hidden = true;
  if (same && !audio.paused) { audio.pause(); return; }
  state.playing = sample;
  if (!same) { audio.src = new URL(sample.clip.path, document.baseURI).href; }
  $('#player-title').textContent = `${model.name} · ${sample.diagnosticOnly ? 'Diagnostic audio' : labels[backend]}${state.language === 'all' ? ' · '+languageLabel(edition) : ''}`;
  $('#player-tag').textContent = `${sample.clip.seconds}-SECOND AUDIO EXAMPLE`;
  $('#player-caption').textContent = sample.diagnosticOnly
    ? `${sample.voice} · ${sample.diagnosticStatus}`
    : `${sample.voice} · ${sample.matchesSelectedWarm ? 'selected warm receipt' : `${sample.scenario} recording · separate receipt`}`;
  $('#player-caption').classList.toggle('has-playback-notice', Boolean(sample.playbackNotice));
  if (sample.playbackNotice) {
    $('#player-caption').textContent += ' · ' + sample.playbackNotice;
    audio.setAttribute('controlslist', 'nodownload');
  } else {
    audio.removeAttribute('controlslist');
  }
  $('#player-full').hidden = !sample.full?.url;
  if (sample.full?.url) $('#player-full').href = sample.full.url;
  else $('#player-full').removeAttribute('href');
  $('#player-error').textContent = sample.full?.url ? 'Playback failed. Try opening the full WAV.' : 'Playback failed.';
  $('#player-receipt').href = sample.diagnosticOnly ? sample.smokeReceiptUrl : sample.reportUrl;
  $('#player-details').dataset.edition = edition;
  $('#player-details').dataset.detail = model.id;
  try { await audio.play(); } catch { if (request === playRequest) $('#player-error').hidden = false; }
  if (request === playRequest) updatePlaybackButtons();
}
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, updatePlaybackButtons);
audio.addEventListener('error', () => { if (state.playing) $('#player-error').hidden = false; });
$('#close-player').addEventListener('click', () => stopPlayback({restoreFocus: true}));
$('#close-details').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
document.addEventListener('click', event => {
  const language = event.target.closest('a[data-language]');
  if (language) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setLanguage(language.dataset.language); return;
  }
  const clearModelScopeButton = event.target.closest('[data-clear-model-scope]');
  if (clearModelScopeButton) { clearModelScope(); render(); syncUrl(); return; }
  const detail = event.target.closest('[data-detail]'); if (detail) openDetails(detail.dataset.detail, detail.closest('[data-edition]')?.dataset.edition);
  const playButton = event.target.closest('[data-play]'); if (playButton) play(playButton.dataset.play, playButton.dataset.backend, playButton.closest('[data-edition]')?.dataset.edition);
  const diagnosticButton = event.target.closest('[data-diagnostic-play]'); if (diagnosticButton) play(diagnosticButton.dataset.diagnosticPlay, 'cpu', diagnosticButton.closest('[data-edition]')?.dataset.edition, diagnosticButton.dataset.diagnosticId);
  const view = event.target.closest('[data-view]'); if (view) { state.view = view.dataset.view; render(); syncUrl(); }
  const metric = event.target.closest('[data-metric]'); if (metric) { state.metric = metric.dataset.metric; render(); syncUrl(); }
  const sort = event.target.closest('[data-sort]'); if (sort) { state.direction = state.sort === sort.dataset.sort ? -state.direction : 1; state.sort = sort.dataset.sort; $('#sort-select').value = state.sort; render(); syncUrl(); }
});
$('#search').addEventListener('input', () => { render(); syncUrl(); });
$('#license').addEventListener('change', () => { render(); syncUrl(); });
for (const id of capabilityFilters) $(`#${id}`).addEventListener('change',()=>{ render(); syncUrl(); });
$('#sort-select').addEventListener('change', () => {state.sort = $('#sort-select').value; state.direction = 1; render(); syncUrl();});
$('#reset').addEventListener('click', reset);
$('#clear-filters').addEventListener('click', clearNoResults);
$('#language-picker-trigger').addEventListener('click', () => {
  if (languageDialog.open) return;
  renderLanguageChoice(); $('#language-search').value = ''; filterLanguagePicker(); languageDialog.showModal();
  if (matchMedia('(pointer: fine)').matches) $('#language-search').focus();
  else $('#close-language-picker').focus();
});
$('#close-language-picker').addEventListener('click', () => languageDialog.close());
$('#language-search').addEventListener('input', filterLanguagePicker);
$('#language-search').addEventListener('keydown', event => {
  if (event.key === 'Escape' && languageDialog.open) { event.preventDefault(); languageDialog.close(); }
});
languageDialog.addEventListener('close', () => $('#language-picker-trigger').focus());
languageDialog.addEventListener('click', event => {
  if (event.target === languageDialog) {
    const box = languageDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) languageDialog.close();
  }
});
window.addEventListener('popstate', () => { if (state.data) restoreLocation(); });
try {
  const response = await fetch(`./assets/data.json?v=${siteVersion}`); if (!response.ok) throw new Error(`Data HTTP ${response.status}`);
  state.data = await response.json();
  if (state.data.schemaVersion !== 1 || !Array.isArray(state.data.models)) throw new Error('Unsupported dashboard data');
  state.editions = registeredLanguages();
  state.allModels = state.editions.flatMap(edition => activeModels(edition.id)
    .map(model => ({...model, edition:edition.id})));
  buildLanguagePicker();
  restoreLocation();
  $('#language-picker-trigger').disabled = false;
} catch (error) { $('#load-error').hidden = false; $('#table-view').hidden = true; $('#updated').textContent = 'Results unavailable'; console.error('Dashboard failed:', error); }
