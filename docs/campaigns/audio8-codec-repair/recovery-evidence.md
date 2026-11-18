# Audio8 CPU warm setup recovery

The native CPU warm attempt `2026-11-18t14-22-42-390z-audio8-realistic-0.6b-int4-cpu-warm-f13e8d18` ended during browser setup, before inference. Its immutable receipt records `Cache.put() encountered a network error`, zero warm-up trials, and zero scored trials. Its SHA-256 is `4143b316bdbf2537fe44bbb93d4fa6aebfc21c5279304866bae2e3afc6dddd25`. It is retained as a setup error, not reclassified as unsupported and not used as a score.

## Controlled no-inference probes

Both probes used clean source `9c7d880199e87a15a3959ae94b632f9d9cdd40da`, headed Chrome `157.0.8103.40` on arm64, and the normal local asset server and CacheStorage path. No ONNX sessions or synthesis ran.

The valid probe before cleanup ran from `2026-11-18T14:32:33.505Z` to `14:32:37.581Z` and is recorded by artifact SHA-256 `af096d5bc7f5811ee19398ddd43659d7476c898b31c64f760c67e84ee3bb7660`. Free disk declined from `4,976,295,936` to `4,549,615,616` bytes. The 260,741,440-byte `models/audio8-realistic/codec_decoder_fp16.onnx.data` response returned HTTP 200; a separate streamed read matched the asset lock's size and SHA-256 `18838f686aa7c1528fb69ec11e1ab404fdc4dc823d13219abfd4b327988527c0`. CacheStorage failed to store that response (`net::ERR_FAILED`).

At `2026-11-18T14:46:58.865733Z`, two verified-unused SDK compiler-cache trees and their generated activation markers were removed. The cleanup finished at `14:46:59.032573Z`. The recorded free-disk reading changed from `4,944,617,472` to `6,169,743,360` bytes, an increase of `1,225,125,888` bytes. The cleanup receipt is `coordination/erogol-family-benchmark/compiler-cache-cleanup.json` (SHA-256 `c5fa76b6c78f0c85ec32ba0e0ce713e4cdeda9bff9a025370f2edab15a4be04a`). It removed only SDK cache content, not model assets, source, benchmark receipts, or recordings. The Emscripten 6.0.13 cache can be restored with:

```sh
cd .cache/nov14/emsdk
./emsdk install 6.0.13
./emsdk activate 6.0.13
```

The same-source, same-Chrome no-inference probe then ran from `2026-11-18T14:48:10.570Z` to `14:48:13.875Z`; its artifact SHA-256 is `8e52baf523156f065e6183dc524458a7f01c30fb83ffb0dbd945256d74743320`. It stored and read back all nine model/runtime assets totaling `614,792,704` bytes with zero failed requests. Free disk was `6,167,298,048` bytes at start, reached a minimum of `5,224,431,616` bytes during the disposable browser profile, and returned to `6,166,835,200` bytes after profile cleanup.

The before/after correlation supports a storage-headroom hypothesis, but does not prove the Chrome BlobStorage limit or another specific subsystem caused the original failure. The initial diagnostic wrapper also had a harness error (`ReferenceError: bounded is not defined`) before any model asset was cached; its retained artifact is SHA-256 `cdf50259e32667d6169adf9c623f0c5574f70b9ca45facf1292465d5aedf6495`. That attempt is not model or browser-cache evidence.

## Recovery attempt

A separate retry on the unchanged source and configuration began as `2026-11-18t14-52-21-179z-audio8-realistic-0.6b-int4-cpu-warm-ed2138bb`. At the capture time (`2026-11-18T14:56:48.672Z`) it had entered the excluded `warmup-1` stage. This note records only that checkpoint; it makes no claim about the later retry outcome. The retry has its own native receipt and does not modify the preserved setup-error receipt.

The accompanying [machine-readable evidence](recovery-evidence.json) records the artifact hashes, byte counts, timestamps and interpretation boundaries.
