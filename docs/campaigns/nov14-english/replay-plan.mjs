// Emit a new-current-source plan derived from the frozen original plan.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectiveCampaignCell } from '../../../lib/campaign-plan.mjs';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const planPath = resolve(directory, 'plan.json');
const raw = await readFile(planPath);
const plan = JSON.parse(raw);
const root = resolve(directory, '../../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
if (git('status', '--porcelain')) throw new Error('Generate a replay plan from a clean committed source.');
if (!/^[a-f0-9]{40}$/.test(plan.sourceCommit ?? '')) throw new Error('Frozen plan must pin its original source commit.');
const replay = {
  schemaVersion: 1,
  sourceCommit,
  replayOf: {
    path: 'docs/campaigns/nov14-english/plan.json',
    sourceCommit: plan.sourceCommit,
    sha256: createHash('sha256').update(raw).digest('hex'),
  },
  conditions: `${String(plan.conditions ?? '')} Replayed against current committed registrations, so this is a new source cohort. New CosyVoice3 scored cells use one article.`,
  cells: plan.cells.map(effectiveCampaignCell),
};
process.stdout.write(JSON.stringify(replay, null, 2) + '\n');
