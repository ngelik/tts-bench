#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repository="$(cd "$script_dir/../.." && pwd -P)"
profile="${2:-tiny-voca-ptbr-kokoro}"
asset_dir="${1:-$repository/.cache/public/runtimes/espeak-ng/$profile-1.51}"
case "$profile" in
  tiny-voca-ptbr-kokoro)
    voice=pt-br
    family=roa
    dictionary=pt_dict
    languages=(lang/roa/pt lang/roa/pt-BR)
    hashes='61c00cb091e058a66e96b2861eda93f99edf34ff07d03406a2fa7772e6170ec5  espeak-quiet.data
af4d7a31d0c98f44c299ceae92c9c7ededcaf9f7f384d78b9cedc88b6cd48ef4  espeak-quiet.mjs
99eb86f85bfc877052e30d8f42e0932e18beef1f8b3ef9b4b21db5ea55e098c3  espeak-quiet.wasm'
    ;;
  tui-voice-mini-ml)
    voice=ml
    family=dra
    dictionary=ml_dict
    languages=(lang/dra/ml)
    hashes='f82517b18b0bf0a7395b65ee0eaa09a5b0f6c1c2b145666b4431105a29eea811  espeak-quiet.data
784dceafa3f515d205da1f7008a32c362c5925cff2fd27f26a1e2a623ffdc543  espeak-quiet.mjs
aafb158a5697dc8462d9a2d74d2eee1fe744593f3ffc89b05ffdca951cfa940b  espeak-quiet.wasm'
    ;;
  *)
    printf 'Unknown eSpeak NG 1.51 profile: %s\n' "$profile" >&2
    exit 2
    ;;
esac
revision=2e9a5fccbb0095e87b2769e9249ea1f821918ecd
archive_digest=57aefafeff07f11a91b39cce4c96f4f9e88a13a26b3aeef22556fbf78cede684

require_version() {
  local program="$1" expected="$2" version
  version="$("$program" --version 2>/dev/null)" || version=''
  if [[ "$version" != *" $expected"* ]]; then
    printf 'This build requires %s %s.\n' "$program" "$expected" >&2
    exit 2
  fi
}

require_version emcc 5.0.3
require_version autoconf 2.73
require_version automake 1.18.1
if command -v libtoolize >/dev/null; then
  require_version libtoolize 2.5.4
else
  require_version glibtoolize 2.5.4
fi

mkdir -p "$repository/.cache"
build_dir="$(mktemp -d "$repository/.cache/$profile-espeak.XXXXXX")"
trap 'rm -rf -- "$build_dir"' EXIT
native_dir="$build_dir/native"
wasm_dir="$build_dir/wasm"
pack_dir="$build_dir/pack"
artifact_dir="$build_dir/artifacts"
mkdir -p "$native_dir" "$wasm_dir" "$pack_dir/espeak-ng-data/lang/$family" "$pack_dir/espeak-ng-data/lang/gmw" "$artifact_dir"

export SOURCE_DATE_EPOCH=315532800
curl -fsSL --retry 2 --max-time 180 "https://codeload.github.com/espeak-ng/espeak-ng/tar.gz/$revision" \
  -o "$build_dir/espeak-ng.tar.gz"
printf '%s  %s\n' "$archive_digest" "$build_dir/espeak-ng.tar.gz" | shasum -a 256 --check

options=(--disable-shared --enable-static --without-pcaudiolib --without-klatt
  --without-speechplayer --without-mbrola --without-sonic --without-async)
configure_source() {
  # v1.51 autogen uses the uppercase name, while Automake expects ChangeLog.md.
  # Normalize the spelling and add the alias on case-sensitive filesystems.
  mv CHANGELOG.md changelog.original
  mv changelog.original ChangeLog.md
  if [[ ! -e CHANGELOG.md ]]; then
    ln -s ChangeLog.md CHANGELOG.md
  fi
  ./autogen.sh
}

(
  cd "$native_dir"
  tar -xzf "$build_dir/espeak-ng.tar.gz" --strip-components=1
  configure_source
  ./configure "${options[@]}"
  make -j4 src/espeak-ng
  make -j4 espeak-ng-data/phondata espeak-ng-data/phonindex espeak-ng-data/phontab \
    espeak-ng-data/intonations "espeak-ng-data/$dictionary" espeak-ng-data/en_dict
)

for file in "$dictionary" en_dict intonations phondata phonindex phontab "${languages[@]}" lang/gmw/en lang/gmw/en-US; do
  cp "$native_dir/espeak-ng-data/$file" "$pack_dir/espeak-ng-data/$file"
done

(
  cd "$wasm_dir"
  tar -xzf "$build_dir/espeak-ng.tar.gz" --strip-components=1
  configure_source
  emconfigure ./configure --host=wasm32-unknown-emscripten --build="$(./config.guess)" --prefix=/usr \
    "${options[@]}" CFLAGS=-O3
  # Include the libc declarations ahead of the v1.51 Unicode compatibility macros.
  emmake make -j4 'CPPFLAGS=-include wchar.h' src/libespeak-ng.la
)

(
  cd "$artifact_dir"
  emcc -O3 -std=gnu11 "-DBENCH_ESPEAK_VOICE=\"$voice\"" "$script_dir/quiet-trace.c" -I"$wasm_dir/src/include" \
    "$wasm_dir/src/.libs/libespeak-ng.a" \
    --preload-file "$pack_dir@/data" -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker \
    -sALLOW_MEMORY_GROWTH=1 \
    -sEXPORTED_FUNCTIONS='["_bench_espeak_init","_bench_espeak_version","_bench_espeak_trace","_bench_espeak_dispose","_malloc","_free"]' \
    -sEXPORTED_RUNTIME_METHODS='["ccall"]' -o espeak-quiet.mjs
  printf '%s\n' "$hashes" | shasum -a 256 --check
)

mkdir -p "$asset_dir"
for asset in espeak-quiet.data espeak-quiet.mjs espeak-quiet.wasm; do
  install -m 644 "$artifact_dir/$asset" "$asset_dir/$asset"
done
printf 'Verified and staged eSpeak NG runtime files in %s\n' "$asset_dir"
