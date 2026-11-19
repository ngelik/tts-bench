# Audio8 CPU: one retained scored warm article

The user shortened the CPU warm run after its first completed scored article. The original [five-repetition plan](plan.json) and [native receipt](../../../results/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/result.json) remain unchanged. A hash-bound [selection sidecar](cpu-warm-selection.json) selects only trial 1 for the displayed timing. Its original error status records the intentional stop, not an unsuccessful retained article.

| Observation | CPU | WebGPU |
|---|---:|---:|
| Completed scored articles used | 1 of 5 originally planned | 5 |
| Excluded full warm-up articles | 1 | 1 |
| Generation time | 24251.094500 s | 9783.961105 s median |
| First PCM | 308.264640 s | 113.932450 s median |
| Generated audio | 1429.048889 s | 1427.748571 s median |

CPU trial 1 / WebGPU five-run median is **2.478658×**. CPU has one observation, so its repeated-run spread is unknown. Both use the same corrected Audio8 profile and source, the full 20,000-character English fixture in 93 spans, and the pinned M1 Pro host and Chrome 157.0.8103.40. [Combined table and chart](../../../reports/audio8-codec-repair/overview.md). Cached memory measurements remain separate and unchanged.

## Stop and preserved evidence

At the user’s request, the operator sent SIGTERM to the native CLI after scored trial 1 completed and status had advanced to trial 2. Trial 2 did not complete; trials 3–5 were not run. These repetitions contribute no score. The native receipt remains unchanged with error status after Chrome closed.

The terminal reason is `page.evaluate: Target page, context or browser has been closed`. No second scored checkpoint exists. [Stop observation](cpu-warm-stop-observation.json) is a public derivative of the post-hoc observer record, with repository-relative evidence links. It records the verified CLI, SIGTERM and trial-2 status; the exact signal timestamp was not captured. Trial 2 may have started but did not complete. The excluded [warm-up checkpoint](evidence/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/warmup-1.json) and retained [trial-1 checkpoint](evidence/2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb/trial-1.json) exactly match their objects in the unchanged receipt. All 93 spans in each completed article passed the native waveform gate.

Original receipt SHA-256: `8c3c0ec9a8348eb679e82127c240117ba9eccedfc26560326f402b11fabde584`.

## Corresponding existing recording

This stopped warm run did **not** save a new final WAV. Listen to the separately recorded [cached CPU clip](../../../audio/samples/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu.wav) or [original full cached WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a--audio8-realistic-0.6b-int4--cpu-full.wav). The player and recording remain attributed to [cached receipt 2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a](../../../results/2026-11-17t21-08-29-351z-audio8-realistic-0.6b-int4-cpu-cached-026c8c6a/summary.md), not to this warm attempt.

The cached trial, excluded warm-up and retained scored trial have the exact same Float32 PCM SHA-256 `a92e055ab76dddff5e6f899aa8f97e8cbf6fb42ec4de159dab4d37296ee703eb`, 63,021,056 mono frames and 44,100 Hz sample rate. Source, assets, voice, precision and inference settings also match. [Machine-readable cross-receipt evidence](cpu-warm-audio-equivalence.json) binds this correspondence to both original receipt hashes. This proves matching generated PCM, not a speech-intelligibility rating.

The existing cached full WAV remains `fbeabc3a632a382582d214115966cfe252bf642456f6ef10a860f4a7a8c2bd19` (126,042,156 bytes). Its 30-second clip remains `e6fbce213f7076750b62c8f212c4baa7ed5e2f1ca389fe6326d661cbdff80f71`. No duplicate recording or acoustic synthesis is created by this publication.
