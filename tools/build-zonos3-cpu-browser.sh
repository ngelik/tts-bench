#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT_ARG="${1:-$ROOT/.cache/public/runtimes/audio-cpp-zonos3-cpu-wasm-v2}"
OUTPUT="$(mkdir -p "$(dirname "$OUTPUT_ARG")" && cd "$(dirname "$OUTPUT_ARG")" && pwd -P)/$(basename "$OUTPUT_ARG")"
CACHE="$(cd "${ZONOS3_CPU_CACHE:-$ROOT/.cache/zonos3-cpu-build}" 2>/dev/null && pwd -P || { mkdir -p "${ZONOS3_CPU_CACHE:-$ROOT/.cache/zonos3-cpu-build}"; cd "${ZONOS3_CPU_CACHE:-$ROOT/.cache/zonos3-cpu-build}" && pwd -P; })"
SOURCE_PIN="749fffec6ad4a763520388a4240cd24e08a0a2bf"
ZYPHRA_PIN="a50e14117d99181ba7f28047b451ba03ba1a09a9"
EMSDK_PIN="708dcbcc9ee23bc7d2dad44fc90db377e38b771c"
EMSCRIPTEN_VERSION="6.0.13"
UPSTREAM="https://github.com/0xShug0/audio.cpp.git"
EMSDK_UPSTREAM="https://github.com/emscripten-core/emsdk.git"
JOBS="${BUILD_JOBS:-4}"
[[ "$JOBS" =~ ^[1-9][0-9]*$ ]]

mkdir -p "$CACHE/sources" "$ROOT/.cache/builds"
RUN="$(mktemp -d "$ROOT/.cache/builds/zonos3-cpu-wasm.XXXXXX")"
cd "$RUN"
SOURCE="$RUN/audio-cpp"
BUILD="$RUN/build"
SDK="$CACHE/emsdk"

git init --quiet "$SOURCE"
git -C "$SOURCE" fetch --quiet --depth=1 "$UPSTREAM" "$SOURCE_PIN"
git -C "$SOURCE" -c core.hooksPath=/dev/null checkout --quiet --detach FETCH_HEAD
actual_source="$(git -C "$SOURCE" rev-parse HEAD)"
[[ "$actual_source" == "$SOURCE_PIN" ]] || { echo "audio.cpp source pin mismatch: $actual_source" >&2; exit 1; }

if [[ ! -f "$SDK/.emscripten" ]]; then
  if [[ ! -d "$SDK/.git" ]]; then
    git clone --quiet --filter=blob:none --no-checkout "$EMSDK_UPSTREAM" "$SDK"
  fi
  git -C "$SDK" fetch --quiet --depth=1 origin "$EMSDK_PIN"
  git -C "$SDK" -c core.hooksPath=/dev/null checkout --quiet --detach FETCH_HEAD
  [[ "$(git -C "$SDK" rev-parse HEAD)" == "$EMSDK_PIN" ]] || { echo "Emscripten SDK source pin mismatch" >&2; exit 1; }
  "$SDK/emsdk" install "$EMSCRIPTEN_VERSION"
  "$SDK/emsdk" activate "$EMSCRIPTEN_VERSION"
fi
[[ "$(git -C "$SDK" rev-parse HEAD)" == "$EMSDK_PIN" ]] || { echo "Expected emsdk commit $EMSDK_PIN" >&2; exit 1; }
source "$SDK/emsdk_env.sh" >/dev/null
version="$(emcc --version | awk 'NR == 1 { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+[.][0-9]+[.][0-9]+$/) { print $i; exit } }')"
[[ "$version" == "$EMSCRIPTEN_VERSION" ]] || { echo "Expected Emscripten $EMSCRIPTEN_VERSION, found $version" >&2; exit 1; }

