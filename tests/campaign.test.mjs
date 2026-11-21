import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCampaignCell } from '../lib/campaign-plan.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const runnerSource = await readFile(join(projectRoot, 'tools/run-campaign.mjs'), 'utf8');

const catalogStub = `
export function getModel(id) {
  if (id === 'ua-serhiy-0p58m') return { id, support: { languages: ['uk'] } };
  if (['one', 'two', 'large', 'exact', 'below', 'fun-cosyvoice3-0.5b-2512'].includes(id)) return { id, support: null };
  throw new Error('Unknown model: ' + id);
}
`;

const modelParametersStub = `
export function getModelParameters(id) {
  const parameterCount = { large: 1_000_000_001, exact: 1_000_000_000, below: 999_999_999 }[id];
  return parameterCount === undefined ? null : { parameterCount };
}
`;

const benchStub = `
import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const arg = flag => args[args.indexOf(flag) + 1];
const model = arg('--model');
const backend = arg('--backend');
const scenario = arg('--scenario');
const warmProtocol = args.includes('--warm-protocol') ? arg('--warm-protocol') : null;
const requestedRepetitions = Number(arg('--repetitions'));
const repetitions = warmProtocol === 'v2' && model === 'large' ? 1 : requestedRepetitions;
const protocolId = warmProtocol === 'v2' ? 'browser-tts-warm-v2' : 'browser-tts-' + scenario + '-v1' + (args.includes('--resources') ? '-resources' : '');
const fixtureId = arg('--fixture');
const note = arg('--note');
const events = process.env.CAMPAIGN_TEST_EVENTS;
await appendFile(events, JSON.stringify({ event: 'start', model, backend, scenario, repetitions, requestedRepetitions, warmProtocol: warmProtocol ?? null }) + '\\n');
await new Promise(resolve => setTimeout(resolve, 15));

const failure = model === process.env.CAMPAIGN_TEST_FAIL_MODEL;
if (failure) {
  await appendFile(events, JSON.stringify({ event: 'end', model, exitCode: 17 }) + '\\n');
  process.exit(17);
}

const id = 'stub-' + model + '-' + backend;
const result = 'runs/' + id + '/result.json';
const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await mkdir(join('runs', id), { recursive: true });
const registry = JSON.parse(await readFile('fixtures/registry.json', 'utf8'));
const registeredFixture = registry.fixtures.find(item => item.id === fixtureId);
if (!registeredFixture) throw new Error('Test fixture is not registered: ' + fixtureId);
const fixture = {
  id: registeredFixture.id,
  sha256: registeredFixture.sha256,
  characters: registeredFixture.characters,
  chunks: registeredFixture.chunks,
  ...(registeredFixture.language === 'en' ? {} : {
    language: registeredFixture.language,
    unicodeCodePoints: registeredFixture.unicodeCodePoints,
    utf8Bytes: registeredFixture.utf8Bytes,
    source: registeredFixture.source,
  }),
};
const settings = {language: registeredFixture.language};
const receipt = {
  id,
  status: 'measured',
  source: { gitCommit, dirty: false },
  protocol: { id: process.env.CAMPAIGN_TEST_PROTOCOL_MISMATCH ?? protocolId, smoke: false, scenario, repetitions, warmupRuns: scenario === 'warm' ? 1 : 0 },
  fixture,
  cells: [{ status: 'measured', settings, trials: [] }],
  notes: [note],
};
await writeFile(result, JSON.stringify(receipt) + '\\n');
await appendFile(events, JSON.stringify({ event: 'end', model, exitCode: 0 }) + '\\n');
process.stdout.write(JSON.stringify({ id, status: 'measured', result }) + '\\n');
`;

