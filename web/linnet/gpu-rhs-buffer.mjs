export function materializeRhsBuffer(request, cachedWeights, createBuffer, writeBuffer) {
  const cacheable = request.cacheableWeight === true;
  if (cacheable) {
    const existing = cachedWeights.get(request.weightKey);
    if (existing) return { buffer: existing, cacheHit: true, transient: false, uploadedBytes: 0 };
  }
  if (!request.weightBuffer) {
    throw new Error(cacheable
      ? `Weight buffer ${request.weightKey} was not cached and no upload was supplied.`
      : 'A dynamic Linnet RHS must be uploaded for every dispatch.');
  }
  const rhs = Float32Array.from(new Float32Array(request.weightBuffer));
  const buffer = createBuffer(rhs.byteLength);
  try { writeBuffer(buffer, rhs); }
  catch (error) {
    buffer.destroy?.();
    throw error;
  }
  if (cacheable) cachedWeights.set(request.weightKey, buffer);
  return { buffer, cacheHit: false, transient: !cacheable, uploadedBytes: rhs.byteLength };
}
