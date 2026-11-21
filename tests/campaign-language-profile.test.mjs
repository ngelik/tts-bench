import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('campaign refuses a non-English fixture when only family support, not the frontend profile, declares it', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tts-campaign-language-profile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ['tools', 'lib', 'fixtures']) await mkdir(join(root, directory), { recursive: true });

  await copyFile(join(projectRoot, 'tools/run-campaign.mjs'), join(root, 'tools/run-campaign.mjs'));
  for (const file of ['campaign-plan.mjs', 'benchmark-policy.mjs', 'benchmark-fixtures.mjs']) {
    await copyFile(join(projectRoot, 'lib', file), join(root, 'lib', file));
  }
  await copyFile(join(projectRoot, 'fixtures/registry.json'), join(root, 'fixtures/registry.json'));
  await writeFile(join(root, 'lib/catalog.mjs'), `
    export function getModel(id) {
      if (id !== 'broad-family-model') throw new Error('Unknown model: ' + id);
      return { id, support: { languages: ['en', 'uk'] } };
    }
  `);
  await writeFile(join(root, 'lib/model-parameters.mjs'), 'export function getModelParameters() { return null; }\n');
  const plan = {
    schemaVersion: 1,
    fixtureId: 'uk-article-v1',
    cells: [{ model: 'broad-family-model', backend: 'cpu', scenario: 'cached', repetitions: 1 }],
  };
  const planPath = join(root, 'plan.json');
  await writeFile(planPath, JSON.stringify(plan));

  const run = spawnSync(process.execPath, ['tools/run-campaign.mjs', '--plan', planPath, '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /frontend profile \[en\] does not accept fixture language uk/);
  await assert.rejects(readdir(join(root, 'runs')), error => error.code === 'ENOENT');
});