async function sandbox(t, plan, { failModel, dirty = false, extraFixtures = [], extraModelFrontendLanguages = {} } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'tts-campaign-runner-test-'));
  const events = join(tmpdir(), `tts-campaign-events-${process.pid}-${Math.random().toString(16).slice(2)}.jsonl`);
  await writeFile(events, '');
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
    await rm(events, { force: true });
  });

  await mkdir(join(directory, 'tools'), { recursive: true });
  await mkdir(join(directory, 'lib'), { recursive: true });
  await mkdir(join(directory, 'bin'), { recursive: true });
  await mkdir(join(directory, 'fixtures'), { recursive: true });
  await writeFile(join(directory, 'tools/run-campaign.mjs'), runnerSource);
  await writeFile(join(directory, 'lib/catalog.mjs'), catalogStub);
  await writeFile(join(directory, 'lib/model-parameters.mjs'), modelParametersStub);
  await copyFile(join(projectRoot, 'lib/campaign-plan.mjs'), join(directory, 'lib/campaign-plan.mjs'));
  await copyFile(join(projectRoot, 'lib/benchmark-policy.mjs'), join(directory, 'lib/benchmark-policy.mjs'));
  await copyFile(join(projectRoot, 'lib/benchmark-fixtures.mjs'), join(directory, 'lib/benchmark-fixtures.mjs'));
  const registry = JSON.parse(await readFile(join(projectRoot, 'fixtures/registry.json'), 'utf8'));
  registry.fixtures.push(...extraFixtures);
  registry.modelFrontendLanguages = {...registry.modelFrontendLanguages, ...extraModelFrontendLanguages};
  await writeFile(join(directory, 'fixtures/registry.json'), JSON.stringify(registry, null, 2) + '\n');
  await writeFile(join(directory, 'bin/bench.mjs'), benchStub);
  await writeFile(join(directory, '.gitignore'), 'runs/\n');
  await writeFile(join(directory, 'source.txt'), 'committed source\n');
  await writeFile(join(directory, 'campaign-plan.json'), JSON.stringify(plan));

  const git = (args) => execFileSync('git', args, { cwd: directory, stdio: 'ignore' });
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', 'Campaign Test']);
  git(['config', 'user.email', 'campaign-test@example.invalid']);
  git(['add', '.']);
  git(['commit', '-q', '-m', 'fixture']);
  if (dirty) await writeFile(join(directory, 'source.txt'), 'dirty source\n');
  return { directory, events };
}

function invoke(directory, events, failModel, planPath = 'campaign-plan.json', extraEnv = {}) {
  return spawnSync(process.execPath, [
    'tools/run-campaign.mjs', '--plan', planPath,
    '--machine', 'Test machine', '--accept-license',
  ], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      CAMPAIGN_TEST_EVENTS: events,
      ...extraEnv,
      ...(failModel ? { CAMPAIGN_TEST_FAIL_MODEL: failModel } : {}),
    },
  });
}

function invokeDryRun(directory, events, planPath = 'campaign-plan.json') {
  return spawnSync(process.execPath, ['tools/run-campaign.mjs', '--plan', planPath, '--dry-run'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10_000,
    env: { ...process.env, CAMPAIGN_TEST_EVENTS: events },
  });
}

async function writeExternalPlan(t, events, value) {
  const path = `${events}.plan.json`;
  await writeFile(path, JSON.stringify(value));
  t.after(async () => rm(path, { force: true }));
  return path;
}

async function campaignDirectory(root) {
  const names = (await readdir(join(root, 'runs'))).filter(name => name.startsWith('campaign-'));
  assert.equal(names.length, 1, 'expected one campaign ledger directory');
  return join(root, 'runs', names[0]);
}

async function eventRows(path) {
  const raw = await readFile(path, 'utf8');
  return raw.trim() ? raw.trim().split('\n').map(line => JSON.parse(line)) : [];
}

const cell = (model, backend = 'cpu', scenario = 'cached', repetitions = 1, extra = {}) => ({
  model, backend, scenario, repetitions, ...extra,
});
const plan = cells => ({ schemaVersion: 1, conditions: 'isolated test campaign', cells });

test('campaign runner waits for each child before starting the next cell and records result IDs', async t => {
  const { directory, events } = await sandbox(t, plan([
    cell('one', 'cpu'),
    cell('two', 'webgpu'),
  ]));

  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.model]), [
    ['start', 'one'], ['end', 'one'], ['start', 'two'], ['end', 'two'],
  ]);

  const ledger = await campaignDirectory(directory);
  const attempts = (await readFile(join(ledger, 'attempts.jsonl'), 'utf8'))
    .trim().split('\n').map(line => JSON.parse(line));
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts.map(row => row.cell.model), ['one', 'two']);
  assert.deepEqual(attempts.map(row => row.resultId), ['stub-one-cpu', 'stub-two-webgpu']);
});

