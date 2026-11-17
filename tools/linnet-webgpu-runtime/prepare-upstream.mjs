import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'upstream-linnet');
const expectedCommit = '29dfdd503a3930e4e36c1130e4c9aab0592201ca';
const sourceCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (sourceCommit !== expectedCommit) throw new Error(`Expected upstream v0.1.1 ${expectedCommit}, found ${sourceCommit}`);
const opsPath = resolve(root, 'runtime/linnet-ops/src/ops.rs');
const opsCargoPath = resolve(root, 'runtime/linnet-ops/Cargo.toml');
const ttsCargoPath = resolve(root, 'runtime/linnet-tts/Cargo.toml');
const weightsPath = resolve(root, 'runtime/linnet-tts/src/weights.rs');

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Pinned v0.1.1 source shape changed at ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let ops = await readFile(opsPath, 'utf8');
ops = replaceOnce(ops, 'use crate::f16::f16_to_f32;\n', `use crate::f16::f16_to_f32;

#[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
#[link(wasm_import_module = "env")]
extern "C" {
    fn linnet_gpu_dispatch(a: *const f32, b: *const f32, out: *mut f32, m: u32, k: u32, n: u32, transpose_b: u32, cacheable_rhs: u32) -> i32;
}

#[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
#[inline(always)]
fn try_webgpu(a: &[f32], b: &[f32], out: &mut [f32], m: usize, k: usize, n: usize, transpose_b: bool, cacheable_rhs: bool) -> bool {
    const MIN_MACS: usize = 32 * 1024;
    if m.checked_mul(k).and_then(|value| value.checked_mul(n)).is_none_or(|macs| macs < MIN_MACS) {
        return false;
    }
    unsafe { linnet_gpu_dispatch(a.as_ptr(), b.as_ptr(), out.as_mut_ptr(), m as u32, k as u32, n as u32, if transpose_b { 1 } else { 0 }, if cacheable_rhs { 1 } else { 0 }) != 0 }
}
`, 'ops.rs imports');

ops = replaceOnce(ops,
  '    debug_assert_eq!(output.len(), out_features);\n\n    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]',
  `    debug_assert_eq!(output.len(), out_features);
    #[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
    if try_webgpu(input, weight, output, 1, in_features, out_features, true, false) { return; }

    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]`,
  'matmul_mv');

ops = replaceOnce(ops,
  'pub fn matmul_mm(a: &[f32], b: &[f32], m: usize, k: usize, n: usize, out: &mut [f32]) {\n    debug_assert_eq!(a.len(), m * k);\n    debug_assert_eq!(b.len(), k * n);\n    debug_assert_eq!(out.len(), m * n);\n    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]',
  `pub fn matmul_mm(a: &[f32], b: &[f32], m: usize, k: usize, n: usize, out: &mut [f32]) {
    debug_assert_eq!(a.len(), m * k);
    debug_assert_eq!(b.len(), k * n);
    debug_assert_eq!(out.len(), m * n);
    #[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
    if try_webgpu(a, b, out, m, k, n, false, false) { return; }
    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]`,
  'matmul_mm');

ops = replaceOnce(ops,
  'pub fn matmul_mm_transposed_b(a: &[f32], b: &[f32], m: usize, k: usize, n: usize, out: &mut [f32]) {\n    debug_assert_eq!(a.len(), m * k);\n    debug_assert_eq!(b.len(), n * k);\n    debug_assert_eq!(out.len(), m * n);\n    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]',
  `pub fn matmul_mm_transposed_b(a: &[f32], b: &[f32], m: usize, k: usize, n: usize, out: &mut [f32]) {
    debug_assert_eq!(a.len(), m * k);
    debug_assert_eq!(b.len(), n * k);
    debug_assert_eq!(out.len(), m * n);
    #[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
    if try_webgpu(a, b, out, m, k, n, true, false) { return; }
    #[cfg(all(target_arch = "aarch64", not(feature = "force-scalar")))]`,
  'matmul_mm_transposed_b');

await writeFile(opsPath, ops);

