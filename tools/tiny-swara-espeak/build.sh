#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repository="$(cd "$script_dir/../.." && pwd -P)"
asset_dir="${1:-$repository/.cache/public/runtimes/espeak-ng/tiny-swara-1.52.0}"
cached_archive="${2:-}"
revision=4870adfa25b1a32b4361592f1be8a40337c58d6c
archive_digest=cd83f84c4e495f281ac14e919aecf2834306ec1ea1b498de8ef6000f3a0f90de

if ! command -v emcc >/dev/null || ! command -v emcmake >/dev/null || ! command -v cmake >/dev/null; then
  printf '%s\n' 'Activate Emscripten 5.0.3 and install CMake 4.3.2.' >&2
  exit 2
fi
emscripten_version="$(emcc --version)"
cmake_version="$(cmake --version)"
if [[ "$emscripten_version" != *' 5.0.3'* || "$cmake_version" != *'version 4.3.2'* ]]; then
  printf '%s\n' 'This build requires Emscripten 5.0.3 and CMake 4.3.2.' >&2
  exit 2
fi

mkdir -p "$repository/.cache"
build_dir="$(mktemp -d "$repository/.cache/tiny-swara-espeak.XXXXXX")"
printf 'Building eSpeak NG in %s\n' "$build_dir"
source_dir="$build_dir/source"
pack_dir="$build_dir/pack"
artifact_dir="$build_dir/artifacts"
mkdir -p "$source_dir" "$pack_dir/espeak-ng-data/lang/gmw" "$pack_dir/espeak-ng-data/lang/inc" "$artifact_dir"

export SOURCE_DATE_EPOCH=315532800
if [[ -z "$cached_archive" ]]; then
  cached_archive="$build_dir/espeak-ng.tar.gz"
  curl -fsSL --retry 2 --max-time 180 "https://codeload.github.com/espeak-ng/espeak-ng/tar.gz/$revision" -o "$cached_archive"
fi
printf '%s  %s\n' "$archive_digest" "$cached_archive" | shasum -a 256 --check
tar -xzf "$cached_archive" -C "$source_dir" --strip-components=1
patch -d "$source_dir" -p1 < "$script_dir/../tiny-voca-ja-v3-espeak/no-unused-sonic.patch"

options=(-DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTING=OFF
  -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DUSE_ASYNC=OFF
  -DUSE_SPEECHPLAYER=OFF -DUSE_KLATT=OFF)
cmake -S "$source_dir" -B "$build_dir/native" "${options[@]}"
cmake --build "$build_dir/native" --target data --parallel 4

for file in bn_dict en_dict intonations phondata phonindex phontab lang/inc/bn lang/gmw/en lang/gmw/en-US; do
  cp "$build_dir/native/espeak-ng-data/$file" "$pack_dir/espeak-ng-data/$file"
done

emcmake cmake -S "$source_dir" -B "$build_dir/wasm" "${options[@]}" \
  -DCMAKE_INSTALL_PREFIX=/usr '-DCMAKE_C_FLAGS=-include wchar.h'
cmake --build "$build_dir/wasm" --target espeak-ng --parallel 4

(
  cd "$artifact_dir"
  emcc -O3 -std=gnu11 "$script_dir/quiet-trace.c" -I"$source_dir/src/include" \
    "$build_dir/wasm/src/libespeak-ng/libespeak-ng.a" "$build_dir/wasm/src/ucd-tools/libucd.a" \
    --preload-file "$pack_dir@/data" -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker \
    -sALLOW_MEMORY_GROWTH=1 \
    -sEXPORTED_FUNCTIONS='["_bench_espeak_init","_bench_espeak_version","_bench_espeak_trace","_bench_espeak_dispose","_malloc","_free"]' \
    -sEXPORTED_RUNTIME_METHODS='["ccall"]' -o espeak-quiet.mjs
  shasum -a 256 --check <<'HASHES'
8b10507ef5e2b337ad8112745c5af995d0e96144df5845eb1b97d50fcc773c88  espeak-quiet.data
4dc180c564440bf820f9ded546b0e73fb664367bb2fb5642f934b494de318190  espeak-quiet.mjs
5a9442e1d4c4785c3497332c37ef1786f490e5e6fda60fdbceded671392757ec  espeak-quiet.wasm
HASHES
)

mkdir -p "$asset_dir"
for file in espeak-quiet.data espeak-quiet.mjs espeak-quiet.wasm; do
  install -m 644 "$artifact_dir/$file" "$asset_dir/$file"
done
printf 'Staged eSpeak NG 1.52.0 runtime files into %s\n' "$asset_dir"