mkdir -p "$SOURCE/web/zonos3-cpu"
cp "$ROOT/web/zonos3-cpu/bench_bridge.cpp" "$SOURCE/web/zonos3-cpu/bench_bridge.cpp"
cat "$ROOT/web/zonos3-cpu/bench_browser.cmake" >> "$SOURCE/CMakeLists.txt"

export TMPDIR="$RUN/tmp" XDG_CACHE_HOME="$RUN/cache" EM_CONFIG="$SDK/.emscripten"
export EM_CACHE="$RUN/em-cache" EM_PORTS="$RUN/em-cache/ports"
mkdir -p "$TMPDIR" "$EM_CACHE"
MAPS="-ffile-prefix-map=$SOURCE=audio.cpp -ffile-prefix-map=$BUILD=audio.cpp-build -ffile-prefix-map=$SDK=emsdk -ffile-prefix-map=$EM_CACHE=emsdk-cache -ffile-prefix-map=$TMPDIR=emscripten-tmp"

emcmake cmake -G Ninja -S "$SOURCE" -B "$BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DAUDIOCPP_MODEL_SET=custom -DAUDIOCPP_MODELS=zonos3 \
  -DAUDIOCPP_DEPLOYMENT_BUILD=ON \
  -DENGINE_ENABLE_WEBGPU=OFF -DGGML_WEBGPU_JSPI=OFF \
  -DENGINE_ENABLE_CUDA=OFF -DENGINE_ENABLE_HIP=OFF \
  -DENGINE_ENABLE_VULKAN=OFF -DENGINE_ENABLE_METAL=OFF \
  -DENGINE_ENABLE_OPENMP=OFF -DGGML_OPENMP=OFF \
  -DENGINE_ENABLE_NATIVE_CPU=OFF -DENGINE_ENABLE_LLAMAFILE=OFF \
  -DAUDIOCPP_BUILD_NATIVE_MODEL_MANAGER=OFF \
  -DAUDIOCPP_BUILD_SERVER_FRONTENDS=OFF -DAUDIOCPP_BUILD_C_API=OFF \
  -DENGINE_BUILD_TESTS=OFF -DGGML_NATIVE=OFF -DGGML_CPU_ALL_VARIANTS=OFF \
  "-DCMAKE_CXX_FLAGS=-O3 -fwasm-exceptions -msimd128 -pthread $MAPS" \
  "-DCMAKE_C_FLAGS=-O3 -msimd128 -pthread $MAPS" \
  "-DCMAKE_EXE_LINKER_FLAGS=-pthread -sPTHREAD_POOL_SIZE=12 -sPTHREAD_POOL_SIZE_STRICT=2 --emit-symbol-map $MAPS"
cmake --build "$BUILD" --target bench_zonos3_cpu --parallel "$JOBS"

mkdir -p "$OUTPUT"
cp "$BUILD/bin/bench_zonos3_cpu.js" "$OUTPUT/bench_zonos3_cpu.js"
cp "$BUILD/bin/bench_zonos3_cpu.wasm" "$OUTPUT/bench_zonos3_cpu.wasm"
cp "$BUILD/bin/bench_zonos3_cpu.js.symbols" "$OUTPUT/bench_zonos3_cpu.js.symbols"
[[ -s "$OUTPUT/bench_zonos3_cpu.js.symbols" ]] || { echo "Emscripten symbol map was not generated" >&2; exit 1; }
sha256sum "$OUTPUT/bench_zonos3_cpu.js.symbols"
ZONOS3_CPU_AUDIO_CPP_SOURCE="$SOURCE" ZONOS3_CPU_EMSDK="$SDK" \
  node "$ROOT/tools/build-zonos3-cpu-notices.mjs" --out "$OUTPUT/THIRD-PARTY-NOTICES.txt"
node "$ROOT/tools/check-zonos3-cpu-build.mjs" "$OUTPUT" "$SOURCE" "$SDK"
echo "Verified ZONOS3 CPU/WASM artifacts: $OUTPUT"
