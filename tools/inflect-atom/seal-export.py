"""Seal successfully qualified compiled assets with immutable source lineage."""
import hashlib
import json
import os
import pathlib
import shutil
import sys
root=pathlib.Path(sys.argv[1])
source=pathlib.Path(__file__).resolve().parents[2]
evidence=json.loads((root/'export-evidence.json').read_text())
chrome=json.loads((root/'chrome-cpu-compatibility.json').read_text())
assert len(evidence['cases'])==93 and len(chrome['spans'])==93
for name in ('dsp-native-parity.json','dsp-wasm-parity.json'):
 proof=json.loads((root/name).read_text());assert proof['maxAbsoluteError']<.002 and proof['rootMeanSquaredError']<.0002
for p in (source/'web/inflect-atom/notices').iterdir():shutil.copyfile(p,root/p.name)
record={'schemaVersion':1,'scope':'Atom v3 local browser runtime; hosted compatibility only, no reference timing','sourceRepository':'https://github.com/ngelik/tts-bench','sourceCommit':os.environ['GITHUB_SHA'],'buildRun':'https://github.com/ngelik/tts-bench/actions/runs/'+os.environ['GITHUB_RUN_ID'],'modelRepository':evidence['model'],'modelRevision':evidence['revision'],'checkpointSha256':evidence['checkpointSha256'],'parameters':157190,'espeakSourceCommit':'4870adfa25b1a32b4361592f1be8a40337c58d6c','emscripten':'3.1.74','frontendNativeParitySpans':93,'acousticNativeParitySpans':93,'hostedOfflineChromeSpans':93,'durationRoundingDifferences':[c for c in evidence['cases'] if c['durationRoundingDifferences']]}
(root/'provenance.json').write_text(json.dumps(record,indent=2)+'\n')
(root/'checksums.json').write_text(json.dumps({str(p.relative_to(root)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.rglob('*')) if p.is_file() and p.name!='checksums.json'},indent=2)+'\n')
