export const UA_SERHIY_SOURCE_REVISION = '1abd585d725a787b405c28a59ce1cbdfd34780bb';
const MODEL_PREFIX = `/models/ua-serhiy-0p58m/${UA_SERHIY_SOURCE_REVISION}/`;
const HEX_SHA256 = /^[a-f0-9]{64}$/u;

/** Keep dynamic imports and asset requests inside this model's pinned local closure. */
export function uaSerhiyLocalUrl(value, baseUrl) {
  let base, url;
  try {
    base = new URL(baseUrl);
    url = new URL(value, base);
  } catch {
    throw new Error('Ukrainian Serhiy asset URL is invalid.');
  }
  const inPinnedModel = url.pathname.startsWith(MODEL_PREFIX);
  const inRuntime = url.pathname.startsWith('/runtimes/');
  if (url.origin !== base.origin || (!inPinnedModel && !inRuntime) ||
      url.username || url.password || url.search || url.hash) {
    throw new Error(`Ukrainian Serhiy refused an asset URL outside its pinned local closure: ${url.href}`);
  }
  return url.href;
}

/** Fetch and verify one pinned byte stream without requiring a Cache Storage write. */
export async function fetchVerifiedUaSerhiyAsset(asset, {
  baseUrl,
  fetchImpl = globalThis.fetch.bind(globalThis),
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (!asset || typeof asset.url !== 'string' || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 ||
      !HEX_SHA256.test(asset.sha256 ?? '')) {
    throw new Error('Ukrainian Serhiy asset needs a pinned URL, byte count and SHA-256.');
  }
  if (typeof fetchImpl !== 'function' || !cryptoImpl?.subtle?.digest) {
    throw new Error('Ukrainian Serhiy asset verification needs fetch and Web Crypto.');
  }
  const url = uaSerhiyLocalUrl(asset.url, baseUrl);
  const response = await fetchImpl(url, { cache: 'default', credentials: 'same-origin', redirect: 'error' });
  if (!response?.ok) throw new Error(`Ukrainian Serhiy asset request returned HTTP ${response?.status ?? 'unknown'}.`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== asset.bytes) {
    throw new Error(`Ukrainian Serhiy asset has ${bytes.byteLength} bytes; expected ${asset.bytes}.`);
  }
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== asset.sha256) throw new Error('Ukrainian Serhiy asset SHA-256 mismatch.');
  return bytes;
}
