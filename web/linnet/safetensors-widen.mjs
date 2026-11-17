const F16_TO_F32 = new Float32Array(65_536);
const F32_BITS = new Uint32Array(F16_TO_F32.buffer);

for (let half = 0; half < 65_536; half++) {
  const sign = (half & 0x8000) << 16;
  const exponent = (half >>> 10) & 31;
  const mantissa = half & 0x03ff;
  let bits;
  if (exponent === 0) {
    if (mantissa === 0) bits = sign;
    else {
      let normalized = mantissa;
      let e = 113;
      while ((normalized & 0x0400) === 0) { normalized <<= 1; e--; }
      bits = sign | (e << 23) | ((normalized & 0x03ff) << 13);
    }
  } else if (exponent === 31) bits = sign | 0x7f800000 | (mantissa << 13);
  else bits = sign | ((exponent + 112) << 23) | (mantissa << 13);
  F32_BITS[half] = bits >>> 0;
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

/** Expand F16 safetensors tensors in WASM memory for Linnet's SIMD128 path. */
export function widenSafetensorsIntoWasm(source, allocate, memory) {
  if (!(source instanceof Uint8Array) || source.length < 8) throw new Error('Linnet weights are not a safetensors image');
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const headerLength = Number(view.getBigUint64(0, true));
  const dataStart = 8 + headerLength;
  if (!Number.isSafeInteger(headerLength) || dataStart > source.length) throw new Error('Linnet safetensors header length is invalid');
  let header;
  try { header = JSON.parse(decoder.decode(source.subarray(8, dataStart))); }
  catch { throw new Error('Linnet safetensors header is invalid JSON'); }
  if (!header || typeof header !== 'object' || Array.isArray(header)) throw new Error('Linnet safetensors header must be an object');

  const names = Object.keys(header).filter(name => name !== '__metadata__')
    .sort((a, b) => header[a].data_offsets[0] - header[b].data_offsets[0]);
  if (!names.length) throw new Error('Linnet safetensors file has no tensors');
  const outputHeader = {};
  if (header.__metadata__ !== undefined) outputHeader.__metadata__ = header.__metadata__;
  let outputBytes = 0;
  const copies = [];
  let inputEnd = 0;
  for (const name of names) {
    const tensor = header[name];
    if (!tensor || !Array.isArray(tensor.data_offsets) || tensor.data_offsets.length !== 2 ||
        !tensor.data_offsets.every(Number.isSafeInteger)) throw new Error('Linnet tensor offsets are invalid: ' + name);
    const [start, end] = tensor.data_offsets;
    if (start < inputEnd || end < start || dataStart + end > source.length) throw new Error('Linnet tensor range is invalid: ' + name);
    const f16 = tensor.dtype === 'F16';
    if (f16 && ((end - start) & 1)) throw new Error('Linnet F16 tensor has an odd byte length: ' + name);
    const inputBytes = end - start;
    const length = f16 ? inputBytes * 2 : inputBytes;
    outputHeader[name] = { ...tensor, dtype: f16 ? 'F32' : tensor.dtype, data_offsets: [outputBytes, outputBytes + length] };
    copies.push({ sourceOffset: dataStart + start, inputBytes, outputOffset: outputBytes, f16 });
    outputBytes += length;
    inputEnd = end;
  }

  let json = JSON.stringify(outputHeader);
  while ((8 + encoder.encode(json).length) % 8) json += ' ';
  const encodedHeader = encoder.encode(json);
  const totalBytes = 8 + encodedHeader.length + outputBytes;
  let pointer;
  try { pointer = allocate(totalBytes); }
  catch (error) {
    throw new Error('Linnet WASM could not allocate ' + totalBytes + ' bytes for widened safetensors: ' + (error?.message ?? String(error)));
  }
  if (!Number.isInteger(pointer) || pointer <= 0) throw new Error('WASM could not allocate Linnet model storage');
  if (pointer + totalBytes > memory.buffer.byteLength) throw new Error('WASM allocation is outside linear memory');

  const destination = new Uint8Array(memory.buffer, pointer, totalBytes);
  new DataView(destination.buffer, destination.byteOffset, 8).setBigUint64(0, BigInt(encodedHeader.length), true);
  destination.set(encodedHeader, 8);
  const dataOutputStart = 8 + encodedHeader.length;
  for (const copy of copies) {
    const sourceOffset = copy.sourceOffset;
    const targetOffset = dataOutputStart + copy.outputOffset;
    if (copy.f16) {
      const halfCount = copy.inputBytes / 2;
      const halves = new Uint16Array(source.buffer, source.byteOffset + sourceOffset, halfCount);
      const floats = new Float32Array(memory.buffer, pointer + targetOffset, halfCount);
      for (let i = 0; i < halfCount; i++) floats[i] = F16_TO_F32[halves[i]];
    } else destination.set(source.subarray(sourceOffset, sourceOffset + copy.inputBytes), targetOffset);
  }
  return { pointer, bytes: totalBytes };
}
