import {matchesAuditedWav, waveformFinding, waveformReport} from './waveform-integrity.mjs?v=__TTS_BENCH_SITE_VERSION__';
import {recordingUrl} from './links.mjs?v=__TTS_BENCH_SITE_VERSION__';
import {listeningCatalog} from './catalog.mjs?v=__TTS_BENCH_SITE_VERSION__';

const siteVersion = '__TTS_BENCH_SITE_VERSION__';

const modelSelect = document.querySelector('#model');
const backendSelect = document.querySelector('#backend');
const includeDiagnostic = document.querySelector('#include-diagnostic');
const diagnosticCount = document.querySelector('#diagnostic-count');
const showAllButton = document.querySelector('#show-all');
const sampleList = document.querySelector('#samples');
const status = document.querySelector('#status');
const repo = 'https://github.com/ngelik/tts-bench/blob/main/';

function link(text, url) {
  const anchor = document.createElement('a');
  anchor.textContent = text;
  anchor.href = url;
  return anchor;
}

function shortName(url) {
  try { return new URL(url).hostname; } catch { return 'Source'; }
}

try {
  const response = await fetch(`../assets/data.json?v=${siteVersion}`);
  if (!response.ok) throw new Error('Published audio data unavailable');
  const catalog = await response.json();
  const {models, entries, selectedEntries} = listeningCatalog(catalog);
  const selectedPaths = new Set(selectedEntries.map(entry => entry.clip.path));
  const diagnosticEntries = entries.filter(entry => matchesAuditedWav(entry.full.sha256));
  const diagnosticPaths = new Set(diagnosticEntries.map(entry => entry.clip.path));
  let selectedPath = new URL(location.href).searchParams.get('sample');
  let showAll = new URL(location.href).searchParams.get('all') === '1';
  const params = new URL(location.href).searchParams;

  for (const model of new Map(models.map(row => [row.id, row])).values()) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    modelSelect.append(option);
  }

  const requested = selectedPath
    ? entries.find(entry => entry.clip.path.split('/').at(-1) === selectedPath)
    : null;
  if (requested) {
    modelSelect.value = requested.model;
    backendSelect.value = requested.backend;
    if (diagnosticPaths.has(requested.clip.path)) includeDiagnostic.checked = true;
  } else if (selectedPath) {
    selectedPath = null;
    status.textContent = 'That clip was not found. Showing selected examples.';
  }
  if (params.get('diagnostic') === '1') includeDiagnostic.checked = true;

  diagnosticCount.textContent = diagnosticEntries.length ? `(${diagnosticEntries.length})` : '';

  function updateUrl() {
    const url = new URL(location.href);
    if (selectedPath) url.searchParams.set('sample', selectedPath);
    else url.searchParams.delete('sample');
    if (showAll) url.searchParams.set('all', '1');
    else url.searchParams.delete('all');
    if (includeDiagnostic.checked) url.searchParams.set('diagnostic', '1');
    else url.searchParams.delete('diagnostic');
    history.replaceState(null, '', url);
  }

  function evidenceDetails(entry) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Voice, source & receipt';
    details.append(summary);
    const evidence = document.createElement('div');
    evidence.className = 'evidence-links';
    if (entry.full?.url) evidence.append(link('Full article WAV', entry.full.url));
    evidence.append(link('Run receipt', entry.reportUrl ?? `${repo}results/${encodeURIComponent(entry.resultId)}/summary.md`));
    evidence.append(link('Link to this clip', recordingUrl(entry, `${location.origin}${location.pathname}`)));
    if (matchesAuditedWav(entry.full.sha256)) evidence.append(link('Waveform audit', waveformReport));
    for (const sourceUrl of entry.sourceUrls ?? []) evidence.append(link(shortName(sourceUrl), sourceUrl));
    details.append(evidence);
    const attribution = document.createElement('div');
    attribution.className = 'audio-attribution';
    attribution.textContent = `${entry.voice} · ${entry.attribution} Model terms: ${entry.modelTerms}`;
    details.append(attribution);
    return details;
  }

  function recordingCard(entry) {
    if (!/^audio\/samples\/[a-z0-9._-]+\.wav$/.test(entry.clip.path) ||
        (entry.full?.url != null && !entry.full.url.startsWith('https://github.com/ngelik/tts-bench/releases/download/'))) {
      throw new Error('Unexpected recording URL');
    }
    const card = document.createElement('article');
    card.className = 'audio-card';
    card.dataset.sample = entry.clip.path.split('/').at(-1);
    card.dataset.model = entry.model;
    card.dataset.backend = entry.backend;
    const heading = document.createElement('h2');
    heading.textContent = `${entry.name ?? models.find(item => item.id === entry.model)?.name ?? entry.model} · ${entry.backend === 'cpu' ? 'CPU' : 'GPU'}`;
    const meta = document.createElement('p');
    meta.className = 'audio-meta';
    const relation = entry.matchesSelectedWarm ? 'selected timing run' : entry.matchesSelectedMemory ? 'selected RAM run' : 'separate run';
    const sourceType = entry.scenario === 'cached' ? 'Cached audio' : 'Warm audio';
    meta.textContent = `${new Intl.DisplayNames(['en'], {type: 'language'}).of(entry.language)} · ${sourceType} · repetition ${entry.trialIndex} · ${relation}`;
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = `../${entry.clip.path}`;
    audio.setAttribute('aria-label', `${heading.textContent} audio sample`);
    audio.addEventListener('play', () => sampleList.querySelectorAll('audio').forEach(other => {
      if (other !== audio) other.pause();
    }));
    card.append(heading, meta);
    if (entry.playbackNotice) {
      const notice = document.createElement('p');
      notice.className = 'playback-notice';
      notice.textContent = entry.playbackNotice;
      audio.setAttribute('controlslist', 'nodownload');
      card.append(notice);
    }
    card.append(audio, evidenceDetails(entry));
    if (diagnosticPaths.has(entry.clip.path)) {
      const note = document.createElement('p');
      note.className = 'diagnostic-note';
      note.textContent = `Diagnostic clip · ${waveformFinding}`;
      card.append(note);
    }
    return card;
  }

  function render() {
    sampleList.replaceChildren();
    const sourceEntries = selectedPath
      ? entries
      : showAll ? entries : selectedEntries.filter(entry => selectedPaths.has(entry.clip.path));
    const filtered = sourceEntries.filter(entry =>
      (!selectedPath || entry.clip.path.split('/').at(-1) === selectedPath) &&
      (!modelSelect.value || entry.model === modelSelect.value) &&
      (!backendSelect.value || entry.backend === backendSelect.value));
    const hiddenDiagnostics = filtered.filter(entry => diagnosticPaths.has(entry.clip.path)).length;
    const visible = filtered.filter(entry => includeDiagnostic.checked || !diagnosticPaths.has(entry.clip.path));
    if (visible.length) {
      for (const entry of visible) sampleList.append(recordingCard(entry));
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h2');
      heading.textContent = 'No audio examples here';
      const note = document.createElement('p');
      note.textContent = hiddenDiagnostics ? 'A waveform-flagged clip is hidden. Enable diagnostic clips to inspect it.' : 'Try a different model or backend.';
      empty.append(heading, note);
      sampleList.append(empty);
    }
    const total = entries.length;
    const label = selectedPath ? 'selected clip' : showAll ? 'published clips' : 'selected examples';
    status.textContent = `${visible.length} ${label}${visible.length === 1 ? '' : ' shown'} · ${total} clips published${hiddenDiagnostics && !includeDiagnostic.checked ? ` · ${hiddenDiagnostics} waveform-flagged hidden` : ''}.`;
    showAllButton.textContent = showAll ? 'Show selected examples' : `Show all ${total} clips`;
    showAllButton.setAttribute('aria-pressed', String(showAll));
  }

  function filtersChanged() {
    selectedPath = null;
    updateUrl();
    render();
  }

  modelSelect.addEventListener('change', filtersChanged);
  backendSelect.addEventListener('change', filtersChanged);
  includeDiagnostic.addEventListener('change', filtersChanged);
  showAllButton.addEventListener('click', () => { showAll = !showAll; filtersChanged(); });
  render();
} catch (error) {
  sampleList.textContent = 'Unable to load published audio. Reload this page or open the benchmark results linked above.';
  status.textContent = 'Playback unavailable.';
  console.error(error);
}