test('Ukrainian model defaults to its required fixture and records exact Unicode identity', async t => {
  const { directory, events } = await sandbox(t, plan([cell('ua-serhiy-0p58m')]));
  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  const ledger = await campaignDirectory(directory);
  const effectivePlan = JSON.parse(await readFile(join(ledger, 'effective-plan.json'), 'utf8'));
  assert.equal(effectivePlan.fixtureId, 'uk-article-v1');
  const attempt = JSON.parse((await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim());
  assert.equal(attempt.fixtureId, 'uk-article-v1');
  const receipt = JSON.parse(await readFile(join(directory, attempt.resultPath), 'utf8'));
  assert.deepEqual(receipt.fixture, {
    id: 'uk-article-v1', language: 'uk', sha256: '542130c28a312d8e29d4ab7615280bcb661d8c1d8f74e8f2d9c298e4eaceff40',
    characters: 19980, unicodeCodePoints: 19980, utf8Bytes: 36364, chunks: 92,
    source: { type: 'translation', description: 'AI-assisted Ukrainian translation of the complete English benchmark fixture; no independent human review is claimed.', sourceFixtureId: 'english-20k-v1', sourceSha256: '4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b', sourceLanguage: 'en' },
  });
});

test('campaign runner accepts a third registered language and records its exact fixture identity', async t => {
  const frenchFixture = {
    id:'fr-article-v1', smokeId:'fr-article-smoke-v1', language:'fr', articleFile:'fr-article-v1.txt',
    chunksFile:'fr-article-v1.chunks.json', metadataFile:'fr-article-v1.meta.json', sha256:'f'.repeat(64),
    characters:1200, unicodeCodePoints:1200, utf8Bytes:1320, chunks:7,
    source:{type:'translation', description:'Private campaign test fixture.', sourceFixtureId:'english-20k-v1',
      sourceSha256:'4cd173ad03d14ba96df6eb1e58b193c0c796032c114cfb954838b5150651eb0b', sourceLanguage:'en'},
  };
  const { directory, events } = await sandbox(t, {...plan([cell('one')]), fixtureId:frenchFixture.id}, {
    extraFixtures:[frenchFixture], extraModelFrontendLanguages:{one:['en','fr']},
  });
  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  const ledger = await campaignDirectory(directory);
  const effectivePlan = JSON.parse(await readFile(join(ledger, 'effective-plan.json'), 'utf8'));
  const attempt = JSON.parse((await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim());
  const receipt = JSON.parse(await readFile(join(directory, attempt.resultPath), 'utf8'));
  assert.equal(effectivePlan.fixtureId, frenchFixture.id);
  assert.equal(attempt.fixtureId, frenchFixture.id);
  assert.deepEqual(receipt.fixture, {
    id:frenchFixture.id, language:'fr', sha256:frenchFixture.sha256, characters:frenchFixture.characters,
    unicodeCodePoints:frenchFixture.unicodeCodePoints, utf8Bytes:frenchFixture.utf8Bytes,
    chunks:frenchFixture.chunks, source:frenchFixture.source,
  });
});

test('campaign rejects an explicit English fixture for the Ukrainian-only model', async t => {
  const { directory, events } = await sandbox(t, { ...plan([cell('ua-serhiy-0p58m')]), fixtureId: 'english-20k-v1' });
  const run = invoke(directory, events);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /requires campaign fixture uk-article-v1/);
  assert.deepEqual(await eventRows(events), []);
});

test('campaign runner accepts a sourceCommit pin matching the clean checkout', async t => {
  const { directory, events } = await sandbox(t, plan([cell('one')]));
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  const planPath = await writeExternalPlan(t, events, { ...plan([cell('one')]), sourceCommit });

  const run = invoke(directory, events, undefined, planPath);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.model]), [
    ['start', 'one'], ['end', 'one'],
  ]);
  const ledger = await campaignDirectory(directory);
  const storedPlan = JSON.parse(await readFile(join(ledger, 'plan.json'), 'utf8'));
  assert.equal(storedPlan.sourceCommit, sourceCommit);
});

test('campaign runner rejects a mismatched sourceCommit pin before creating output or spawning a child', async t => {
  const { directory, events } = await sandbox(t, plan([cell('one')]));
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  const wrongCommit = sourceCommit[0] === '0' ? '1'.repeat(40) : '0'.repeat(40);
  const planPath = await writeExternalPlan(t, events, { ...plan([cell('one')]), sourceCommit: wrongCommit });

  const run = invoke(directory, events, undefined, planPath);
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /sourceCommit .* does not match current HEAD/i);
  assert.deepEqual(await eventRows(events), []);
  await assert.rejects(readdir(join(directory, 'runs')), error => error.code === 'ENOENT');
});

test('campaign runner rejects a malformed sourceCommit pin before spawning a child', async t => {
  const { directory, events } = await sandbox(t, plan([cell('one')]));
  const planPath = await writeExternalPlan(t, events, { ...plan([cell('one')]), sourceCommit: 'not-a-commit' });

  const run = invoke(directory, events, undefined, planPath);
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /Invalid campaign sourceCommit pin/);
  assert.deepEqual(await eventRows(events), []);
  await assert.rejects(readdir(join(directory, 'runs')), error => error.code === 'ENOENT');
});

