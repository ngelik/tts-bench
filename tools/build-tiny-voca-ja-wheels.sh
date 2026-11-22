#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
bench_build="${TINY_VOCA_JA_BUILD_DIR:-$repo_root/.cache/tiny-voca-ja}"
bench_sources="$bench_build/sources"
bench_raw="$bench_build/raw-wheels"
bench_frontend="$bench_build/frontend"
mkdir -p "$bench_sources" "$bench_raw" "$bench_frontend"

if [[ -z "${PYODIDE_XBUILDENV_PATH:-}" || ! -d "$PYODIDE_XBUILDENV_PATH" ]]; then
  printf '%s\n' 'Set PYODIDE_XBUILDENV_PATH to the pinned Pyodide 314.0.8 cross-build environment.' >&2
  exit 2
fi
if ! command -v pyodide >/dev/null || ! command -v emcc >/dev/null || ! command -v rustc >/dev/null; then
  printf '%s\n' 'Activate Pyodide-build 0.39.4, Emscripten 5.0.3, and Rust 1.95.0 before building.' >&2
  exit 2
fi
if ! pyodide --version | rg -q '0\.39\.4'; then
  printf '%s\n' 'This build requires pyodide-build 0.39.4.' >&2
  exit 2
fi
if ! emcc --version | rg -q '5\.0\.3'; then
  printf '%s\n' 'This build requires Emscripten 5.0.3.' >&2
  exit 2
fi
if ! rustc --version | rg -q '1\.95\.0'; then
  printf '%s\n' 'This build requires Rust 1.95.0.' >&2
  exit 2
fi

python3 - <<'PY'
import importlib.metadata
import sys

assert sys.version_info[:2] == (3, 14), 'CPython 3.14 is required'
for package, version in {
    'cmake': '4.4.5', 'Cython': '3.3.1', 'setuptools': '84.2.1', 'maturin': '1.16.0'
}.items():
    actual = importlib.metadata.version(package)
    assert actual == version, f'{package} must be {version}; found {actual}'
PY

export PYODIDE_XBUILDENV_PATH
export SOURCE_DATE_EPOCH=315532800
export CARGO_HOME="$bench_build/cargo-home"
mkdir -p "$CARGO_HOME"

python3 -m pip download --no-deps --no-binary=:all: --dest "$bench_sources" \
  'pyopenjtalk-plus==0.4.1.post10' 'sudachipy==0.7.0'

cd "$bench_sources"
shasum -a 256 --check <<'HASHES'
cda6a562a9cb80fbc21d151f0f0264ecd368afa3dfee51dbd7bcfdcb57df5e40  pyopenjtalk_plus-0.4.1.post10.tar.gz
14a2505e7d086fe9da64c0048d8e2de13cdded3aac4f1e047929cef51dba338c  sudachipy-0.7.0.tar.gz
HASHES
tar -xzf pyopenjtalk_plus-0.4.1.post10.tar.gz
tar -xzf sudachipy-0.7.0.tar.gz
patch -d pyopenjtalk_plus-0.4.1.post10 -p1 < "$repo_root/tools/tiny-voca-ja/openjtalk-pointer-width.patch"
patch -d sudachipy-0.7.0 -p1 < "$repo_root/tools/tiny-voca-ja/sudachi-emscripten.patch"
cp "$repo_root/tools/tiny-voca-ja/sudachi.compiled.Cargo.lock" sudachipy-0.7.0/Cargo.lock

cd "$repo_root"
pyodide build "$bench_sources/pyopenjtalk_plus-0.4.1.post10" \
  --no-build-dependencies --skip-emscripten-install --outdir "$bench_raw"

bench_sources_lexical="$(cd "$bench_sources" && pwd -L)"
bench_sources_physical="$(cd "$bench_sources" && pwd -P)"
bench_cargo_lexical="$(cd "$CARGO_HOME" && pwd -L)"
bench_cargo_physical="$(cd "$CARGO_HOME" && pwd -P)"
export RUSTFLAGS="--remap-path-prefix=$bench_cargo_lexical=/cargo --remap-path-prefix=$bench_cargo_physical=/cargo --remap-path-prefix=$bench_sources_lexical=/src --remap-path-prefix=$bench_sources_physical=/src"
pyodide build "$bench_sources/sudachipy-0.7.0" \
  --no-build-dependencies --skip-emscripten-install --outdir "$bench_raw"

for bench_wheel in "$bench_raw"/*.whl; do
  python3 "$repo_root/tools/tiny-voca-ja/repack-wasm-wheel.py" "$bench_wheel" "$bench_frontend"
done

check_digest() {
  local bench_file="$1" expected="$2" actual
  actual="$(shasum -a 256 "$bench_file" | cut -d ' ' -f 1)"
  if [[ "$actual" != "$expected" ]]; then
    printf 'Wheel SHA-256 mismatch for %s: expected %s, got %s\n' "$bench_file" "$expected" "$actual" >&2
    exit 1
  fi
}

check_digest "$bench_frontend/pyopenjtalk_plus-0.4.1.post10-cp314-cp314-pyemscripten_2026_0_wasm32.whl" \
  '4da69e49c0b459728b41a7947a3ead7f98e2d5e7a44561080900ceaae967172b'
check_digest "$bench_frontend/sudachipy-0.7.0-cp310-abi3-pyemscripten_2026_0_wasm32.whl" \
  'ad3ea354f3714b76d9773bb49e1c6e7a4dcfbf0fbf628090bc03c9420cc2cd34'

bench_model_assets="$repo_root/.cache/public/models/tiny-voca-ja-tsukuyomi-chan/7ed75cc5f521cc6be4cb57689b2c038928259ae9/66ee00d2c8cd61b34be1cde5880bac0e45b89fcf"
mkdir -p "$bench_model_assets"
cp "$bench_frontend/pyopenjtalk_plus-0.4.1.post10-cp314-cp314-pyemscripten_2026_0_wasm32.whl" "$bench_model_assets/"
cp "$bench_frontend/sudachipy-0.7.0-cp310-abi3-pyemscripten_2026_0_wasm32.whl" "$bench_model_assets/"
printf 'Verified and staged generated Pyodide frontend wheels in %s\n' "$bench_model_assets"
