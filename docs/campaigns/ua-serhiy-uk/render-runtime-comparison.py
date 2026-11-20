#!/usr/bin/env python3
"""Reproduce the disclosed full-pipeline chart from the two immutable warm receipts."""
import hashlib,json,statistics
from pathlib import Path
root=Path(__file__).resolve().parents[3]
ids={'cpu':'2026-11-20t23-21-10-743z-ua-serhiy-0p58m-cpu-warm-c5806285','webgpu':'2026-11-20t23-22-31-529z-ua-serhiy-0p58m-webgpu-warm-f8a4d093'}
rows=[]
for backend,rid in ids.items():
 p=root/'results'/rid/'result.json';raw=p.read_bytes();d=json.loads(raw);c,=d['cells'];assert c['status']=='measured' and len(c['trials'])==5
 times=[t['generationMs']/1000 for t in c['trials']]
 rows.append({'backend':backend,'id':rid,'receiptSha256':hashlib.sha256(raw).hexdigest(),'medianSeconds':statistics.median(times),'minimumSeconds':min(times),'maximumSeconds':max(times),'trialsSeconds':times})
folder=Path(__file__).parent
(folder/'runtime-comparison.json').write_text(json.dumps({'kind':'descriptive-end-to-end-runtime-comparison','sourceCommit':d['source']['gitCommit'],'fixture':d['fixture'],'strictComparatorAccepted':False,'strictDecision':'strict-comparison.json','rows':rows,'cpuSpeedRatio':rows[1]['medianSeconds']/rows[0]['medianSeconds']},indent=2)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="290" viewBox="0 0 900 290" role="img" aria-labelledby="title desc"><title id="title">Serhiy Ukrainian full-pipeline warm timings</title><desc id="desc">Five scored full articles after one excluded warm-up per backend. Lower elapsed time is faster. CPU and mixed WebGPU plus WASM paths; strict comparator settings differ.</desc><rect width="900" height="290" fill="#fff"/><g font-family="system-ui,sans-serif" fill="#17212b"><text x="28" y="36" font-size="22">Serhiy · Ukrainian article · native M1 Pro</text><text x="28" y="62" font-size="14">Warm median, n=5 · 19,980 characters / 92 spans · lower is faster</text>']
for i,row in enumerate(rows):
 y=98+i*66;w=row['medianSeconds']/10*500;label='CPU / WASM' if i==0 else 'WebGPU + WASM';color='#446f99' if i==0 else '#b46a32'
 svg.append(f'<text x="28" y="{y+22}" font-size="16">{label}</text><rect x="225" y="{y}" width="{w:.3f}" height="34" rx="3" fill="{color}"/><text x="{235+w:.3f}" y="{y+22}" font-size="16">{row["medianSeconds"]:.6f} s</text>')
svg.append('<text x="28" y="244" font-size="13">Separate end-to-end implementations; GPU includes explicit WASM fallback.</text><text x="28" y="267" font-size="13">Timing and waveform integrity do not establish pronunciation or listening quality.</text></g></svg>\n')
(folder/'runtime-comparison.svg').write_text(''.join(svg))
