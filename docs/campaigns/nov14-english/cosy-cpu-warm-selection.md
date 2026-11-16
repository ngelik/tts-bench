# Fun-CosyVoice3 CPU warm generation, two completed articles

Fun-CosyVoice3 generated the 20,000-character English article in a median of **4 h 11 min 59 s** on the MacBook Pro with an Apple M1 Pro (eight cores, 16 GiB), using four WASM threads in headed Chrome 157.0.8103.40. One full article warmed the runtime before timing. The operator stopped the run during trial 3 at the user’s request. Both completed trials are included. The original five-repetition run records the browser closure as an error. [Original native receipt](../../../results/2026-11-15t22-58-44-576z-fun-cosyvoice3-0.5b-2512-cpu-warm-de0f943e/result.json) · [Selection](cosy-cpu-warm-selection.json) · [Original plan](plan.json)

| Full article | Generation (s) | First PCM (s) | Output duration (s) | Generation / output |
| --- | ---: | ---: | ---: | ---: |
| Excluded warm-up | 15,355.813 | 180.188 | 1,204.00 | 12.754× |
| Scored trial 1 | 15,094.720 | 208.386 | 1,181.68 | 12.774× |
| Scored trial 2 | 15,143.551 | 186.316 | 1,183.40 | 12.797× |
| **Median of two scored trials** | **15,119.136** | **197.351** | **1,182.54** | **12.785×** |

Each article returned finite, nonempty 24 kHz PCM for all 93 source spans. The default sampler is unseeded. These three renders have different output durations and PCM hashes. The harness scheduled its WAV export for trial 5, so the two scored renders are available as measurements only. The separately recorded **CPU cached** run uses the same source revision, model assets, voice and Chrome environment. [Play the CPU cached example](https://ngelik.github.io/tts-bench/audio/?sample=2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu.wav) · [Full CPU cached WAV](https://github.com/ngelik/tts-bench/releases/download/benchmark-audio-v1/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4--fun-cosyvoice3-0.5b-2512--cpu-full.wav) · [Cached receipt](../../../results/2026-11-14t19-46-27-024z-fun-cosyvoice3-0.5b-2512-cpu-cached-7c12aec4/result.json)

## Verify the selection

The native receipt SHA-256 is `1ef277d6bfc1aea5029d55faf51380701a941f39583f83c2fb73fab91bd04d17`. Each checkpoint below is present in the receipt. To reproduce its original file digest, serialize its indicated object with two-space JSON indentation plus a trailing newline, then hash those UTF-8 bytes.

| Checkpoint in the native receipt | Checkpoint file SHA-256 |
| --- | --- |
| `cells[0].warmup[0]` | `fa7f92c3429e109ab0875a83bc9739cc5462ab6db7992150796786d1dea81ab9` |
| `cells[0].trials[0]` | `38b85083abd72aa72d95ba8bdaa2ea4dcd0183cb23a73a66c2a138b2eef8e35a` |
| `cells[0].trials[1]` | `e24f6cee55783490d99f95fe79dbfe51b14d889639440f6f513149a36103c8d5` |
