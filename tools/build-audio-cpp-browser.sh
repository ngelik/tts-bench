#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
CACHE="$(cd "${AUDIO_CPP_CACHE:-$ROOT/.cache/nov14}" && pwd -P)"
SDK="$CACHE/emsdk"
PINNED_COMMIT="d38518a0d6a7aaab9d3f3dd91e9780c69857b0ac"
UPSTREAM="https://github.com/0xShug0/audio.cpp.git"
BRIDGE="$ROOT/web/audio-cpp-gguf"
JOBS="${BUILD_JOBS:-4}"
[[ "$JOBS" =~ ^[1-9][0-9]*$ ]]
if [[ ! -f "$SDK/.emscripten" ]]; then
  echo "Install the pinned Emscripten 6.0.13 SDK at $SDK before building." >&2
  exit 1
fi

# Use an independent checkout per build. A pre-existing source cache may be
# dirty, detached or pinned to a different revision. Never switch or edit it.
mkdir -p "$ROOT/.cache/builds"
RUN=$(mktemp -d "$ROOT/.cache/builds/audio-cpp-browser-v2.XXXXXX")
SOURCE="$RUN/audio-cpp"
BUILD="$RUN/build"
if git -C "$CACHE/audio-cpp" cat-file -e "$PINNED_COMMIT^{commit}" 2>/dev/null; then
  git clone --quiet --shared --no-checkout "$CACHE/audio-cpp" "$SOURCE"
else
  git init --quiet "$SOURCE"
  git -C "$SOURCE" fetch --quiet --depth=1 "$UPSTREAM" "$PINNED_COMMIT"
fi
git -C "$SOURCE" -c core.hooksPath=/dev/null checkout --quiet --detach "$PINNED_COMMIT"
git -C "$SOURCE" apply --check "$BRIDGE/ming-session-threadpool.patch"
git -C "$SOURCE" apply "$BRIDGE/ming-session-threadpool.patch"
# Append the modification notice after the last token to preserve GGML line numbers.
{
  printf '\n/*\n'
  cat "$BRIDGE/ming-session-threadpool.patch.license"
  printf '*/\n'
} >> "$SOURCE/src/models/ming3_tts/session.cpp"
printf '\n' >> "$SOURCE/CMakeLists.txt"
cat "$BRIDGE/bench_browser.cmake" >> "$SOURCE/CMakeLists.txt"
cp "$BRIDGE/bench_bridge.cpp" "$SOURCE/bench_bridge.cpp"
ln -s "$SDK" "$RUN/emsdk"

export TMPDIR="$RUN/tmp" PYTHONDONTWRITEBYTECODE=1 CLANG_MODULE_CACHE_PATH="$RUN/modules"
export XDG_CACHE_HOME="$RUN/cache" EM_CONFIG="$SDK/.emscripten"
export EM_CACHE="$RUN/em-cache" EM_PORTS="$RUN/em-cache/ports"
export PATH="$SDK/upstream/emscripten:$SDK/upstream/bin:$PATH"
mkdir -p "$TMPDIR"
cd "$RUN"
cache="$SDK/upstream/emscripten/cache"
if [[ -d "$cache" ]]; then
  if [[ "$(uname -s)" == Darwin ]]; then
    if ! cp -cR "$cache" "$EM_CACHE"; then
      mkdir -p "$EM_CACHE"
      cp -Rp "$cache/." "$EM_CACHE/"
    fi
  else
    cp -a "$cache" "$EM_CACHE"
  fi
fi
sdk_version=$(emcc --version | awk 'NR == 1 { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+[.][0-9]+[.][0-9]+$/) print $i }')
if [[ "$sdk_version" != 6.0.13 ]]; then
  echo "Expected Emscripten 6.0.13, found $sdk_version" >&2
  exit 1
fi
# Map __FILE__ in both GGML source and generated shader/build headers.
maps="-ffile-prefix-map=\"$SOURCE\"=audio.cpp -ffile-prefix-map=\"$BUILD\"=audio.cpp-build -ffile-prefix-map=\"$SDK\"=emsdk -ffile-prefix-map=\"$EM_CACHE\"=emsdk-cache -ffile-prefix-map=\"$TMPDIR\"=emscripten-tmp"
emcmake cmake -G Ninja -S "$SOURCE" -B "$BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DAUDIOCPP_MODEL_SET=custom \
  -DAUDIOCPP_MODELS=audio8_tts,ming3_tts \
  -DAUDIOCPP_DEPLOYMENT_BUILD=ON \
  -DENGINE_ENABLE_WEBGPU=ON \
  -DGGML_WEBGPU_JSPI=ON \
  -DENGINE_ENABLE_CUDA=OFF \
  -DENGINE_ENABLE_HIP=OFF \
  -DENGINE_ENABLE_VULKAN=OFF \
  -DENGINE_ENABLE_METAL=OFF \
  -DENGINE_ENABLE_OPENMP=OFF \
  -DGGML_OPENMP=OFF \
  -DENGINE_ENABLE_NATIVE_CPU=OFF \
  -DENGINE_ENABLE_LLAMAFILE=OFF \
  -DAUDIOCPP_BUILD_NATIVE_MODEL_MANAGER=OFF \
  -DAUDIOCPP_BUILD_SERVER_FRONTENDS=OFF \
  -DAUDIOCPP_BUILD_C_API=OFF \
  -DENGINE_BUILD_TESTS=OFF \
  "-DCMAKE_CXX_FLAGS=-O3 -fwasm-exceptions -msimd128 -pthread $maps" \
  "-DCMAKE_C_FLAGS=-O3 -msimd128 -pthread $maps" \
  "-DCMAKE_EXE_LINKER_FLAGS=-pthread -sPTHREAD_POOL_SIZE=12 -sPTHREAD_POOL_SIZE_STRICT=2 $maps"

cmake --build "$BUILD" --target bench_browser -j "$JOBS"
AUDIO_CPP_CACHE="$RUN" node "$ROOT/tools/build-audio-cpp-notices.mjs" --out "$BUILD/bin/THIRD-PARTY-NOTICES.txt"
node "$ROOT/tools/check-audio-cpp-build.mjs" "$BUILD/bin" "$ROOT" "$CACHE" "$SOURCE" "$BUILD"
echo "Verified release artifacts: $BUILD/bin"
