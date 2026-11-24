"""Blue-Buff benchmark-only Chinese source splitter, zh-natural-boundary-v1.

The pinned upstream frontend still owns normalization, pinyin, tone sandhi,
symbols and token IDs. This module only chooses internal text slices before
calling that frontend. It returns exact source substrings and never edits,
drops, reorders, or appends text.
"""
from __future__ import annotations

import re
from typing import Callable

POLICY_ID = 'zh-natural-boundary-v1'
POLICY_VERSION = 1
DEFAULT_TOKEN_TARGET = 240
SENTENCE_PUNCTUATION = re.compile(r'[。！？!?…]+[”’」』）》]*')
CLAUSE_PUNCTUATION = re.compile(r'[；，、：;,:]+[”’」』）》]*')


def _has_content(text: str) -> bool:
    return any(char.isalnum() for char in text)


def _select_cut(text: str, candidates: list[int]) -> int | None:
    valid = [at for at in candidates if 0 < at < len(text)
             and _has_content(text[:at]) and _has_content(text[at:])]
    if not valid:
        return None
    return min(valid, key=lambda at: (abs(at - len(text) / 2), at))


def split_source(text: str, jieba_module) -> tuple[str, str]:
    """Cut after the nearest natural punctuation/word boundary to the center.

    Sentence marks are preferred, then clause marks, then pinned Jieba word
    boundaries. Closing quote/bracket marks stay with the preceding text.
    """
    if not isinstance(text, str) or len(text) < 2:
        raise ValueError('A single-character source piece cannot be split')
    for pattern in (SENTENCE_PUNCTUATION, CLAUSE_PUNCTUATION):
        at = _select_cut(text, [match.end() for match in pattern.finditer(text)])
        if at is not None:
            return text[:at], text[at:]
    at = _select_cut(text, [end for _, _, end in jieba_module.tokenize(text, HMM=False)])
    if at is None:
        raise ValueError(f'No natural source-preserving Mandarin boundary in {text[:48]!r}')
    return text[:at], text[at:]


def plan_piece(text: str, phonemize: Callable, jieba_module, token_target: int = DEFAULT_TOKEN_TARGET,
               source_start: int = 0) -> list[dict]:
    """Recursively create exact source pieces and token/tone vectors."""
    if not isinstance(token_target, int) or token_target < 3:
        raise ValueError('token_target must be an integer of at least three')
    result = phonemize(text)
    if len(result.ids) > token_target:
        left, right = split_source(text, jieba_module)
        if left + right != text or not left or not right:
            raise AssertionError('split policy failed exact source reconstruction')
        return (plan_piece(left, phonemize, jieba_module, token_target, source_start) +
                plan_piece(right, phonemize, jieba_module, token_target, source_start + len(left)))
    if len(result.ids) < 3 or len(result.ids) != len(result.stress):
        raise ValueError('The pinned frontend returned invalid token/tone vectors')
    if result.unknown:
        raise ValueError(f'Unknown Mandarin source graphemes: {result.unknown!r}')
    return [{
        'text': text,
        'sourceStart': source_start,
        'sourceEnd': source_start + len(text),
        'ids': list(result.ids),
        'stress': list(result.stress),
        'unknown': [],
    }]
