import json
import sys
import types
import unicodedata
import numpy as np


class BrowserSession:
    def __init__(self, path, session_options=None):
        self.outputs = None

    def get_modelmeta(self):
        return types.SimpleNamespace(custom_metadata_map=json.loads(renikud_metadata_json))

    def get_inputs(self):
        return [types.SimpleNamespace(name=name) for name in json.loads(input_names_json)]

    def run(self, names, feeds):
        if self.outputs is None:
            raise RuntimeError('Missing browser RenikudPlus outputs')
        outputs = self.outputs
        self.outputs = None
        if self.feeds != {key: value.reshape(-1).tolist() for key, value in feeds.items()}:
            raise RuntimeError('Browser RenikudPlus input differs from stock input')
        return [outputs[name] for name in names]


ort = types.ModuleType('onnxruntime')
ort.InferenceSession = BrowserSession
sys.modules['onnxruntime'] = ort
sys.path.insert(0, '/hebrew')
import renikud_onnx as renikud
import text as tv

g2p = renikud.G2P('browser-model')


def prepare(text):
    text = tv.normalize_text(text)
    if not tv._HEBREW.search(text):
        return json.dumps({'direct': text, 'windows': []})
    if renikud.contains_digit(text):
        text = renikud.normalize_numbers(text)
    text = renikud.normalize_graphemes(text)
    normalized, constraints = g2p._read_input(unicodedata.normalize('NFD', text), None)
    if g2p.niqqud != 'strip' or constraints is not None:
        raise RuntimeError('The released Hebrew profile uses the default strip mode')
    windows = []
    for window in renikud.split_for_decode(normalized, limit=g2p._chunk_chars):
        ids, mask, _ = g2p._tokenize(window)
        feeds = {'input_ids': ids, 'attention_mask': mask}
        if g2p.supports_gender:
            feeds.update(speaker=[0], target_speaker=[0])
        windows.append({'text': window, 'feeds': feeds})
    return json.dumps({'normalized': text, 'windows': windows}, ensure_ascii=False)


def decode_window(window, feeds, results):
    g2p._session.feeds = json.loads(feeds)
    g2p._session.outputs = {name: np.asarray(item['data'], dtype=np.float32).reshape(item['dims']) for name, item in json.loads(results).items()}
    return g2p._phonemize_window(window)


def acoustic_plan(ipa, original):
    renikud.check_no_raw_hebrew(ipa, original, mode='raise', where='browser')
    phonemes = tv.phonemize(ipa)
    return json.dumps({'ipa': ipa, 'ids': phonemes.ids, 'stress': phonemes.stress, 'unknown': phonemes.unknown}, ensure_ascii=False)
