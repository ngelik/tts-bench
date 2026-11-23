# NOTICE

tiny-voca-ar: model weights and code are licensed under Apache-2.0 (see LICENSE).

This model was trained on synthetic speech made from text and a reference voice that are licensed under the
Creative Commons Attribution 4.0 International licence (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/).
Attribution:

- **ClArTTS**: Classical Arabic Text-to-Speech corpus, MBZUAI. Kulkarni et al., "ClArTTS: An Open-Source Classical
  Arabic Text-to-Speech Corpus", Interspeech 2023 (arXiv:2303.00069). https://huggingface.co/datasets/MBZUAI/ClArTTS.
  Used: the diacritized transcripts of the train split (text only). Changes: whitespace trimmed; rows the front
  end could not read were dropped.
- **Arabic Speech Corpus**: Nawar Halabi, 2016. http://en.arabicspeechcorpus.com/. Used: 65 diacritized sentences
  (Buckwalter transcripts converted to Arabic script) and one 14-second studio recording, used as the teacher's
  reference voice. Changes: transliteration to Arabic script; the recording was resampled to 24 kHz.

CC BY 4.0 does not license publicity, privacy or similar personality rights (section 2(b)(1)).

Upstream: tiny-voca, copyright Muhammed Nazeem, Apache-2.0, https://github.com/n4ze3m/tiny-voca.
Teacher: SILMA TTS (silma-ai/silma-tts), Apache-2.0 weights, MIT code. Its outputs carry no licence restriction.
