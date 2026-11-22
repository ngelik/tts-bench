# Słyszę Głosy V1 source and terms

This benchmark profile targets `Damaon/slyszeglosy` model revision
`23b63ff12db5f19260985031e64c2f45b89cc609` and upstream browser/source revision
`605a13f5d9994ad8c897dff3463ce1f339acfb5f`.

The Polish frontend is the upstream `src/tiny_voca/text.py` plus the six
`src/wymowa/*.py` modules needed by that frontend. It is loaded from individually
pinned source files; the benchmark does not package the upstream source tree,
voice WAVs, training data or graph in Git. The original frontend and Python
implementation are Apache-2.0; see the upstream [LICENSE](https://github.com/Damaon/slyszeglosy/blob/605a13f5d9994ad8c897dff3463ce1f339acfb5f/LICENSE)
and [NOTICE](https://github.com/Damaon/slyszeglosy/blob/605a13f5d9994ad8c897dff3463ce1f339acfb5f/NOTICE). The browser adapter retains the exact
[Apache-2.0 license](NOTICE-APACHE-2.0.txt) and
[upstream attribution](NOTICE-UPSTREAM.txt) with its port of the demo planner.

The model weights and synthetic voice data are CC BY-NC 4.0. Local noncommercial
research evaluation requires the explicit license acknowledgment flag. This is
not a commercial grant and does not establish redistribution rights for
recordings. The adapter selects bundled synthetic voice `F` (index 0); voice `M`
is present in the same graph but is not registered. V2 remains outside this
profile.

The classic-worker adapter preserves the upstream Polish sentence splitting,
final punctuation, token fitting, graph controls and 24 kHz output behavior.
Its only waveform change is the fail-closed validation required by this harness
and the upstream 0.99 peak limiter applied once to the assembled source-span
clip. Empty, silent, non-finite, wrong-length or over-budget output aborts the
chunk. Session, tensors and Pyodide proxies are disposed on adapter teardown.

Shared Pyodide 0.26.4 and ONNX Runtime Web 1.20.1 files are reused from the
existing runtime paths and checked against their existing byte digests. Model
metadata, graph and frontend source bytes are separately pinned in
`assets.lock.json`; the graph and all caches remain ignored local assets.