test('campaign runner stops after the first child failure and retains its failed attempt', async t => {
  const { directory, events } = await sandbox(t, plan([
    cell('one'),
    cell('two'),
  ]));

  const run = invoke(directory, events, 'one');
  assert.notEqual(run.status, 0);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.model]), [
    ['start', 'one'], ['end', 'one'],
  ]);

  const ledger = await campaignDirectory(directory);
  const attempts = (await readFile(join(ledger, 'attempts.jsonl'), 'utf8'))
    .trim().split('\n').map(line => JSON.parse(line));
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].cell.model, 'one');
  assert.equal(attempts[0].exitCode, 17);
});

test('campaign runner rejects dirty source before spawning a child', async t => {
  const { directory, events } = await sandbox(t, plan([cell('one')]), { dirty: true });

  const run = invoke(directory, events);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /same clean committed source/i);
  assert.deepEqual(await eventRows(events), []);
});

test('campaign runner rejects warm plans with fewer than five repetitions before spawning a child', async t => {
  const { directory, events } = await sandbox(t, plan([cell('one', 'cpu', 'warm', 4)]));

  const run = invoke(directory, events);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Invalid campaign repetitions/);
  assert.deepEqual(await eventRows(events), []);
});

test('CosyVoice3 legacy warm plans dry-run with requested and effective counts', async t => {
  const model = 'fun-cosyvoice3-0.5b-2512';
  const legacy = { ...plan([cell(model, 'cpu', 'warm', 5)]), sourceCommit: 'a'.repeat(40) };
  const { directory, events } = await sandbox(t, legacy);
  const run = invokeDryRun(directory, events);
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.deepEqual(result.cells.map(row => [row.requestedRepetitions, row.effectiveRepetitions]), [[5, 1]]);
  assert.equal(result.sourceCommitMatches, false);
  assert.deepEqual(await eventRows(events), []);
  await assert.rejects(readdir(join(directory, 'runs')), error => error.code === 'ENOENT');
});

test('hand-authored mixed plans normalize only warm cells above one billion parameters', async t => {
  const source = plan([
    cell('large', 'cpu', 'warm', 5),
    cell('exact', 'webgpu', 'warm', 5),
    cell('below', 'cpu', 'warm', 5),
    cell('large', 'webgpu', 'cached', 3),
  ]);
  const { directory, events } = await sandbox(t, source);
  assert.doesNotThrow(() => validateCampaignCell(cell('ming-3.0-tts-0.5b-fusor-mix-cpu', 'cpu', 'warm', 1)));
  assert.throws(() => validateCampaignCell(cell('tiny-voca', 'cpu', 'warm', 1)), /Invalid campaign repetitions/);

  const run = invokeDryRun(directory, events);
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.deepEqual(result.cells.map(row => [row.requestedRepetitions, row.effectiveRepetitions]), [
    [5, 1], [5, 5], [5, 5], [3, 3],
  ]);
  assert.deepEqual(await eventRows(events), []);
  await assert.rejects(readdir(join(directory, 'runs')), error => error.code === 'ENOENT');
});

test('warm v2 campaign dry-run and execution preserve protocol and reject a mismatched receipt', async t => {
  const warmV2 = plan([
    cell('one', 'cpu', 'warm', 3, { warmProtocol: 'v2' }),
    cell('large', 'webgpu', 'warm', 3, { warmProtocol: 'v2' }),
  ]);
  const { directory, events } = await sandbox(t, warmV2);
  const preview = invokeDryRun(directory, events);
  assert.equal(preview.status, 0, preview.stderr);
  const effective = JSON.parse(preview.stdout);
  assert.deepEqual(effective.cells.map(row => [row.protocolId, row.requestedRepetitions, row.effectiveRepetitions]), [
    ['browser-tts-warm-v2', 3, 3],
    ['browser-tts-warm-v2', 3, 1],
  ]);
  assert.deepEqual(await eventRows(events), []);

  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).filter(row => row.event === 'start').map(row => [row.repetitions, row.requestedRepetitions, row.warmProtocol]), [
    [3, 3, 'v2'], [1, 3, 'v2'],
  ]);
  const ledger = await campaignDirectory(directory);
  const attempts = (await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const largeReceipt = JSON.parse(await readFile(join(directory, attempts[1].resultPath), 'utf8'));
  assert.equal(largeReceipt.protocol.id, 'browser-tts-warm-v2');
  assert.equal(largeReceipt.protocol.repetitions, 1);

  const mismatch = await sandbox(t, warmV2);
  const rejected = invoke(mismatch.directory, mismatch.events, undefined, 'campaign-plan.json', {
    CAMPAIGN_TEST_PROTOCOL_MISMATCH: 'browser-tts-warm-v1',
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /protocol.*does not match/i);
  assert.equal((await eventRows(mismatch.events)).filter(row => row.event === 'start').length, 1);
});

