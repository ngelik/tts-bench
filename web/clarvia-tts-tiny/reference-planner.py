"""Adapted incremental browser planner from Clarvia's Apache-2.0 speak.py."""
import json
import re
import clarvia_phonemizer

_SENTENCE_END = re.compile(r'(?<=[.!?…])\s+(?=["\'(\[]?[A-ZÇĞİÖŞÜ0-9])')
_config = None
_pending = []


def configure(config):
    global _config
    _config = config


def sentences(text):
    text = re.sub(r"\s+", " ", text).strip()
    if text and not re.search(r"[.!?…,;:][\"'”’)\]»]*$", text):
        text += "."
    return [part for part in _SENTENCE_END.split(text) if re.search(r"\w", part)]


def begin_text(text):
    global _pending
    _pending = sentences(text)


def next_plan():
    global _pending
    while _pending:
        sentence = _pending.pop(0)
        try:
            phones = clarvia_phonemizer.phonemize(sentence)
        except ValueError:  # signs only, matching the pinned upstream worker
            continue
        if len(phones.ids) > _config['max_tokens'] - 12:
            parts = re.split(r'(?<=[,;:])\s+', sentence)
            if len(parts) == 1:
                words = sentence.split()
                parts = [' '.join(words[:len(words) // 2]), ' '.join(words[len(words) // 2:])] if len(words) > 1 else []
            _pending = parts + _pending
            continue
        return dict(sentence=sentence, ids=list(phones.ids), stress=list(phones.stress), unknown=list(phones.unknown))
    return None


def audit_text(text):
    rows = []
    for sentence in sentences(text):
        for plan in _plans(sentence):
            plan['normalized'] = clarvia_phonemizer.normalize(plan['sentence'])
            rows.append(plan)
    return rows


def _plans(sentence):
    global _pending
    previous = _pending
    _pending = [sentence]
    plans = []
    while True:
        plan = next_plan()
        if plan is None:
            break
        plans.append(plan)
    _pending = previous
    return plans


def audit_json(text):
    return json.dumps(audit_text(text), ensure_ascii=False)


def next_json():
    plan = next_plan()
    return json.dumps(plan, ensure_ascii=False) if plan is not None else ''
