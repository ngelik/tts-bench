#!/usr/bin/env bash
set -euo pipefail
output="${1:?output directory required}"
source_root="$(mktemp -d)"
trap 'rm -rf "$source_root"' EXIT
git clone --quiet https://github.com/espeak-ng/espeak-ng.git "$source_root/espeak"
git -C "$source_root/espeak" checkout --detach 4870adfa25b1a32b4361592f1be8a40337c58d6c
emcmake cmake -S "$source_root/espeak" -B "$source_root/build" -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-include $EMSDK/upstream/emscripten/cache/sysroot/include/wchar.h" -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTING=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DUSE_ASYNC=OFF -DUSE_SPEECHPLAYER=OFF -DUSE_KLATT=OFF
cmake --build "$source_root/build" --target espeak-ng --parallel 2
python - "$source_root/data/espeak-ng-data" <<'PY'
import sys,shutil,pathlib,espeakng_loader
out=pathlib.Path(sys.argv[1]);source=pathlib.Path(espeakng_loader.get_data_path())
for name in ('en_dict','intonations','phondata','phonindex','phontab','lang/gmw/en','lang/gmw/en-US'):
 p=out/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/name,p)
PY
em++ -O3 -std=c++17 -ffp-contract=off tools/inflect-atom/dsp.cpp -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node -sALLOW_MEMORY_GROWTH=1 -sFILESYSTEM=0 -sEXPORTED_FUNCTIONS='["_atom_noise","_atom_render","_malloc","_free"]' -sEXPORTED_RUNTIME_METHODS='["HEAPF32"]' -o "$output/dsp.mjs"
em++ -O3 -std=c++17 tools/inflect-atom/espeak.cpp -I"$source_root/espeak/src/include" "$source_root/build/src/libespeak-ng/libespeak-ng.a" "$source_root/build/src/ucd-tools/libucd.a" --preload-file "$source_root/data@/data" -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS='["_atom_espeak_init","_atom_espeak","_malloc","_free"]' -sEXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString"]' -o "$output/espeak.mjs"
cp "$source_root/espeak/COPYING" "$output/espeak-COPYING"
cp "$EMSDK/upstream/emscripten/LICENSE" "$output/emscripten-LICENSE"
