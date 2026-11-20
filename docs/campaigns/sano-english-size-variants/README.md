# Sano English size variants

This is a separate native CPU/WASM comparison of official Ampixa SanoTTS English voices. It uses source commit `8b929d8e68834b101dd1992981e9b04640222748`, the `english-20k-v1` fixture (20,000 characters, 93 canonical spans), one excluded full-article warm-up, then five scored full articles per model. The runs used headed Google Chrome 157.0.8103.40 on the Apple M1 Pro 8-core / 16 GiB baseline, with the machine on AC power. Each model retains its own native receipt and audio provenance.

## Completed warm results

| Model | Voice profile | Output | Median generation | Receipt |
|---|---|---:|---:|---|
| `sano-heart` | Heart, 2.27M parameters | 24 kHz | 242.94 s (n=5) | [result report](../../../results/2026-11-19t05-34-55-044z-sano-heart-cpu-warm-eff21fdc/summary.md) |
| `sano-hfc` | HFC, 1.83M parameters | 22.05 kHz | 612.95 s (n=5) | [result report](../../../results/2026-11-19t06-08-51-824z-sano-hfc-cpu-warm-eefb925d/summary.md) |

See the [campaign overview](../../../reports/sano-english-size-variants/overview.md) for the generated comparison. Kristin, Amy-small and Amy 1.8M native cells remain separate pending measurements; no values are implied for them here.

## HFC timing condition

A local `node tools/audio.mjs check` validation attempt overlapped HFC scored trial 2 for approximately 30 seconds around 2026-11-19 06:35 UTC. The command produced no output and was stopped with Ctrl-C (exit 130); it performed no model inference. Exact start/end seconds and its subphase within the article are unknown. The impact on the HFC timing is unknown, and no timing adjustment was made. Trial 2 measured 612.480 s; the other four scored trials had a median of 613.182 s, and the full five-trial range was 612.480–613.702 s. Trial 2 was not anomalously slow, but this does not prove the overlap had no effect. The additive [condition record](hfc-conditions.json) preserves the event without modifying the raw receipt.
