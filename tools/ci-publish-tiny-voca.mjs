import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeCampaignReport } from './campaign-report.mjs';

const id = process.env.TINY_VOCA_ID;
const backend = process.env.TINY_VOCA_BACKEND;
const input = process.env.TINY_VOCA_INPUT;
const wav = process.env.TINY_VOCA_WAV;
const scoreSource = '6ad6b9f4f062c77514e1fc8da4254327b2cf2e59';
const reportName = 'tiny-voca-english';
const model = 'tiny-voca';
// Re-render after the original WAV became available as a verified release asset.
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });

if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(id ?? '') || !['cpu', 'webgpu'].includes(backend) || !input || !wav) {
  throw new Error('Invalid temporary publication inputs');
}
const receipt = JSON.parse(await readFile(input, 'utf8'));
const cell = receipt.cells?.[0];
const trial = cell?.trials?.[0];
if (receipt.id !== id || receipt.origin !== 'native' || receipt.source?.gitCommit !== scoreSource || receipt.source?.dirty !== false ||
    receipt.fixture?.characters !== 20000 || receipt.fixture?.chunks !== 93 || receipt.protocol?.scenario !== 'cached' || receipt.protocol?.smoke !== false ||
    cell?.model !== model || cell.backendRequested !== backend || cell.status !== 'measured' || receipt.protocol?.repetitions !== 1 ||
    cell.trials?.length !== 1 || trial?.memory?.availability !== 'measured' ||
    (backend === 'webgpu' && cell.capability?.gpuDispatchVerified !== true)) {
  throw new Error('Input is not the expected full measured Tiny Voca cached result');
}

const runDir = resolve('runs', id);
await mkdir(runDir, { recursive: true });
const runReceipt = resolve(runDir, 'result.json');
await writeFile(runReceipt, JSON.stringify(receipt, null, 2) + '\n');
run(process.execPath, ['tools/submit.mjs', runReceipt]);
run(process.execPath, ['tools/audio.mjs', 'add', '--result', `results/${id}/result.json`, '--wav', wav,
                       '--model', model, '--backend', backend]);

const reportDir = resolve('reports', reportName);
let resultIds = [id];
try {
  const previous = JSON.parse(await readFile(resolve(reportDir, 'inputs.json'), 'utf8'));
  resultIds = [...new Set([...previous.results.map(row => row.id), id])];
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeCampaignReport(`reports/${reportName}`,
                          resultIds.map(resultId => `results/${resultId}/result.json`));

const campaignReadme = resolve('docs/campaigns', reportName, 'README.md');
let campaignText = await readFile(campaignReadme, 'utf8');
const startMarker = '<!-- tiny-voca-outcomes:start -->';
const endMarker = '<!-- tiny-voca-outcomes:end -->';
const outcome = new Map();
for (const resultId of resultIds) {
  const result = JSON.parse(await readFile(resolve('results', resultId, 'result.json'), 'utf8'));
  const resultCell = result.cells[0];
  outcome.set(`${resultCell.backendRequested}/${result.protocol.scenario}`, { id: resultId, status: resultCell.status });
}
const plan = JSON.parse(await readFile(resolve('docs/campaigns', reportName, 'plan.json'), 'utf8'));
const rows = ['| Backend | Scenario | Current outcome | Evidence |', '|---|---|---|---|'];
for (const planned of plan.cells) {
  const existing = outcome.get(`${planned.backend}/${planned.scenario}`);
  if (existing) {
    const label = existing.status === 'measured' ? 'Measured' : `No score: ${existing.status}`;
    rows.push(`| ${planned.backend} | ${planned.scenario} | ${label} | [Native receipt](../../../results/${existing.id}/summary.md) |`);
  } else rows.push(`| ${planned.backend} | ${planned.scenario} | Pending | Not submitted |`);
}
const warmReady = ['cpu', 'webgpu'].every(backendName => outcome.get(`${backendName}/warm`)?.status === 'measured');
const block = `## Published native outcomes\n\nThis table updates as each completed full cell is independently submitted. Pending cells have not produced a public result. A no-score status is preserved as recorded and is never treated as a timing value. Cached RSS and warm timing remain separate.\n\n${rows.join('\n')}\n\n${warmReady ? 'A paired warm comparison is available in [Reference results](../../../README.md#reference-results) only after both CPU and WebGPU warm cells are measured and validated.' : 'No CPU/WebGPU warm speed comparison is published until both warm cells are measured and validated.'}\n`;
if (campaignText.includes(startMarker) && campaignText.includes(endMarker)) {
  const start = campaignText.indexOf(startMarker);
  const end = campaignText.indexOf(endMarker);
  if (start < 0 || end < start || campaignText.indexOf(startMarker, start + 1) >= 0 || campaignText.indexOf(endMarker, end + 1) >= 0) {
    throw new Error('Campaign outcome markers are malformed');
  }
  campaignText = campaignText.slice(0, start + startMarker.length) + '\n' + block + '\n' + campaignText.slice(end);
} else {
  const insertion = '## Reproduce\n';
  if (campaignText.split(insertion).length !== 2) throw new Error('Campaign README insertion point changed');
  campaignText = campaignText.replace(insertion, `${startMarker}\n${block}${endMarker}\n\n${insertion}`);
}
await writeFile(campaignReadme, campaignText);
run(process.execPath, ['tools/reference.mjs']);
run(process.execPath, ['tools/compare.mjs', '--check', 'comparisons']);
run(process.execPath, ['tools/campaign-report.mjs', '--check', `reports/${reportName}`]);
run(process.execPath, ['tools/reference.mjs', '--check']);
run(process.execPath, ['tools/audio.mjs', 'check']);
// Remove temporary source/input files from the staged publication index.
run('git', ['rm', '-f', '.github/workflows/temp-tiny-voca-publish.yml', 'tools/ci-publish-tiny-voca.mjs', input]);
run('git', ['add', 'README.md', 'docs/reference-memory.svg', campaignReadme, `reports/${reportName}`,
             'audio/manifest.json', `audio/samples/${id}--${model}--${backend}.wav`, `results/${id}`]);
run(process.execPath, ['tools/publication-check.mjs']);
run(process.execPath, ['tools/build-listening-site.mjs']);
console.log(JSON.stringify({ id, model, backend, scoreSource, resultIds, generatedAt: new Date().toISOString() }, null, 2));
