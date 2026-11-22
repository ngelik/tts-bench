"""Shared Japanese text boundaries for PyTorch and Torch-free ONNX inference."""

import re

_SPACE = re.compile('[\\s'+chr(0xFEFF)+']+')
_CLOSING = "\"'”’)]»」』）】〉》"


def japanese_finished(text):
    body=re.sub('[\\s'+chr(0xFEFF)+']+$','',text)
    end=body.rstrip(_CLOSING)
    return text if not end or end[-1] in '。！？.!?…、，,;:；：' else body+'。'


def japanese_sentences(text):
    text=_SPACE.sub(' ',text).strip()
    parts=[]
    start=0
    for match in re.finditer(r'[。！？!?]+[」』）】〉》”’"\')\]]*',text):
        parts.append(text[start:match.end()].strip())
        start=match.end()
    parts.append(text[start:].strip())
    return [part for part in parts if any(char.isalnum() for char in part)]


def japanese_shorter(text):
    parts=[part.strip() for part in re.split(r'(?<=[、，,;；：:])',text) if part.strip()]
    if len(parts)>1:return parts
    if len(text)<2:return []
    half=(len(text)+1)//2
    return [text[:half],text[half:]]
