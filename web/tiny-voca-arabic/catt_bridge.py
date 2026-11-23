"""Pinned tokenizer and in-worker phrase-cache bridge for browser CATT."""
import json
import os
import numpy as np
from catt_tashkeel.tokenizer import TashkeelTokenizer
from catt_tashkeel.utils import remove_non_arabic

tokenizer = TashkeelTokenizer()

def encode_batch_json(payload):
    texts = json.loads(payload)
    rows = [tokenizer.encode(remove_non_arabic(text), test_match=False)[0] for text in texts]
    return json.dumps({
        "sourceIds": [row.tolist() for row in rows],
        "sourcePadId": tokenizer.letters_map['<PAD>'],
        "targetBosId": tokenizer.tashkeel_map['<BOS>'],
        "targetPadId": tokenizer.tashkeel_map['<PAD>'],
        "spaceId": tokenizer.letters_map[' '],
        "targetNoTashkeelId": tokenizer.tashkeel_map[tokenizer.no_tashkeel_tag],
    })

def decode_batch_json(source_json, target_json):
    return json.dumps(tokenizer.decode(np.asarray(json.loads(source_json), dtype=np.int64),
                                       np.asarray(json.loads(target_json), dtype=np.int64)), ensure_ascii=False)

def reset_text_cache():
    import tiny_voca_ar.text as frontend
    if os.environ.get('TINY_VOCA_DIACRITIZED'):
        raise RuntimeError('External diacritization cache is outside this browser profile')
    frontend._cache = {}
    def browser_only(phrases, batch_size=32):
        raise RuntimeError('CATT phrase missed the browser cache; refusing native or network fallback')
    frontend.af.diacritize = browser_only

def missing_frontend_phrases_json(text):
    import tiny_voca_ar.text as frontend
    phrases = [phrase for phrase, _ in frontend.af.split_phrases(text)]
    return json.dumps({'instances': len(phrases), 'phrases': [p for p in phrases if p not in frontend._cache]}, ensure_ascii=False)

def install_frontend_phrases_json(phrases_json, outputs_json):
    import tiny_voca_ar.text as frontend
    phrases, outputs = json.loads(phrases_json), json.loads(outputs_json)
    if len(phrases) != len(outputs) or any(not isinstance(value, str) for value in outputs):
        raise ValueError('CATT output count differs from the missing phrase count')
    frontend._cache.update(zip(phrases, outputs))
