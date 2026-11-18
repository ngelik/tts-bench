# Klein-TTS X1.5 Pro campaign conditions

The paired [campaign report](../../../reports/klein-x1-5-pro/overview.md) selects four current-source native cells from `1bf5187012bad86ab324679b05dfc0a712896f80`: warm CPU, warm WebGPU, cached CPU resources and cached WebGPU resources. These cells are kept separate from earlier-source results.

## Earlier CPU result

Historical receipt [`2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3`](../../../results/2026-11-18t07-33-51-166z-klein-tts-x1.5-pro-cpu-warm-95c8a5c3/summary.md) uses source `ba9785f716cf24724e9a9c0a398abdb56efd5e2c`. During that CPU campaign, brief unrelated disk-cache maintenance was recorded at approximately 07:40 UTC: unused npm download caches were removed (about 2.49 seconds). At approximately 07:42 UTC, one unused historical Ming v2 cached GGUF exact duplicate was removed after its duplicate/re-download status was verified (under 1 ms), near the trial-1/trial-2 boundary. The exact phase of the latter event is uncertain. The effect of either event on timing or resource use was not measured; no impact estimate or timing adjustment is made.

The earlier WebGPU attempt from the same source is retained separately as an initialization error caused by concurrent WebGPU session creation. That issue was fixed in [PR #109](https://github.com/ngelik/tts-bench/pull/109); it is not pooled with the current-source cells.

## Post-score file operations

After all Klein timed cells and resource sampling finished (after approximately 12:27 UTC), two local full-WAV read/hash/clip operations took about 5.2 seconds each before the approximately 12:47 UTC coordinator update about Linnet WebGPU warm work. Their exact timestamps and whether they overlapped Linnet warm-up or its first scored trial are uncertain. These post-score file operations cannot affect the already completed Klein measurements. Their effect on Linnet timing and resource measurements is unknown; no impact estimate or adjustment was made to that campaign.
