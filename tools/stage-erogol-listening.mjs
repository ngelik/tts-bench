// Stage the published Linux comparison outside the M1 Pro reference leaderboard.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const digest = 'd2c0c4178b9619c4e0343be8f02de644a305aeef18750ff811bb0f9e0b9dde1a';
const archiveUrl = 'https://github.com/ngelik/tts-bench/releases/download/small-tts-families-chrome-cpu-2026-11-17/listen-and-compare.zip';
const cache = resolve('.cache/erogol-listening');
const archive = resolve(cache, digest + '.zip');
const target = resolve('.cache/listening-site/diagnostics/erogol-small-tts');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

let bytes;
try {
  bytes = await readFile(archive);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!bytes || sha256(bytes) !== digest) {
  const response = await fetch(archiveUrl, {signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`Listening comparison download returned HTTP ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== digest) throw new Error('Listening comparison does not match the published ZIP digest');
  await mkdir(cache, {recursive: true});
  await writeFile(archive, bytes);
}

await mkdir(target, {recursive: true});
if (process.platform === 'win32') {
  execFileSync('tar.exe', ['-xf', archive, '-C', target]);
} else {
  execFileSync('unzip', ['-qo', archive, '-d', target]);
}
console.log('Staged five verified hosted Chrome articles at diagnostics/erogol-small-tts/');
