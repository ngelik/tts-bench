---
license: apache-2.0
language:
- de
pipeline_tag: text-to-speech
library_name: onnx
tags:
- tts
- text-to-speech
- german
- onnx
- cpu
- tiny-voca
- vocos
---

# apptor-tiny-tts (German)

A tiny German text-to-speech model that runs on the CPU: **4.5M parameters, one 21 MB ONNX file**, about 40x faster
than real time on four CPU threads. Two voices: `F2` (female) and `M2` (male), 24 kHz.

It is built on **[tiny-voca](https://github.com/n4ze3m/tiny-voca) by n4ze3m**: same architecture and training
recipe, retrained from scratch for German. This is **not an official tiny-voca release**. Thanks to n4ze3m for the
model and the idea.

A second stage, a [Vocos](https://github.com/gemelo-ai/vocos) vocoder fine-tuned on the two voices, re-synthesises
the waveform and removes most of the buzzy sound of the tiny built-in generator. Since November 2026 it ships as an
int8 ONNX file (17 MB), so no PyTorch is needed, and it is on by default.

**New (2026-11-19): no eSpeak NG needed any more.** A small letter-to-sound model (`apptor-g2p-de.onnx`, Apache-2.0)
replaces the eSpeak NG program, so the whole thing needs only `onnxruntime`, `numpy` and `num2words`, and it also
runs in the browser. There is also an Austrian-accented version with an accent slider:
[apptor-tiny-tts-at](https://huggingface.co/apptor/apptor-tiny-tts-at), demo at
[tiny-tts.apptor.at](https://tiny-tts.apptor.at).

Listen: `samples/demo.wav` (with Vocos) and `samples/demo-without-vocos.wav`.

## Files

| file | what | license |
|---|---|---|
| `apptor-tiny-tts-de.onnx` | the TTS model (text tokens -> 24 kHz audio) | Apache-2.0 |
| `apptor-tiny-tts-de.json` | sample rate, voices, phoneme symbols, limits | Apache-2.0 |
| `apptor-g2p-de.onnx` / `.json` | letters -> phonemes (conv + BiGRU + CTC, 12 MB), replaces eSpeak NG | Apache-2.0 |
| `apptor-vocos-de.int8.onnx` | sound filter: Vocos fine-tuned on the two voices, as ONNX (int8) | MIT |
| `apptor-tiny-tts-vocos-de.pt` | the same Vocos as PyTorch state dict (for `vocos` + torch users) | MIT |
| `tinyvoca/` | German text front end: number normalisation, tokens, G2P wrapper with a list of first names | Apache-2.0 |
| `speak.py` | Python example and small library | Apache-2.0 |

## Use

```bash
pip install onnxruntime numpy num2words
python speak.py "Am 3. Mai um 18:30 Uhr kostet das Ticket 12,50 Euro." --voice M2 --out test.wav
python speak.py "Hallo, wie geht es dir?" --voice F2 --no-vocos --out test.wav    # without the sound filter
```

```python
from speak import Speaker
s = Speaker()                                  # finds the models next to speak.py
audio = s.speak("Hallo!", voice="F2")          # float32 numpy array, 24 kHz
```

ONNX inputs: `tokens` and `stress` (int64 [1, N], from `tinyvoca.g2p_de.phonemize`), `voice` (int64 [1], index into
`voices`), `speed`, `pitch_shift`, `pitch_range` (float32 [1]; 1.0 / 0.0 / 1.0 for normal). Outputs: `audio`
(float32 [1, samples]) and `durations`. At most 512 phoneme tokens per call; split longer text into sentences.

It is also a voice of [flash-voice](https://github.com/ViktorsGitUser/flash-voice) (`services/tinytts_server.py`,
same HTTP API as the other voices there), as an Apache-2.0 alternative to the German Phonon model, which is
CC BY-NC 4.0 (non-commercial only).

## Training

- **Data:** about 12 hours of synthetic German speech, ~15,000 utterances, made with
  [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) 1.7B Base (Apache-2.0) with two of its built-in voices. Texts:
  Mozilla Common Voice German sentences (CC0). Utterances were screened with Whisper.
- **Front end:** trained on eSpeak NG `de` phonemes, 67 phoneme symbols (the English inventory of tiny-voca replaced by a German one),
  German number/date/time normalisation. At run time the G2P model produces the same phonemes: it learned the
  eSpeak readings of ~480,000 words from the Common Voice sentences (98% of held-out words identical).
- **Model:** tiny-voca recipe, 82k steps on one RTX 3090 (about 10 hours).
- **Vocoder:** Vocos fine-tuned for about 60k steps on an RTX 5060 Ti: input is tiny-voca's own teacher-forced
  waveform, target the recording.
- Data, training and tuning took about 12.5 hours on one Sunday.

**Evaluation** (Whisper large-v3-turbo, word error rate): 5.0% on 16 unseen sentences (F2 4.6%, M2 5.5%).

## Limitations

- German only. English words are read with German pronunciation.
- The sound is clear but not studio quality; without Vocos it is noticeably buzzy.
- A word-final long "a" before a comma is sometimes drawn out ("Anna, ...").
- The voices are synthetic (Qwen3-TTS built-in voices), not clones of real people.

## Deutsch

Ein winziges deutsches TTS-Modell für die CPU (4,5M Parameter, 21 MB ONNX), auf Basis von tiny-voca von n4ze3m
nachtrainiert, mit Vocos-Klangfilter. Seit 19.11.2026 ohne eSpeak NG: nur onnxruntime, numpy und num2words, läuft
auch im Browser. Österreichische Variante: [apptor-tiny-tts-at](https://huggingface.co/apptor/apptor-tiny-tts-at). Gewichte und Code unter Apache 2.0, also auch kommerziell nutzbar,
der Vocoder unter MIT. Keine offizielle tiny-voca-Version.

## Credits

- [tiny-voca](https://github.com/n4ze3m/tiny-voca) by n4ze3m: architecture, training recipe, text front end (Apache-2.0)
- [Vocos](https://github.com/gemelo-ai/vocos), `charactr/vocos-mel-24khz` (MIT)
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0): training speech
- [Mozilla Common Voice](https://commonvoice.mozilla.org) German (CC0): texts
- [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (GPL-3.0): phonemes for training and for teaching the G2P model; not
  included and not needed at run time. num2words (LGPL-2.1, installed separately)
