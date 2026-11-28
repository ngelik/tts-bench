# Multilingual browser benchmark campaign

The [campaign matrix](matrix.tsv) lists 163 new combinations across nine model families and 31 registered article editions. It specifies 53 CPU and 110 hardware WebGPU runs. English is already covered. LFM3 Audio and Omni use the Fusor q7 export for CPU and GGUF for WebGPU. Ming uses Fusor for CPU and GGUF for WebGPU. ZONOS3-Mini, Fun-CosyVoice3 and Audio8 are scheduled for WebGPU.

## Run and publish

1. Use the fixture ID and SHA-256 in the matrix. Verify the pinned assets, voice, resolved language and effective backend in disposable headed Chrome on the reference Apple M1 Pro. Require actual hardware compute dispatch for WebGPU.
2. Run the full article with `--scenario warm --warm-protocol v3 --repetitions 1`. A campaign cell uses `scenario: "warm"`, `warmProtocol: "v3"` and `repetitions: 1`. Perform the measurements sequentially.
3. Collect Chrome process-tree RSS during the one excluded full-article warm-up. Then record generation time, first audio and full output for the single scored article with RSS sampling disabled. The same receipt carries both measurements. The published score reports one observation.
4. Link the native receipt and the 30-second opening from the scored article. Keep the full WAV in local storage. Review and publish one results PR per model family, then verify the scores, memory labels, receipt links and audio on the deployed boards.

See the [full protocol](../../PROTOCOL.md) and [memory method](../../MEMORY.md).
