import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { restoreRuntimeNotices } from '../tools/restore-runtime-notices.mjs';

const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url)));
test('historical notices restore only their exact pinned bytes and preserve source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tts-notice-replay-'));
  try {
    for (const model of ['sopro-v2-turbo', 'tiny-voca']) {
      const raw = JSON.stringify({ models: { [model]: lock.models[model] } });
      await writeFile(join(root, 'assets.lock.json'), raw);
      const restored = await restoreRuntimeNotices(root, model);
      assert.equal(restored.length, 2);
      for (const item of restored) {
        const bytes = await readFile(join(root, '.cache/public', item.target));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
      }
      assert.deepEqual(await restoreRuntimeNotices(root, model), restored);
      assert.equal(await readFile(join(root, 'assets.lock.json'), 'utf8'), raw);
    }
    const model = structuredClone(lock.models['tiny-voca']);
    model.runtime.files.find(a => a.target.includes('/ThirdPartyNotices.txt')).sha256 = '0'.repeat(64);
    await writeFile(join(root, 'assets.lock.json'), JSON.stringify({ models: { altered: model } }));
    await assert.rejects(restoreRuntimeNotices(root, 'altered'), /byte-identical/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('historical notice restoration refuses cache paths escaping through symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tts-notice-symlink-'));
  const outside = await mkdtemp(join(tmpdir(), 'tts-notice-outside-'));
  try {
    await writeFile(join(root, 'assets.lock.json'), JSON.stringify({ models: { tiny: lock.models['tiny-voca'] } }));
    await mkdir(join(root, '.cache'));
    await symlink(outside, join(root, '.cache/public'), 'dir');
    await assert.rejects(restoreRuntimeNotices(root, 'tiny'), /outside/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
