#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SOURCE="${KOKOPOP_SOURCE:-$ROOT/.cache/sano-kokopop-build/upstream}"
BUILD_ROOT="${KOKOPOP_BUILD_ROOT:-$ROOT/.cache/sano-kokopop-build}"
ASSET_ROOT="${KOKOPOP_ASSET_ROOT:-$ROOT/.cache/public}"
MODEL_REVISION="4a8194aa1dd958033ee449b3ad30c37e536b216e"
SOURCE_PIN="73ed5710cb37ca0384bc4bfdd7138d13605c9a88"
EMSDK_PIN="708dcbcc9ee23bc7d2dad44fc90db377e38b771c"
EMSCRIPTEN_VERSION="6.0.13"
EMSDK_UPSTREAM="https://github.com/emscripten-core/emsdk.git"
JOBS="${BUILD_JOBS:-4}"

[[ "$JOBS" =~ ^[1-9][0-9]*$ ]]
[[ -d "$SOURCE/.git" ]] || { echo "Kokopop checkout is missing: $SOURCE" >&2; exit 1; }
actual_source="$(git -C "$SOURCE" rev-parse HEAD)"
[[ "$actual_source" == "$SOURCE_PIN" ]] || { echo "Expected Kokopop $SOURCE_PIN, found $actual_source" >&2; exit 1; }

PATCH="$ROOT/web/sano-kokopop/patches/kokopop-browser.patch"
# This generated patch uses zero-context hunks so the patch file itself stays
# free of whitespace-only context records. The exact upstream commit is pinned
# above before applying it.
git -C "$SOURCE" apply --unidiff-zero --check "$PATCH"
git -C "$SOURCE" apply --unidiff-zero "$PATCH"

MODEL="$ASSET_ROOT/models/heartnano-f32.gguf"
RUNTIME_STAGE="$ASSET_ROOT/runtimes/kokopop-sano-heartnano-v1"
RELEASE="$BUILD_ROOT/release"
mkdir -p "$(dirname "$MODEL")" "$BUILD_ROOT" "$ASSET_ROOT"
python3 -m venv "$BUILD_ROOT/venv"
source "$BUILD_ROOT/venv/bin/activate"
python -m pip install --disable-pip-version-check --no-input 'numpy==2.4.4'
python "$SOURCE/tools/convert_sanotts_to_gguf.py" \
  --output "$MODEL" --voice heartnano --artifact-revision "$MODEL_REVISION" \
  --cache-dir "$BUILD_ROOT/model-cache"

SDK="$BUILD_ROOT/emsdk"
if [[ ! -d "$SDK/.git" ]]; then
  git clone --quiet --filter=blob:none --no-checkout "$EMSDK_UPSTREAM" "$SDK"
fi
if [[ ! -f "$SDK/.emscripten" ]]; then
  git -C "$SDK" fetch --quiet --depth=1 origin "$EMSDK_PIN"
  git -C "$SDK" -c core.hooksPath=/dev/null checkout --quiet --detach FETCH_HEAD
  [[ "$(git -C "$SDK" rev-parse HEAD)" == "$EMSDK_PIN" ]] || { echo "Emsdk source pin mismatch" >&2; exit 1; }
  "$SDK/emsdk" install "$EMSCRIPTEN_VERSION"
  "$SDK/emsdk" activate "$EMSCRIPTEN_VERSION"
fi
[[ "$(git -C "$SDK" rev-parse HEAD)" == "$EMSDK_PIN" ]] || { echo "Expected emsdk commit $EMSDK_PIN" >&2; exit 1; }
source "$SDK/emsdk_env.sh" >/dev/null
version="$(emcc --version | awk 'NR == 1 { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+[.][0-9]+[.][0-9]+$/) { print $i; exit } }')"
[[ "$version" == "$EMSCRIPTEN_VERSION" ]] || { echo "Expected Emscripten $EMSCRIPTEN_VERSION, found $version" >&2; exit 1; }

WEB_BUILD="$BUILD_ROOT/web-build"
export EM_CONFIG="$SDK/.emscripten"
export EM_CACHE="$BUILD_ROOT/em-cache"
export EM_PORTS="$EM_CACHE/ports"
export TMPDIR="$BUILD_ROOT/tmp"
mkdir -p "$EM_CACHE" "$TMPDIR"
MAPS="-ffile-prefix-map=$SOURCE=kokopop-source -ffile-prefix-map=$WEB_BUILD=kokopop-build -ffile-prefix-map=$SDK=emsdk"
emcmake cmake -G Ninja -S "$SOURCE" -B "$WEB_BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DKOKOPOP_BUILD_TESTS=OFF -DKOKOPOP_BUILD_TOOLS=OFF \
  -DKOKOPOP_BUILD_WEB=ON -DKOKOPOP_ENABLE_WEBGPU=ON \
  '-DKOKOPOP_WEB_LANGUAGES=en' \
  "-DCMAKE_CXX_FLAGS=$MAPS" "-DCMAKE_C_FLAGS=$MAPS" \
  "-DCMAKE_EXE_LINKER_FLAGS=$MAPS"
cmake --build "$WEB_BUILD" --target kokopop_web --parallel "$JOBS"

node "$ROOT/tools/build-sano-kokopop-manifest.mjs" \
  --source "$SOURCE" --build "$WEB_BUILD" --sdk "$SDK" \
  --model "$MODEL" --out "$RELEASE" --stage "$RUNTIME_STAGE" \
  --model-revision "$MODEL_REVISION" --emscripten-version "$EMSCRIPTEN_VERSION" \
  --patch "$PATCH" --project-root "$ROOT"
