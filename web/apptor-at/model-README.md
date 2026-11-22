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
- austrian-german
- onnx
- cpu
- browser
- onnxruntime-web
- tiny-voca
- vocos
---

# apptor-tiny-tts-at (Austrian German, v0.2)

A tiny German text-to-speech model with an **Austrian accent you can turn up or down**: from Hochdeutsch (0) to
Austrian (1.0) and a bit beyond (up to 1.6). 4.5M parameters, one 21 MB ONNX file, two synthetic voices (`M2`
male, `F2` female), 24 kHz. Runs on the CPU and **directly in the browser**, without eSpeak, without a server.

**Try it:** [tiny-tts.apptor.at](https://tiny-tts.apptor.at) (everything runs on your device).

This is **version 0.2, an early preview**. The accent is still mild and does not sit in every word: better than
nothing, but not fully Austrian yet. It was trained on a single GPU. Feedback is welcome on
[X @apptor_at](https://x.com/apptor_at).

Why: speech output almost always sounds German-German. This model is meant to give Austrians a voice that is
closer to how they speak, in small, lightweight applications where big models do not fit.

Listen: `samples/hobellied-M2-accent-0.wav` (Hochdeutsch), `-accent-1.0.wav` (Austrian), `-accent-1.6.wav`
(strongest usable setting).

## Three ways to use it

| you want | use | needs |
|---|---|---|
| a voice on your website / web app | the `web/` folder | any web server that can set two headers |
| a voice in a Python program | `speak.py` and the ONNX files | `pip install onnxruntime numpy num2words` |
| a complete voice assistant (listen, decide, speak) | [flash-voice](https://github.com/ViktorsGitUser/flash-voice) on GitHub | see there |

Download everything: `git clone https://huggingface.co/apptor/apptor-tiny-tts-at` (with git-lfs), or
`hf download apptor/apptor-tiny-tts-at --local-dir apptor-tiny-tts-at`.

### Web

`web/` is exactly the demo site: `index.html`, `apptor-tts.js` (front end + synthesis, plain ES module),
the models and [ONNX Runtime Web](https://onnxruntime.ai) 1.20.1. No build step, no npm. Copy the folder to a web
server. The included `.htaccess` (Apache) sets the two headers that let the browser use several CPU cores:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them it still works, just on one core. Opening `index.html` as a file (`file://`) does not work; to try
it locally run `python web/serve.py` and open http://127.0.0.1:8000/. The first visit downloads about 50 MB, which the page keeps in the browser
cache. To use it in your own page, see the `<script type="module">` at the end of `index.html`: load the models,
then

```js
const audio = await voice.speak("Servus!", {voice: "M2", accent: 1.0});   // Float32Array, 24 kHz
```

### Python

```bash
pip install onnxruntime numpy num2words
python speak.py "Grüß Gott! Am 3. Mai um 18:30 Uhr kostet das Ticket 12,50 Euro." --out test.wav
python speak.py "Servus, wie geht's dir?" --voice F2 --accent 0 --out hochdeutsch.wav
```

```python
from speak import Speaker
s = Speaker()                                    # finds the models next to speak.py
audio = s.speak("Servus!", voice="M2", accent=1.0)   # float32 numpy array, 24 kHz
```

## Files

| file | what | license |
|---|---|---|
| `apptor-tiny-tts-at.onnx` / `.json` | speech model: phoneme tokens -> 24 kHz audio, with `accent` input | Apache-2.0 |
| `apptor-g2p-de.onnx` / `.json` | letters -> phonemes (conv + BiGRU + CTC, 12 MB), replaces eSpeak NG | Apache-2.0 |
| `apptor-vocos-de.int8.onnx` | sound filter: [Vocos](https://github.com/gemelo-ai/vocos) fine-tuned on the two voices, int8 | MIT |
| `tinyvoca/` | German text front end: numbers, dates, times, tokens, G2P wrapper, word lists | Apache-2.0 |
| `speak.py` | Python example and small library | Apache-2.0 |
| `web/` | the browser demo, complete (same models + ONNX Runtime Web, MIT); `serve.py` for local tests | Apache-2.0 / MIT |

ONNX inputs of the speech model: `tokens`, `stress` (int64 [1, N]), `voice` (int64 [1]: 0 = F2, 1 = M2),
`speed`, `pitch_shift`, `pitch_range` (float32 [1]; normally 1 / 0 / 1), `accent` (float32 [1]: 0 Hochdeutsch,
1.0 Austrian, up to 1.6; above that it breaks). At most 512 tokens per call; `speak.py` and `apptor-tts.js`
split long text into sentences. When the accent is on (>= 0.5), a short list of Austrian readings is used
(Kaffee, Tabak, Mathematik, Chemie, China ...).

## How it was made

- **Base:** [apptor-tiny-tts](https://huggingface.co/apptor/apptor-tiny-tts), the German model built on the
  [tiny-voca](https://github.com/n4ze3m/tiny-voca) architecture by n4ze3m (not an official tiny-voca release).
- **Accent:** fine-tuned for 24k steps on one RTX 5060 Ti with 8,208 Austrian recordings from
  [Mozilla Common Voice](https://commonvoice.mozilla.org) German (CC0), next to the two synthetic voices. The
  Austrian speakers share one *style* (pronunciation and melody); the *voice* (timbre) stays F2 or M2. The accent
  slider moves between the voice's own style and the Austrian style.
  v0.2: 10k more steps (on an RTX 3090) in which only the 26 speakers rated most clearly Austrian form the style,
  so the accent is stronger at the same setting. All real speakers were removed from the
  exported model: it can only speak with the two synthetic voices.
- **Voices:** synthetic, made with Qwen3-TTS (Apache-2.0) built-in voices; not clones of real people.
- **Front end without eSpeak:** the G2P model learned the eSpeak NG readings of ~480,000 words from the Common
  Voice sentences (98% of words identical on held-out data), plus a hand-written list for first names and
  Austrian readings. So no GPL program is needed at run time.

## Limitations

- v0.2: the accent is mild, not dialect; the strongest settings (around 1.6) still sound a little distorted. Some words and names are still pronounced oddly.
- German only. English words are read with German pronunciation.
- Not studio quality; without the sound filter the voice is buzzy.

## Deutsch

Eine kleine deutsche Stimme, die auch (etwas) österreichisch kann: Akzent stufenlos von Hochdeutsch (0) bis
österreichisch (1,0, maximal 1,6). 4,5 Mio. Parameter, läuft auf der CPU und direkt im Browser, ohne eSpeak und
ohne Server. Version 0.2, eine frühe Vorschau, trainiert auf einer einzigen Grafikkarte. Der Akzent ist noch
dezent: besser als nichts, aber noch nicht ganz österreichisch. Ausprobieren: [tiny-tts.apptor.at](https://tiny-tts.apptor.at).
Rückmeldungen gern auf [X @apptor_at](https://x.com/apptor_at). Apache 2.0, also auch kommerziell nutzbar.

## Credits

- [tiny-voca](https://github.com/n4ze3m/tiny-voca) by n4ze3m: architecture, training recipe, text front end (Apache-2.0)
- [Mozilla Common Voice](https://commonvoice.mozilla.org) German (CC0): Austrian recordings, texts
- [Vocos](https://github.com/gemelo-ai/vocos), `charactr/vocos-mel-24khz` (MIT)
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0): synthetic training voices
- [ONNX Runtime Web](https://onnxruntime.ai) (MIT), num2words (LGPL-2.1, installed separately)
- Sample text: Ferdinand Raimund, "Hobellied" (1834, public domain)
