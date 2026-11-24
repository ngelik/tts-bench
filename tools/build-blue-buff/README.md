# Build the Blue-Buff Mandarin browser assets

Use Python 3.11 on Apple Silicon for the reference build. From the repository root, run the following commands. The build downloads the pinned checkpoint, export code and four pronunciation packages listed in [inputs.json](inputs.json). It recomputes the source-preserving plan from the registered fixture, pinned frontend sources and checked-in `plan.json` metadata. The checked-in plan is the default; `--plan` is optional for a separately reviewed receipt. The checkpoint comes from songLucasXXX and the Python source comes from Blue-Buff.

```sh
python3.11 -m venv .cache/blue-buff-env
.cache/blue-buff-env/bin/python -m pip install -r tools/build-blue-buff/requirements.txt
.cache/blue-buff-env/bin/python tools/build-blue-buff/build.py --cache .cache/blue-buff-inputs --output .cache/blue-buff-import
node bin/bench.mjs assets import --model tiny-voca-zh-blue-buff --source .cache/blue-buff-import --accept-license
node bin/bench.mjs assets verify --model tiny-voca-zh-blue-buff --accept-license
```

The upstream exporter produces an FP32 ONNX graph with external excitation. The build generates its seeded noise streams and packages the pinned Chinese text frontend for Pyodide. The export records the policy version, policy and plan hashes, dynamic outer-span and internal-piece counts, and the per-outer-span noise reset in config and proof. Noise stream count comes from the maximum planned pieces in any span. After export it checks every generated file against the published lock, then stages and verifies URL-pinned Pyodide assets from `--asset-cache` or their locked URLs. Checked-in notices and npm runtime files remain the responsibility of `assets import`.

For a clean install, the optional cache can be any directory containing the locked Pyodide files by target path or basename:

```sh
python3.11 tools/build-blue-buff/build.py --cache .cache/blue-buff-inputs --output .cache/blue-buff-import --asset-cache .cache/pyodide
node bin/bench.mjs assets import --model tiny-voca-zh-blue-buff --source .cache/blue-buff-import --accept-license
node bin/bench.mjs assets verify --model tiny-voca-zh-blue-buff --accept-license
```

The lock-only staging mode supports contract checks without exporting or loading the model:

```sh
python3.11 tools/build-blue-buff/build.py --stage-locked-assets-only --lock-file /path/to/assets.lock.json --model tiny-voca-zh-blue-buff --output .cache/blue-buff-import --asset-cache .cache/pyodide
```