test('legacy large-model campaign rejects a v2 receipt with the same effective single count', async t => {
  const { directory, events } = await sandbox(t, plan([cell('large', 'cpu', 'warm', 5)]));
  const rejected = invoke(directory, events, undefined, 'campaign-plan.json', {
    CAMPAIGN_TEST_PROTOCOL_MISMATCH: 'browser-tts-warm-v2',
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /protocol.*does not match/i);
  const start = (await eventRows(events)).find(row => row.event === 'start');
  assert.deepEqual([start.repetitions, start.requestedRepetitions, start.warmProtocol], [1, 1, null]);
});

test('large-model campaign receipt preserves original requested and effective counts', async t => {
  const source = plan([
    cell('large', 'cpu', 'warm', 5),
    cell('below', 'webgpu', 'warm', 5),
    cell('large', 'webgpu', 'cached', 3),
  ]);
  const { directory, events } = await sandbox(t, source);
  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).filter(row => row.event === 'start').map(row => [row.model, row.scenario, row.repetitions]), [
    ['large', 'warm', 1], ['below', 'warm', 5], ['large', 'cached', 3],
  ]);

  const ledger = await campaignDirectory(directory);
  assert.deepEqual(JSON.parse(await readFile(join(ledger, 'plan.json'), 'utf8')), source);
  assert.deepEqual(JSON.parse(await readFile(join(ledger, 'effective-plan.json'), 'utf8')).cells.map(item => item.repetitions), [1, 5, 3]);
  const attempts = (await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(attempts.map(attempt => [attempt.requestedCell.repetitions, attempt.cell.repetitions]), [[5, 1], [5, 5], [3, 3]]);

  const receipt = JSON.parse(await readFile(join(directory, attempts[0].resultPath), 'utf8'));
  assert.equal(receipt.protocol.repetitions, 1, 'The receipt protocol records the actual scored repetition count');
  assert.ok(receipt.notes.some(note => note.includes('requested n=5; effective n=1')), 'The receipt preserves both the hand-authored and effective plan counts');
});

test('CosyVoice3 campaign executes one scored article and records both plan counts', async t => {
  const model = 'fun-cosyvoice3-0.5b-2512';
  const original = plan([cell(model, 'webgpu', 'warm', 5)]);
  const { directory, events } = await sandbox(t, original);
  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.repetitions]), [['start', 1], ['end', undefined]]);
  const ledger = await campaignDirectory(directory);
  assert.deepEqual(JSON.parse(await readFile(join(ledger, 'plan.json'), 'utf8')), original);
  assert.equal(JSON.parse(await readFile(join(ledger, 'effective-plan.json'), 'utf8')).cells[0].repetitions, 1);
  const attempt = JSON.parse((await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim());
  assert.equal(attempt.requestedCell.repetitions, 5);
  assert.equal(attempt.cell.repetitions, 1);
});

test('CosyVoice3 cached campaign plans also execute one scored article', async t => {
  const model = 'fun-cosyvoice3-0.5b-2512';
  const { directory, events } = await sandbox(t, plan([cell(model, 'cpu', 'cached', 3)]));
  const run = invoke(directory, events);
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.repetitions]), [['start', 1], ['end', undefined]]);
  const ledger = await campaignDirectory(directory);
  const attempt = JSON.parse((await readFile(join(ledger, 'attempts.jsonl'), 'utf8')).trim());
  assert.equal(attempt.requestedCell.repetitions, 3);
  assert.equal(attempt.cell.repetitions, 1);
});

test('campaign runner stops when a resource cell lacks measured generation-RAM evidence', async t => {
  const { directory, events } = await sandbox(t, plan([
    cell('one', 'cpu', 'cached', 1, { resources: true }),
    cell('two'),
  ]));

  const run = invoke(directory, events);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Generation RAM was not sufficiently sampled/);
  assert.deepEqual((await eventRows(events)).map(row => [row.event, row.model]), [
    ['start', 'one'], ['end', 'one'],
  ]);

  const ledger = await campaignDirectory(directory);
  const attempts = (await readFile(join(ledger, 'attempts.jsonl'), 'utf8'))
    .trim().split('\n').map(line => JSON.parse(line));
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].resultId, 'stub-one-cpu');
  assert.match(attempts[0].reviewError, /Generation RAM/);
});
