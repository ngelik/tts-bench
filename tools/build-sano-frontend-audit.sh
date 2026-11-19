#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SOURCE="${KOKOPOP_SOURCE:-$ROOT/.cache/sano-kokopop-build/upstream}"
BUILD_ROOT="${KOKOPOP_BUILD_ROOT:-$ROOT/.cache/sano-kokopop-build}"
export ROOT SOURCE BUILD_ROOT
python3 - <<'PY'
import hashlib,json,os
from pathlib import Path
r=Path(os.environ['ROOT']);s=Path(os.environ['SOURCE']);b=Path(os.environ['BUILD_ROOT'])
paths=['src/arch/sanotts/sano_tokenizer.cpp','src/arch/sanotts/sano_tokenizer.h','src/kokopop.cpp','web/bindings.cpp','src/synthesis/synthesis_session.cpp','src/synthesis/chunker/chunker.cpp','src/arch/sanotts/sano_frontend_text.cpp']
ordinary={name:hashlib.sha256((b/'release'/name).read_bytes()).hexdigest() for name in ['kokopop-runtime.js','kokopop-runtime.wasm','kokopop-runtime.data']}
(b/'frontend-audit-before.json').write_text(json.dumps({'ordinaryRuntime':ordinary,'sourceFiles':{p:hashlib.sha256((s/p).read_bytes()).hexdigest() for p in paths},'instrumentationSha256':hashlib.sha256((r/'tools/instrument-sano-frontend.py').read_bytes()).hexdigest()},indent=2)+'\n')
PY
python3 "$ROOT/tools/instrument-sano-frontend.py" "$SOURCE"
source "$BUILD_ROOT/emsdk/emsdk_env.sh" >/dev/null
export EM_CONFIG="$BUILD_ROOT/emsdk/.emscripten"
export EM_CACHE="$BUILD_ROOT/em-cache"
export EM_PORTS="$EM_CACHE/ports"
export TMPDIR="$BUILD_ROOT/tmp"
cmake --build "$BUILD_ROOT/web-build" --target kokopop_web --parallel "${BUILD_JOBS:-4}"
python3 - <<'PY'
import hashlib,json,os,shutil
from pathlib import Path
s=Path(os.environ['SOURCE']);b=Path(os.environ['BUILD_ROOT']);e=json.loads((b/'frontend-audit-before.json').read_text());out=b/'release/frontend-audit';out.mkdir(parents=True,exist_ok=True)
e['diagnosticRuntime']={}
for name,digest in e['ordinaryRuntime'].items():
 assert hashlib.sha256((b/'release'/name).read_bytes()).hexdigest()==digest,'Ordinary runtime was modified'
 source=b/'web-build/web/dist'/name
 shutil.copyfile(source,out/name)
 data=source.read_bytes();e['diagnosticRuntime'][name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
e['instrumentedSourceFiles']={p:hashlib.sha256((s/p).read_bytes()).hexdigest() for p in e['sourceFiles']}
e['inferenceRun']=False
e['scope']='Observation-only export invokes unchanged LONG_FORM chunk_text and actual voice tokenizer, then verifies final tokens by re-tokenization and reports original skip decisions and vocabulary fallbacks. No inference graph is called.'
(out/'AUDIT-BUILD.json').write_text(json.dumps(e,indent=2)+'\n')
PY
