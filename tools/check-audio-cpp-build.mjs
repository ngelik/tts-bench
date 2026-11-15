import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const [directory, ...privatePaths] = process.argv.slice(2);
if (!directory) throw new Error('Usage: node tools/check-audio-cpp-build.mjs DIRECTORY [LOCAL_PATH ...]');
const lock = JSON.parse(await readFile(new URL('../assets.lock.json', import.meta.url)));
const model = lock.models['ming-3.0-tts-0.5b-gguf'];
const release = model.runtime.version;
const files = model.assets.filter(asset => asset.target.startsWith(`runtimes/${release}/`));
const expectedNames = ['THIRD-PARTY-NOTICES.txt', 'bench_browser.js', 'bench_browser.wasm'];
if (files.map(asset => basename(asset.target)).sort().join() !== expectedNames.join()) {
  throw new Error(`Incomplete Ming runtime registration for ${release}`);
}
for (const asset of files) {
  const name = basename(asset.target);
  const data = await readFile(resolve(directory, name));
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (name !== 'THIRD-PARTY-NOTICES.txt') {
    const forbidden = ['/Users/', '/private/tmp/', '/private/var/folders/', ...privatePaths.map(path => resolve(path))];
    // Emscripten initializes the virtual web_user home directory in MEMFS.
    const content = data.toString('latin1');
    if (forbidden.some(prefix => content.includes(prefix)) || /\/home\/(?!web_user\b)/u.test(content)) {
      throw new Error(`${name} embeds an absolute local build path`);
    }
  }
  if (data.length !== asset.bytes || sha256 !== asset.sha256) {
    throw new Error(`${name} differs from ${release}: ${data.length} bytes, SHA-256 ${sha256} (expected ${asset.bytes}, ${asset.sha256})`);
  }
  console.log(`${name}  ${data.length} bytes  ${sha256}`);
}
