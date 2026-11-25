export function makeInt64Tensor(ort, values, dims = [1, values.length]) {
  const data = BigInt64Array.from(values, BigInt);
  if (!Array.isArray(dims) || !dims.length || dims.some(n => !Number.isSafeInteger(n) || n < 1) ||
      dims.reduce((size, value) => size * value, 1) !== data.length) {
    throw new Error('Dutch ONNX int64 tensor shape does not match its values');
  }
  return new ort.Tensor('int64', data, dims);
}
