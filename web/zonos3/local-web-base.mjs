export function resolveZonos3WebBase(configuredBase, localOrigin) {
  if (typeof localOrigin !== 'string' || !localOrigin || localOrigin === 'null') {
    throw new Error('ZONOS3 WebGPU assets require a same-origin browser origin.');
  }

  let origin;
  try {
    origin = new URL(localOrigin);
  } catch {
    throw new Error('ZONOS3 WebGPU assets require a valid browser origin.');
  }
  if (origin.origin !== localOrigin || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('ZONOS3 WebGPU asset origin must be an origin without a path, query, or fragment.');
  }

  let base;
  try {
    base = new URL(configuredBase, origin);
  } catch {
    throw new Error('ZONOS3 WebGPU asset base must be a valid URL.');
  }
  if (base.origin !== origin.origin) {
    throw new Error('ZONOS3 WebGPU asset base must remain on the browser origin.');
  }
  if (!base.pathname.endsWith('/') || base.search || base.hash) {
    throw new Error('ZONOS3 WebGPU asset base must have a trailing slash and no query or fragment.');
  }
  return base.href;
}
