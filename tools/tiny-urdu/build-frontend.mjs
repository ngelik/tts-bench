import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const modelRevision = '4fe6566118972ea0d44b517f413191e0e30f5880';
const sourceRevision = '5770756e05f33591eab29498a47f6644664beae7';
const sourceUrl = `https://raw.githubusercontent.com/Zafar205/tiny-urdu/${sourceRevision}/web/lib/urdu.ts`;
const target = new URL(`../../.cache/public/models/tiny-urdu/${modelRevision}/${sourceRevision}/frontend/`, import.meta.url);
const [providedSource, ...extra] = process.argv.slice(2);
if (extra.length) throw new Error('Usage: node tools/tiny-urdu/build-frontend.mjs [pinned-source.ts]');

async function downloadSource() {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Cannot download pinned Tiny Urdu frontend (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

function verify(bytes, expectedHash, label) {
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== 12843 || hash !== expectedHash) {
    throw new Error(`${label} did not match the pinned digest and size. The verified build used Node v22.22.3.`);
  }
}

const source = providedSource ? await readFile(providedSource) : await downloadSource();
verify(source, '92fac4d08fdb5b0c219e6972c0a79e4467dbc238396e57ada353c1ab878b870d', 'Publisher TypeScript');
const text = new TextDecoder('utf-8', { fatal: true }).decode(source);
const compiled = Buffer.from(stripTypeScriptTypes(text, { mode: 'strip' }), 'utf8');
verify(compiled, 'f054aeba85685000a13af39dd40b4f4683ff9730b24c462270c98f84bd6369dc', 'Browser frontend');

await mkdir(target, { recursive: true });
for (const [name, bytes] of [['urdu.ts', source], ['urdu.mjs', compiled]]) {
  const temporary = new URL(`${name}.${process.pid}.tmp`, target);
  await writeFile(temporary, bytes);
  await rename(temporary, new URL(name, target));
}
console.log('Verified and staged the pinned Tiny Urdu browser frontend.');
