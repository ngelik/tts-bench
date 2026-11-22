// Local model files can exceed Chrome's per-entry HTTP cache limit.
// An explicit versioned cache also survives reopening the benchmark tab offline.
export async function fetchModelAsset(input, revision, { bufferBeforeCache = false } = {}) {
  const url = new URL(input, self.location.href);
  if (url.origin !== self.location.origin || !/^\/(models|runtimes)\//.test(url.pathname)) {
    throw new Error('Assets must come from a local model or runtime directory');
  }
  if (!/^[a-f0-9]{40,64}$/.test(revision)) throw new Error('A pinned model revision is required');

  const cache = await caches.open('tts-model-assets-v1-' + revision);
  const cached = await cache.match(url.href);
  if (cached) return cached;
  const response = await fetch(url.href);
  if (!response.ok) throw new Error('Model asset request returned ' + response.status + ' for ' + url.pathname);
  // Most adapters cache the response stream directly. A few Chrome builds
  // reject large local streamed responses with a generic Cache.put network
  // error; those callers can buffer once and cache a reconstructed response.
  if (bufferBeforeCache) {
    const body = await response.arrayBuffer();
    const cachedResponse = () => new Response(body.slice(0), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    try { await cache.put(url.href, cachedResponse()); }
    catch {
      // A cache write is a performance/offline optimization, not permission to
      // discard a successful same-origin download. Callers still verify bytes.
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } else {
    await cache.put(url.href, response);
  }
  const stored = await cache.match(url.href);
  if (!stored) throw new Error('Chrome did not retain the model asset ' + url.pathname);
  return stored;
}
