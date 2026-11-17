import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const resumeSource = await readFile(join(projectRoot, 'docs/campaigns/nov14-english/remaining.mjs'), 'utf8');

async function resumeSandbox(t) {
  const root = await mkdtemp(join(tmpdir(), 'tts-campaign-resume-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['docs/campaigns/nov14-english', 'lib', 'tools', 'runs/campaign']) {
    await mkdir(join(root, directory), { recursive: true });
  }
  await writeFile(join(root, 'docs/campaigns/nov14-english/remaining.mjs'), resumeSource);
  await writeFile(join(root, 'lib/campaign-plan.mjs'), await readFile(join(projectRoot, 'lib/campaign-plan.mjs')));
  await writeFile(join(root, 'lib/benchmark-policy.mjs'), await readFile(join(projectRoot, 'lib/benchmark-policy.mjs')));
  await writeFile(join(root, 'lib/model-parameters.mjs'), await readFile(join(projectRoot, 'lib/model-parameters.mjs')));
  await writeFile(join(root, 'lib/model-parameters.json'), await readFile(join(projectRoot, 'lib/model-parameters.json')));
  await writeFile(join(root, 'tools/results.mjs'), `
import { readFile } from 'node:fs/promises';
export async function readResult(path) { return JSON.parse(await readFile(path, 'utf8')); }
`);
  await writeFile(join(root, 'tools/provenance.mjs'), 'export function verifySource() {}\n');
  await writeFile(join(root, 'source.txt'), 'test source\n');
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', 'Campaign Resume Test']);
  git(['config', 'user.email', 'campaign-resume@example.invalid']);
  git(['add', '.']);
  git(['commit', '-q', '-m', 'fixture']);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const requestedCell = { model: 'fun-cosyvoice3-0.5b-2512', backend: 'cpu', scenario: 'warm', repetitions: 5 };
  const effectiveCell = { ...requestedCell, repetitions: 1 };
  const planPath = join(root, 'campaign-plan.json');
  const ledgerPath = join(root, 'runs/campaign/attempts.jsonl');
  const receiptPath = 'runs/receipt-1/result.json';
  await mkdir(join(root, 'runs/receipt-1'), { recursive: true });
  await writeFile(planPath, JSON.stringify({ schemaVersion: 1, sourceCommit: commit, cells: [requestedCell] }));
  await writeFile(ledgerPath, JSON.stringify({ commit, requestedCell, cell: effectiveCell, exitCode: 0,
    reviewError: null, resultId: 'receipt-1', resultPath: receiptPath }) + '\n');
  return { root, commit, planPath, ledgerPath, receiptPath };
}

function invoke({ root, planPath, ledgerPath }) {
  return spawnSync(process.execPath, ['docs/campaigns/nov14-english/remaining.mjs', planPath, ledgerPath], {
    cwd: root, encoding: 'utf8', timeout: 10_000,
  });
}

test('campaign resume rejects a successful receipt for a different model or backend', async t => {
  const sandbox = await resumeSandbox(t);
  const makeReceipt = (model, backendRequested) => ({
    id: 'receipt-1', source: { gitCommit: sandbox.commit },
    protocol: { id: 'browser-tts-warm-v1', scenario: 'warm', repetitions: 1, smoke: false, warmupRuns: 1, networkMbps: null },
    cells: [{ model, backendRequested, status: 'measured', trials: [] }],
  });
  const resultPath = join(sandbox.root, sandbox.receiptPath);

  await writeFile(resultPath, JSON.stringify(makeReceipt('ming-3.0-tts-0.5b-gguf', 'cpu')));
  const wrongModel = invoke(sandbox);
  assert.notEqual(wrongModel.status, 0);
  assert.match(wrongModel.stderr, /Receipt model does not match the scheduled campaign cell/);

  await writeFile(resultPath, JSON.stringify(makeReceipt('fun-cosyvoice3-0.5b-2512', 'webgpu')));
  const wrongBackend = invoke(sandbox);
  assert.notEqual(wrongBackend.status, 0);
  assert.match(wrongBackend.stderr, /Receipt backend does not match the scheduled campaign cell/);
});
