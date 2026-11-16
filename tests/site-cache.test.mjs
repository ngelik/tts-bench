import test from 'node:test';
import assert from 'node:assert/strict';
import {siteVersion, stampSiteVersion, SITE_VERSION_TOKEN} from '../lib/site-cache.mjs';

const sha = value => value.repeat(64);

test('site cache identity is deterministic and covers paths and bytes', () => {
  const files = [
    {path:'assets/app.mjs', sha256:sha('a')},
    {path:'assets/data.json', sha256:sha('b')},
  ];
  const expected = siteVersion(files);
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(siteVersion([...files].reverse()), expected);
  assert.notEqual(siteVersion([{...files[0], path:'assets/other.mjs'}, files[1]]), expected);
  assert.notEqual(siteVersion([{...files[0], sha256:sha('c')}, files[1]]), expected);
});

test('site cache identity rejects ambiguous files and invalid digests', () => {
  assert.throws(() => siteVersion([{path:'assets/app.mjs', sha256:sha('a')},{path:'assets/app.mjs', sha256:sha('b')}]), /Duplicate/);
  assert.throws(() => siteVersion([{path:'../app.mjs', sha256:sha('a')}]), /invalid relative path/);
  assert.throws(() => siteVersion([{path:'assets/app.mjs', sha256:'abc'}]), /Invalid SHA-256/);
  assert.throws(() => siteVersion([]), /at least one file/);
});

test('deployment version stamping replaces the shared URL token', () => {
  const version = siteVersion([{path:'index.html', sha256:sha('f')}]);
  assert.equal(stampSiteVersion(`app.mjs?v=${SITE_VERSION_TOKEN}`, version), `app.mjs?v=${version}`);
  assert.throws(() => stampSiteVersion('x', 'not-a-digest'), /full SHA-256/);
});
