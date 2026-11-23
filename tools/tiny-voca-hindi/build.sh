#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
repo=$(cd "$script_dir/../.." && pwd -P)
asset_dir="${1:-$repo/.cache/public/runtimes/tiny-voca-hindi/ggml-0.29.0}"
source_cache="${2:-}"
release_revision=b76940f5edbc9c4ca2c7c8cf29f20897ff3339fe
ggml_revision=57e2c2ca2a7cae756b1c4dfafa0cdfef9051d234

for command in emcc emcmake cmake ninja; do
    if ! command -v "$command" >/dev/null; then
        printf '%s\n' 'Activate Emscripten 5.0.3 and install CMake 4.3.2 and Ninja.' >&2
        exit 2
    fi
done
emscripten_version=$(emcc --version)
cmake_version=$(cmake --version)
if [[ "$emscripten_version" != *' 5.0.3'* || "$cmake_version" != *'version 4.3.2'* ]]; then
    printf '%s\n' 'This build requires Emscripten 5.0.3 with CMake 4.3.2.' >&2
    exit 2
fi

mkdir -p "$repo/.cache" "$asset_dir"
asset_dir=$(cd "$asset_dir" && pwd -P)
build_root=$(mktemp -d "$repo/.cache/tiny-voca-hindi.XXXXXX")
mkdir -p "$build_root/ggml" "$build_root/bridge" "$build_root/release/cpp/src"
cp "$script_dir/CMakeLists.txt" "$script_dir/bridge.cpp" "$build_root/bridge/"
if [[ -n "$source_cache" ]]; then
    source_cache=$(cd "$source_cache" && pwd -P)
fi

(
    cd "$build_root"
    while read -r digest item; do
        if [[ -n "$source_cache" ]]; then
            cp "$source_cache/$item" "$item"
        elif [[ "$item" == ggml-source.tgz ]]; then
            curl -fsSL --retry 2 --max-time 120 "https://codeload.github.com/ggml-org/ggml/tar.gz/$ggml_revision" -o "$item"
        else
            curl -fsSL --retry 2 --max-time 120 "https://huggingface.co/RL10x/tiny-voca-hindi/resolve/$release_revision/${item#release/}" -o "$item"
        fi
    done < "$script_dir/source.sha256"
    shasum -a 256 --check "$script_dir/source.sha256"
    tar -xzf ggml-source.tgz -C ggml --strip-components=1

    export SOURCE_DATE_EPOCH=0
    path_map="-ffile-prefix-map=\"$build_root/build\"=hindi-build -ffile-prefix-map=\"$build_root\"=hindi"
    emcmake cmake -G Ninja -S "$build_root/bridge" -B "$build_root/build" \
        -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
        -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DGGML_METAL=OFF -DGGML_ACCELERATE=OFF \
        -DGGML_BLAS=OFF -DGGML_BUILD_TESTS=OFF -DGGML_BUILD_EXAMPLES=OFF \
        -DGGML_SOURCE="$build_root/ggml" -DHINDI_SOURCE="$build_root/release/cpp/src" \
        "-DCMAKE_C_FLAGS=-O3 -msimd128 $path_map" \
        "-DCMAKE_CXX_FLAGS=-O3 -msimd128 -fwasm-exceptions $path_map"
    cmake --build "$build_root/build" --target benchmark-hindi --parallel 4

    cd "$build_root/build"
    shasum -a 256 --check <<'HASHES'
05109d8eb42710f9ea39c81800c9cad48c049c86d59cb7c68aa85e7f25b411b5  benchmark-hindi.mjs
e53e68baeda877603bded3973ec7caa1398eb45f12c094e948e1622146fc1110  benchmark-hindi.wasm
HASHES
    install -m 644 benchmark-hindi.mjs benchmark-hindi.wasm "$asset_dir/"
)
