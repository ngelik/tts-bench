#!/usr/bin/env python3
"""Reproduce the tiny-voca-he stock sentence/shorter planner subset.

The extracted module is checked against the exact file hash in assets.lock.json.
This is build-time reproducibility tooling, not a browser runtime asset.
"""
import argparse
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT / 'src_tiny_voca_infer.py')
parser.add_argument('--output', type=Path, default=REPO / 'web/tiny-voca-he/stock_planner.py')
args = parser.parse_args()
source = args.source.read_text(encoding='utf-8')
tree = ast.parse(source)
names = {'_SPACE', '_SENTENCE_END', 'SPOKEN_TOKENS', '_NOT_AN_END', '_CLAUSE_END', '_TEXT_END', '_CLOSING'}
functions = {'sentences', 'finished', 'shorter'}
fragments = []
for node in tree.body:
    if isinstance(node, ast.Assign) and names.intersection(t.id for t in node.targets if isinstance(t, ast.Name)):
        fragments.append(ast.get_source_segment(source, node))
    elif isinstance(node, ast.FunctionDef) and node.name in functions:
        fragments.append(ast.get_source_segment(source, node))
if len(fragments) != len(names) + len(functions):
    raise SystemExit('Pinned planner source shape changed; review extraction before updating.')
args.output.write_text('import re\n\n' + '\n\n'.join(fragments) + '\n', encoding='utf-8')
