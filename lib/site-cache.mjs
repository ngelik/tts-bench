import {createHash} from 'node:crypto';

export const SITE_VERSION_TOKEN = '__TTS_BENCH_SITE_VERSION__';

export function siteVersion(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new TypeError('Site identity requires at least one file');
  const seen = new Set();
  const sorted = [...entries].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const hash = createHash('sha256').update('tts-bench-pages-v1\0');
  for (const entry of sorted) {
    if (!entry || typeof entry.path !== 'string' || !entry.path || entry.path.startsWith('/') || entry.path.split('/').includes('..')) {
      throw new TypeError('Site identity contains an invalid relative path');
    }
    if (seen.has(entry.path)) throw new TypeError(`Duplicate site identity path: ${entry.path}`);
    seen.add(entry.path);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) throw new TypeError(`Invalid SHA-256 for ${entry.path}`);
    const path = Buffer.from(entry.path);
    hash.update(String(path.length)).update(':').update(path).update(Buffer.from(entry.sha256, 'hex'));
  }
  return hash.digest('hex');
}

export function stampSiteVersion(text, version) {
  if (!/^[a-f0-9]{64}$/.test(version)) throw new TypeError('Site version must be a full SHA-256 digest');
  return String(text).replaceAll(SITE_VERSION_TOKEN, version);
}
