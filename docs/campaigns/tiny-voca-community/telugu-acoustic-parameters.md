# Sreekar Telugu INT8 preview acoustic parameters

The released acoustic graph has **931,232 scalar parameters** across 200 external FLOAT initializers. The separate pronunciation encoder and decoder are outside this count. The benchmark records 931,232 as a lower bound for the complete synthesis system.

| Publisher file | Download bytes | SHA-256 of downloaded gzip |
|---|---:|---|
| [ONNX graph](https://tts.hansda.in/assets/te-preview-perceptual-int8/voice.onnx.gz) | 29,292 | `f5d6e184669209f377906b919ea47028d952869eba03249662b4349da4eab01d` |
| [Packed weights](https://tts.hansda.in/assets/te-preview-perceptual-int8/model.weights.gz) | 967,398 | `d3a2ca425593d0cf77671b73e321b3a27f4bc01c52e8d407c58849d9a47a0e73` |

For each external initializer in the decompressed ONNX graph, multiply its dimensions and sum the products. Each tensor references a range in `voice.weights`. All 200 ranges match entries in the decompressed weight package’s JSON header. Sorted by offset, they cover 3,724,928 consecutive bytes. At four bytes per expanded FLOAT, this independently confirms 931,232 values. The preview’s INT8 label refers to its packed representation. [Publisher’s weight reader](https://github.com/DarvinX/multilingual-browser-tts/blob/f2977727b8baccb989f80b492ea8da00124ecba3/web/weights.js)