let weights = await readFile(weightsPath, 'utf8');
weights = replaceOnce(weights, 'use linnet_ops::ops;\n', `use linnet_ops::ops;

#[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
#[link(wasm_import_module = "env")]
extern "C" {
    fn linnet_gpu_dispatch(a: *const f32, b: *const f32, out: *mut f32, m: u32, k: u32, n: u32, transpose_b: u32, cacheable_rhs: u32) -> i32;
}

#[cfg(all(target_arch = "wasm32", feature = "webgpu-probe"))]
#[inline(always)]
fn try_webgpu_weight(a: &[f32], b: &[f32], out: &mut [f32], m: usize, k: usize, n: usize, transpose_b: bool) -> bool {
    const MIN_MACS: usize = 32 * 1024;
    if m.checked_mul(k).and_then(|value| value.checked_mul(n)).is_none_or(|macs| macs < MIN_MACS) {
        return false;
    }
    unsafe { linnet_gpu_dispatch(a.as_ptr(), b.as_ptr(), out.as_mut_ptr(), m as u32, k as u32, n as u32, if transpose_b { 1 } else { 0 }, 1) != 0 }
}

#[cfg(not(all(target_arch = "wasm32", feature = "webgpu-probe")))]
#[inline(always)]
fn try_webgpu_weight(_: &[f32], _: &[f32], _: &mut [f32], _: usize, _: usize, _: usize, _: bool) -> bool {
    false
}
`, 'weights.rs imports');

weights = replaceOnce(weights,
  '            Mat::F32 { w, rows, cols } => ops::matmul_mv(x, w, *cols, *rows, out),',
  `            Mat::F32 { w, rows, cols } => {
                if try_webgpu_weight(x, w, out, 1, *cols, *rows, true) { return; }
                ops::matmul_mv(x, w, *cols, *rows, out)
            }`,
  'Mat::gemv F32 weights');

weights = replaceOnce(weights,
  '            Mat::F32 { w, rows, cols } => ops::matmul_mm_transposed_b(a, w, m, *cols, *rows, out),',
  `            Mat::F32 { w, rows, cols } => {
                if try_webgpu_weight(a, w, out, m, *cols, *rows, true) { return; }
                ops::matmul_mm_transposed_b(a, w, m, *cols, *rows, out)
            }`,
  'Mat::gemm F32 weights');

weights = replaceOnce(weights,
  `                if m == 1 {
                    ops::matmul_mv(a, w, k, n, out)
                } else {
                    ops::matmul_mm_transposed_b(a, w, m, k, n, out)
                }`,
  `                if try_webgpu_weight(a, w, out, m, k, n, true) { return; }
                if m == 1 {
                    ops::matmul_mv(a, w, k, n, out)
                } else {
                    ops::matmul_mm_transposed_b(a, w, m, k, n, out)
                }`,
  'Mat::gemm_rows F32 weights');
await writeFile(weightsPath, weights);

let opsCargo = await readFile(opsCargoPath, 'utf8');
opsCargo = replaceOnce(opsCargo, 'force-scalar = []\n', 'force-scalar = []\nwebgpu-probe = []\n', 'linnet-ops feature');
await writeFile(opsCargoPath, opsCargo);

let ttsCargo = await readFile(ttsCargoPath, 'utf8');
ttsCargo = replaceOnce(ttsCargo, 'force-scalar = ["linnet-ops/force-scalar"]\n',
  'force-scalar = ["linnet-ops/force-scalar"]\nwebgpu-probe = ["linnet-ops/webgpu-probe"]\n', 'linnet-tts feature');
await writeFile(ttsCargoPath, ttsCargo);

console.log(JSON.stringify({
  upstreamRoot: root,
  upstreamCommit: sourceCommit,
  modified: ['runtime/linnet-ops/src/ops.rs', 'runtime/linnet-ops/Cargo.toml', 'runtime/linnet-tts/Cargo.toml', 'runtime/linnet-tts/src/weights.rs'],
  dispatch: 'f32 matmul_mv, matmul_mm, matmul_mm_transposed_b at >=32768 MACs; generic operations use fresh RHS uploads, immutable Mat::F32 weights opt into caching',
}));
