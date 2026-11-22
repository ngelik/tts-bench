#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repository="$(cd "$script_dir/../.." && pwd -P)"
output="${1:-$repository/.cache/tiny-voca-gr-assets}"
checkpoint_revision=927ea15cf4edcb8695b75328c9c90c5c53928554
tiny_voca_revision=62e2adef158bc997042cc6234f541f1e0e4cd55d
espeak_revision=2e9a5fccbb0095e87b2769e9249ea1f821918ecd

if [[ "$(uname -m)" != arm64 || "$(uname -s)" != Darwin ]]; then
  printf '%s\n' 'This locked export environment requires macOS arm64.' >&2
  exit 2
fi
for program in python3.12 uv clang emcc; do
  command -v "$program" >/dev/null || { printf 'Missing build dependency: %s\n' "$program" >&2; exit 2; }
done
emcc_version="$(emcc --version)"
if [[ "$emcc_version" != *'5.0.3-git (285c424dfa9e83b03cf8490c65ceadb7c45f28eb)'* ]]; then
  printf '%s\n' 'Activate Emscripten 5.0.3-git at revision 285c424dfa9e83b03cf8490c65ceadb7c45f28eb.' >&2
  exit 2
fi

mkdir -p "$output"
output="$(cd "$output" && pwd -P)"
work="$(mktemp -d "${TMPDIR:-/tmp}/tts-bench-tiny-voca-gr-build.XXXXXX")"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/staged" "$work/espeak" "$work/upstream" "$work/hf/src/tiny_voca_gr"

fetch() {
  local url="$1" target="$2" sha256="$3"
  curl -fsSL --retry 2 --max-time 180 "$url" -o "$target"
  printf '%s  %s\n' "$sha256" "$target" | shasum -a 256 --check
}

hf_base="https://huggingface.co/ComputationalLinguisticsPlatform/tiny-voca-gr/resolve/$checkpoint_revision"
fetch "$hf_base/inference.pt" "$work/hf/inference.pt" f0a77dff23a058e180852b6f8b89a2e8a5ddbc1ed9da94bc23aaefafadfab952
fetch "$hf_base/src/tiny_voca_gr/__init__.py" "$work/hf/src/tiny_voca_gr/__init__.py" 12a9c2736bc390441c2ace37cc558e0c07b81a89c2f60d9ddad3e25cfababfac
fetch "$hf_base/src/tiny_voca_gr/frontend.py" "$work/hf/src/tiny_voca_gr/frontend.py" 618276634a09adeb7d4f87ef9f8fbb64f4db0afc7ed36fcb0d9f688bf72f873e
fetch "https://codeload.github.com/n4ze3m/tiny-voca/tar.gz/$tiny_voca_revision" "$work/tiny-voca.tar.gz" f73f5796067198bb473109a9e8c9829c0b26393121bb726bdd18e0c8c4ac6a2c
fetch "https://codeload.github.com/espeak-ng/espeak-ng/tar.gz/$espeak_revision" "$work/espeak.tar.gz" 57aefafeff07f11a91b39cce4c96f4f9e88a13a26b3aeef22556fbf78cede684
tar -xzf "$work/tiny-voca.tar.gz" -C "$work/upstream" --strip-components=1
tar -xzf "$work/espeak.tar.gz" -C "$work/espeak" --strip-components=1

python3.12 "$script_dir/build-espeak.py" "$work/espeak" "$work" "$work/staged"
uv venv --python python3.12 "$work/export-venv"
uv pip sync --python "$work/export-venv/bin/python" --no-cache --only-binary :all: --require-hashes "$script_dir/export-requirements.txt"
PATH="$work/native:$PATH" ESPEAK_DATA_PATH="$work/espeak" PYTHONPATH="$work/hf/src:$work/upstream/src" \
  PYTHONDONTWRITEBYTECODE=1 "$work/export-venv/bin/python" "$script_dir/export-greek.py" "$work/hf/inference.pt" "$work/staged/model.onnx"

(
  cd "$work/staged"
  shasum -a 256 --check <<'HASHES'
66076bccad4520afb275c4ec2d25a696f580d3ebcb827faeeb5990df11733c9f  model.onnx
19eee2d4a7974e165cc4d8e2eb0de522259ccaaeb4b0e7082db585d8a18c3607  model.json
c05a169ccb338340bb1529c68891ec3721e1bb227387c5bbb71d1689f423b9d8  espeak-quiet.data
1f00a07670c3e2f4eebd3fca9578aff4f1fe41149d131e3fc338cb4e9db84246  espeak-quiet.mjs
6eff9e5aeae447db0cf6ee160952c3a605d0ceea05eb54a002910a1c80507e16  espeak-quiet.wasm
HASHES
)
for asset in model.onnx model.json espeak-quiet.data espeak-quiet.mjs espeak-quiet.wasm; do
  install -m 644 "$work/staged/$asset" "$output/$asset"
done
printf 'Prepared verified Greek browser assets in %s\n' "$output"
