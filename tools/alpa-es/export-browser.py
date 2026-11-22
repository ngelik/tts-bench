#!/usr/bin/env python3
"""Rebuild the pinned Alpa-es FP32 browser ONNX export."""
import hashlib
import json
from pathlib import Path
import sys

import onnx
import torch

from alpa.export import export, metadata
from alpa.infer import load_model
from alpa.model import Polish

source = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
checkpoint = source / 'alpa-es.pt'
expected_checkpoint = '1cd61eb8ab67406233d982fc291e42225d7b0e7e98ef8e304ba834630c6ac0a0'
if hashlib.sha256(checkpoint.read_bytes()).hexdigest() != expected_checkpoint:
    raise SystemExit('Pinned Alpa-es checkpoint digest mismatch')
out.mkdir(parents=True, exist_ok=True)
torch.set_num_threads(1)
torch.manual_seed(0)  # ONNX tracing only; the exported graph retains RandomNormalLike.
model = load_model(checkpoint, 'cpu')
polish = Polish()
onnx_path = out / 'alpa-es.onnx'
export(model, onnx_path, external_noise=False, opset=17, polish=polish)
metadata_path = out / 'alpa-es.json'
metadata_path.write_text(json.dumps(metadata(model, checkpoint, polish), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
graph = onnx.load(str(onnx_path))
onnx.checker.check_model(graph, full_check=True)
double = onnx.TensorProto.DOUBLE
double_uses = [item.name for item in graph.graph.initializer if item.data_type == double]
double_uses.extend(node.name for node in graph.graph.node for attr in node.attribute
                   if (attr.type == onnx.AttributeProto.TENSOR and attr.t.data_type == double)
                   or (node.op_type == 'Cast' and attr.name == 'to' and attr.i == double))
if double_uses:
    raise SystemExit(f'Unexpected ONNX double precision operators: {double_uses}')
random_ops = [node.op_type for node in graph.graph.node if node.op_type.startswith('Random')]
if random_ops != ['RandomNormalLike', 'RandomNormalLike']:
    raise SystemExit(f'Unexpected graph random operators: {random_ops}')
parameters = sum(value.numel() for value in model.parameters())
if parameters != 4_529_035:
    raise SystemExit(f'Unexpected parameter count: {parameters}')
print(json.dumps({
    'parameters': parameters,
    'metadata': json.loads(metadata_path.read_text(encoding='utf-8')),
    'nodes': len(graph.graph.node),
    'randomOperators': random_ops,
    'doubleUses': double_uses,
    'modelBytes': onnx_path.stat().st_size,
    'modelSha256': hashlib.sha256(onnx_path.read_bytes()).hexdigest(),
    'metadataBytes': metadata_path.stat().st_size,
    'metadataSha256': hashlib.sha256(metadata_path.read_bytes()).hexdigest(),
}, ensure_ascii=False))
