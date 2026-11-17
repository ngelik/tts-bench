# Small TTS family comparison

Five of the families in Eren Golge’s comparison were missing from the Chrome benchmark on November 17, 2026. The table identifies the English checkpoints selected for our M1 Pro runs. [Source comparison](https://erogol.com/small_tts_bench/) · [Reference results at selection](https://github.com/ngelik/tts-bench/tree/f456cce4422663e3217a885a4c52e8ef4735dd6d#reference-results)

| Family | Selected checkpoint |
| --- | --- |
| Linnet | [VoxRT/linnet-en-35m](https://huggingface.co/VoxRT/linnet-en-35m) |
| SupraTTS | [SupraLabs/SupraTTS-1.0-Preview](https://huggingface.co/SupraLabs/SupraTTS-1.0-Preview) |
| Silencio | [BlueRoseLabs/Silencio-2](https://huggingface.co/BlueRoseLabs/Silencio-2) |
| Klein-TTS | [klein-ml/Klein-TTS-X1.5-Pro](https://huggingface.co/klein-ml/Klein-TTS-X1.5-Pro) |
| Sopro | [samuel-vitorino/sopro-v2-turbo](https://huggingface.co/samuel-vitorino/sopro-v2-turbo) |

Eight entries have existing family coverage: Phonon, Tiny Voca, Mach Boom, Paradee, Pocket TTS, Kokoro, Underdog Woof and Inflect. The source names nano-edge-tts as a Kokoro variant and lists both Silencio and Silencio-2. Selecting by family gives Kokoro its existing result and Silencio a single new entry. Phonon and Woof have historical measurements. Mach Boom has a CPU measurement and an unsupported GPU result.

## Measurements

Each supported backend runs the fixed 20,000-character English article in headed Google Chrome on the eight-core, 16 GiB Apple M1 Pro. One full warm-up precedes five timed articles. A separate cached article provides average Chrome process-tree memory during generation. The warm timing includes model output through the final CPU-readable audio samples. The configuration records the selected voice and precision, including any backend-specific differences. [Benchmark protocol](../../PROTOCOL.md) · [Memory measurement](../../MEMORY.md)

The source comparison used five shorter texts and a Linux AMD EPYC CPU. Its audio and timings belong to that experiment. For these browser runs, the reference table links each submitted receipt, and the dashboard displays its associated audio when available. [Browser comparison and recordings](https://ngelik.github.io/tts-bench/?models=linnet-en-35m,supratts-1.0-preview,silencio-2,klein-tts-x1.5-pro,sopro-v2-turbo)
