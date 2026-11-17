# Linnet hybrid runtime build

This crate is a small C ABI wrapper for VoxRT's Apache-2.0 LinnetTTS v0.1.1
Rust runtime. Its only inference change is the gated WebGPU host dispatch added
by `prepare-upstream.mjs` to the upstream `matmul_mv`, `matmul_mm`, and
`matmul_mm_transposed_b` FP32 kernels. Operations below 32,768 MACs keep the
upstream SIMD128/CPU implementation. Larger operations synchronously hand data
to the browser's WebGPU worker and copy the result back before the Rust runtime
continues. Generic operations, including changing attention K/V tensors, mark
their RHS as dynamic and upload it for every dispatch. Only immutable `Mat::F32`
model weights opt into the worker's pointer-and-shape cache.

Upstream source is fetched at commit
[`29dfdd503a3930e4e36c1130e4c9aab0592201ca`](https://github.com/VoxRT/LinnetTTS/tree/29dfdd503a3930e4e36c1130e4c9aab0592201ca).
The dependency lock is retained here; the source patch is guarded by exact
upstream text and commit checks. Build with Rust 1.95.0 and
`wasm32-unknown-unknown` via `npm run linnet:runtime:build`. The generated WASM
must match the size and SHA-256 in `web/linnet/runtime-policy.mjs`.

The build consumes only the locally staged, licensed Linnet weights at runtime.
It does not package, commit or upload model weights, the official demo WASM, or
the official demo JavaScript. Copyright and model/voice terms remain with VoxRT.
