"""Build the author-derived Uzbek graph and seeded excitation inputs for the benchmark."""
from pathlib import Path
from hashlib import sha256
import json
import platform
import sys
import runpy
import argparse
import onnx
import torch

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',type=Path,required=True,help='Local checkout of the pinned Uzbek model release')
parser.add_argument('--inputs',type=Path,default=Path(__file__).with_name('build-inputs.json'),help='Pinned source input manifest')
parser.add_argument('--fixture-root',type=Path,default=Path(__file__).resolve().parents[2]/'fixtures')
parser.add_argument('--out-dir',type=Path,help='Output directory (defaults to SOURCE_ROOT/build)')
args=parser.parse_args()
root=args.source_root.resolve()
inputs=json.loads(args.inputs.read_bytes())
for source in inputs:
 p=root/source['path']
 assert p.stat().st_size==source['bytes'] and sha256(p.read_bytes()).hexdigest()==source['sha256']
sys.path.insert(0,str(root/'src'))
from tiny_voca.infer import load_model,match_frontend,finished,sentences
from tiny_voca.text import frontend_runtime,phonemize
from tiny_voca.export import export,metadata
normalizer_rows=[source for source in inputs if source['path']=='uzbek_normalize.py']
assert len(normalizer_rows)==1, 'manifest must pin exactly one root uzbek_normalize.py'
normalizer_path=(root/normalizer_rows[0]['path']).resolve()
assert normalizer_path.parent==root, 'pinned normalizer must be at the source root'
normalizer_namespace=runpy.run_path(str(normalizer_path))
normalize=normalizer_namespace['normalize']

torch.set_num_threads(1)
checkpoint=root/'inference.pt'
match_frontend(checkpoint)
model=load_model(checkpoint)
params=sum(p.numel() for p in model.parameters())
dst=(args.out_dir or root/'build').resolve()
dst.mkdir(exist_ok=True)
graph=dst/'uzbek-m2-external-noise.onnx'
torch.manual_seed(42)
export(model,graph,external_noise=True,opset=17)
g=onnx.load(graph)
onnx.checker.check_model(g,full_check=True)
names=[x.name for x in g.graph.input]
assert names==['tokens','stress','voice','speed','pitch_shift','pitch_range','noise']
assert [x.name for x in g.graph.output]==['audio','durations']
assert not any('Random' in n.op_type for n in g.graph.node)
settings=metadata(model,checkpoint)
# The parent exporter uses an English fallback for a missing dictionary key.
# The Uzbek publisher identifies its rule-based frontend via frontend_runtime().
settings.update(frontend=frontend_runtime()['phonemizer'],inputs=names)
assert settings['voices']==['M2'] and len(settings['symbols'])==48 and settings['step']==104737
assert settings['frontend_fingerprint']=='3712af88f938a03339d63500b448cb16f01d95ae66a546376100b1c44bc5891e'
(dst/'config.json').write_text(json.dumps(settings,ensure_ascii=False,indent=2)+'\n')
fix=args.fixture_root.resolve()
article=(fix/'uz-article-v1.txt').read_text()
man=json.loads((fix/'uz-article-v1.chunks.json').read_bytes())
assert sha256(article.encode()).hexdigest()==man['articleSha256']
rows=[]
for span in man['chunks']:
 text=article[span['start']:span['end']]
 spoken=normalize(text,mode='infer')
 parts=[]
 for sentence in sentences(finished(spoken)):
  phones=phonemize(sentence)
  assert not phones.unknown and len(phones.ids)<=model.config.max_tokens-12
  parts.append([list(phones.ids),list(phones.stress)])
 assert parts
 rows.append([span['id'],parts])
canonical=json.dumps(rows,separators=(',',':')).encode()
(dst/'token-controls.json').write_bytes(canonical+b'\n')
max_utts=max(len(parts) for _,parts in rows)
samples=model.config.max_frames*model.config.hop
noise_proofs=[]
for offset in range(max_utts):
 seed=42+offset
 stream=torch.randn(samples,generator=torch.Generator().manual_seed(seed))
 for frames in (1,7,64,123,1024,2999):
  length=frames*model.config.hop
  native=torch.randn(length,generator=torch.Generator().manual_seed(seed))
  assert torch.equal(native,stream[:length]),(seed,frames)
 path=dst/f'noise-{seed}.f32le'
 data=stream.numpy().astype('<f4',copy=False).tobytes()
 path.write_bytes(data)
 noise_proofs.append([path.name,sha256(data).hexdigest(),len(data)])
report=dict(exporter='62e2adef158bc997042cc6234f541f1e0e4cd55d',modelRevision='3d960bd05c728b21fff4ec5154cada7f6b082df1',platform=platform.platform(),torch=torch.__version__,onnx=onnx.__version__,parameters=params,publisherParameterCount=4531531,acousticGraphSha256=sha256(graph.read_bytes()).hexdigest(),graphBytes=graph.stat().st_size,fixtureSha256=man['articleSha256'],completeFrontendSha256=sha256(canonical).hexdigest(),spans=len(rows),utterances=sum(len(parts) for _,parts in rows),maxUtterancesPerSpan=max_utts,noiseInputs=noise_proofs)
(dst/'export-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
