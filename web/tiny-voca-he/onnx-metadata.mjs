/* Read ONNX ModelProto.metadata_props (field 14) without a JSON sidecar. */
function varint(bytes, state) {
  let value = 0n, shift = 0n;
  for (;;) {
    if (state.offset >= bytes.length || shift > 63n) throw new Error('Malformed ONNX protobuf varint');
    const byte = bytes[state.offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if (!(byte & 0x80)) return Number(value);
    shift += 7n;
  }
}
function fields(bytes, start = 0, end = bytes.length) {
  const state = { offset: start }, out = [];
  while (state.offset < end) {
    const tag = varint(bytes, state), field = tag >>> 3, wire = tag & 7;
    if (!field) throw new Error('Invalid ONNX protobuf field number');
    if (wire === 0) out.push([field, wire, varint(bytes, state)]);
    else if (wire === 1) { if (state.offset + 8 > end) throw new Error('Truncated ONNX fixed64'); out.push([field, wire, state.offset]); state.offset += 8; }
    else if (wire === 2) {
      const length = varint(bytes, state), offset = state.offset;
      if (!Number.isSafeInteger(length) || length < 0 || offset + length > end) throw new Error('Truncated ONNX field');
      out.push([field, wire, bytes.subarray(offset, offset + length)]); state.offset += length;
    } else if (wire === 5) { if (state.offset + 4 > end) throw new Error('Truncated ONNX fixed32'); out.push([field, wire, state.offset]); state.offset += 4; }
    else throw new Error('Unsupported ONNX protobuf wire type ' + wire);
  }
  return out;
}
function utf8(bytes) { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
function stringEntry(bytes) {
  const entry = {};
  for (const [field, wire, value] of fields(bytes)) {
    if ((field === 1 || field === 2) && wire === 2) entry[field] = utf8(value);
  }
  if (typeof entry[1] !== 'string' || typeof entry[2] !== 'string') throw new Error('Malformed ONNX metadata entry');
  return [entry[1], entry[2]];
}
export function onnxMetadata(bytes) {
  const result = Object.create(null);
  for (const [field, wire, value] of fields(bytes)) {
    if (field !== 14) continue;
    if (wire !== 2) throw new Error('ONNX ModelProto metadata_props has an unexpected wire type');
    const [key, item] = stringEntry(value);
    if (Object.hasOwn(result, key)) throw new Error('Duplicate ONNX model metadata key: ' + key);
    result[key] = item;
  }
  if (!Object.keys(result).length) throw new Error('ONNX model has no embedded metadata_props');
  return result;
}
