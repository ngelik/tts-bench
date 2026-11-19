"""Reproduce individual Kokopop Sano GGUFs; no inference or public redistribution."""
import hashlib,json,os,subprocess,sys,unicodedata,urllib.request
from pathlib import Path
import numpy
ROOT=Path(__file__).resolve().parent.parent
SOURCE=Path(os.environ.get('KOKOPOP_SOURCE',ROOT/'.cache/sano-kokopop-build/upstream'))
BUILD=Path(os.environ.get('KOKOPOP_BUILD_ROOT',ROOT/'.cache/sano-kokopop-build'))
OUT=BUILD/'release';CACHE=BUILD/'size-model-cache'
PINS=json.loads((ROOT/'docs/sano-kokopop-size-pins.json').read_text())
assert sys.version_info[:2]==(3,13), 'Conversion requires Python 3.13 (Unicode 15.1).'
assert numpy.__version__==PINS['numpy'] and unicodedata.unidata_version==PINS['unicode']
assert subprocess.check_output(['git','-C',str(SOURCE),'rev-parse','HEAD'],text=True).strip()==PINS['upstreamCommit']
OUT.mkdir(parents=True,exist_ok=True)
def verify(path,pin):
 b=path.read_bytes()
 if len(b)!=pin['bytes'] or hashlib.sha256(b).hexdigest()!=pin['sha256']:raise ValueError('Asset pin mismatch: '+str(path))
verified=[]
for profile in PINS['profiles']:
 for pin in profile['inputs']:
  p=CACHE/'hf'/PINS['artifactRevision']/pin['path']
  if not p.exists():
   p.parent.mkdir(parents=True,exist_ok=True)
   url='https://huggingface.co/ampixa/sanoTTS/resolve/'+PINS['artifactRevision']+'/'+pin['path']
   with urllib.request.urlopen(url,timeout=120) as r:p.write_bytes(r.read())
  verify(p,pin)
 model=OUT/(profile['voice']+'.gguf')
 with (OUT/(profile['voice']+'-conversion.log')).open('w') as log:
  subprocess.run([sys.executable,str(SOURCE/'tools/convert_sanotts_to_gguf.py'),'--voice',profile['voice'],'--output',str(model),'--artifact-revision',PINS['artifactRevision'],'--cache-dir',str(CACHE)],stdout=log,stderr=subprocess.STDOUT,check=True)
 verify(model,profile)
 verified.append(profile)
manifest={**PINS,'verifiedProfiles':verified,'pythonVersion':sys.version.split()[0],'inferenceRun':False}
(OUT/'SANO-SIZE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'status':'verified','models':[p['id'] for p in verified]}))
