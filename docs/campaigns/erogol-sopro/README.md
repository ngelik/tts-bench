# Sopro v2 Turbo measurements

The [CPU profile report](../../../reports/erogol-sopro-cpu/overview.md) and [GPU profile report](../../../reports/erogol-sopro/overview.md) separate warm synthesis from cached resource observations. The [runtime and voice notes](../../../web/sopro/NOTICE.md) identify the official frontend, fixed synthetic English prompt and source pins.

## Profile download sizes

The dashboard's 509.82 MB model size is the union of the registered CPU and GPU model files, deduplicating shared files. Each individual profile uses the graph-and-weight closure below. Runtime, tokenizer, prompt and licensing files add bytes beyond those closures. MB uses 1,000,000 bytes.

| Export profile | Graph and weight bytes | MB |
| --- | ---: | ---: |
| CPU wasm-uint8 | 338,588,731 | 338.59 |
| GPU webgpu-fp16 | 363,318,207 | 363.32 |
| Both profiles staged together | 509,819,881 | 509.82 |

These sizes are computed from pinned asset files. The [official pinned export manifest](https://huggingface.co/samuel-vitorino/sopro-v2-turbo-onnx/blob/9fe97bddf52ed785af3634db86a032bb7e07bf18/manifest.json) defines the profiles. CPU and GPU use different precisions, so the measured times describe those distinct configurations.

The CPU clean cached trial recorded 294,537,796 HTTP body bytes during navigation and generation. Its GPU counterpart recorded 191,331,908 bytes. These counters reflect the warmed browser cache in the specific cached scenario. A full first installation requires its complete profile and dependencies. Dividing body bytes by 125,000 gives an ideal transfer-time estimate at 1 Mbps; the campaign did not measure throttled connectivity.

The original CPU resource diagnostic and the clean repeat remain separately identifiable in the [resource-deviation note](resource-deviation.md). The selected repeat supplies the current mean-memory observation.
