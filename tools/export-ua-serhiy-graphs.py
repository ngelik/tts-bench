#!/usr/bin/env python3
"""Build the four browser ONNX graphs from the pinned Serhiy raw-FP16 bundle.

The converter uses only the pinned manifest/weight bytes and ONNX graph ops;
it does not import training code or serialize a Python checkpoint. Install the
pinned builder with:

    python3 -m pip install --target .cache/ua-serhiy-tools onnx==1.17.0
    PYTHONPATH=.cache/ua-serhiy-tools python3 tools/export-ua-serhiy-graphs.py

Outputs are written to .cache/ua-serhiy-build/ and can be staged only through
the ordinary `assets import` path after their digests are recorded in the lock.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper

from ua_serhiy_onnx_common import build_model, load_manifest_tensors, write_model


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_DIR = ROOT / ".cache/ua-serhiy-upstream"
DEFAULT_OUT_DIR = ROOT / ".cache/ua-serhiy-build"


def load_decoder_builder():
    path = ROOT / "tools/ua-serhiy-decoder-graph.py"
    spec = importlib.util.spec_from_file_location("ua_serhiy_decoder_graph", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load decoder graph builder: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.build_decoder


def _component_graph(component, tensors, input_defs, output_defs, build_nodes, weight_component=None):
    nodes, initializers = [], {}
    serial = 0
    source_component = weight_component or component

    def emit(op, ins, *, suffix=None, output_name=None, **attrs):
        nonlocal serial
        serial += 1
        name = f"{component}_{serial:03d}_{op}"
        out = output_name or (f"{component}_v{serial:03d}" + (f"_{suffix}" if suffix else ""))
        nodes.append(helper.make_node(op, ins, [out], name=name, **attrs))
        return out

    def add_weight(name):
        full_name = f"{source_component}.{name}"
        if full_name not in tensors:
            raise KeyError(f"missing validated checkpoint tensor {full_name}")
        initializer_name = "weight_" + name.replace(".", "_")
        initializers[initializer_name] = tensors[full_name]
        return initializer_name

    def add_const(name, value):
        if name in initializers:
            return name
        initializers[name] = np.asarray(value)
        return name

    def conv(x, prefix, *, groups=1):
        weight_key = prefix + ".weight"
        bias_key = prefix + ".bias"
        weight = add_weight(weight_key)
        bias = add_weight(bias_key)
        shape = tensors[f"{source_component}.{weight_key}"].shape
        kernel = int(shape[-1])
        pad = kernel // 2
        return emit(
            "Conv", [x, weight, bias], suffix="conv", auto_pad="NOTSET",
            dilations=[1], group=groups, kernel_shape=[kernel],
            pads=[pad, pad], strides=[1],
        )

    def silu(x):
        sigmoid = emit("Sigmoid", [x], suffix="sigmoid")
        return emit("Mul", [x, sigmoid], suffix="silu")

    def residual(x, prefix, depth):
        for index in range(depth):
            block = f"{prefix}.{index}"
            value = silu(conv(x, block + ".net.0"))
            value = conv(value, block + ".net.2")
            scale = add_weight(block + ".scale")
            value = emit("Mul", [value, scale], suffix="scaled")
            x = emit("Add", [x, value], suffix="residual")
        return x

    built = build_nodes(emit, conv, residual, add_weight, add_const)
    model = build_model(component, input_defs, output_defs, nodes, initializers)
    return model


def duration_graph(tensors):
    def build(emit, conv, residual, add_weight, add_const):
        embedding = add_weight("embedding.weight")
        gathered = emit("Gather", [embedding, "ids"], axis=0)
        transposed = emit("Transpose", [gathered], perm=[0, 2, 1])
        joined = emit("Concat", [transposed, "features"], axis=1)
        value = conv(joined, "input_proj")
        value = residual(value, "blocks", 3)
        value = conv(value, "output")
        squeezed = emit("Squeeze", [value, add_const("squeeze_channel_axis", np.asarray([1], dtype=np.int64))])
        exponent = emit("Exp", [squeezed])
        floor = add_const("minimum_duration_prediction", np.asarray([1.0], dtype=np.float32))
        clipped_min = emit("Max", [exponent, floor])
        scale = add_const("duration_length_scale", np.asarray([1.0], dtype=np.float32))
        scaled = emit("Mul", [clipped_min, scale])
        rounded = emit("Round", [scaled])
        minimum = add_const("duration_min", np.asarray([1.0], dtype=np.float32))
        maximum = add_const("duration_max", np.asarray([80.0], dtype=np.float32))
        bounded = emit("Clip", [rounded, minimum, maximum])
        return emit("Cast", [bounded], output_name="durations", to=TensorProto.INT64)

    return _component_graph(
        "duration", tensors,
        [("ids", TensorProto.INT64, [1, "tokens"]),
         ("features", TensorProto.FLOAT, [1, 3, "tokens"])],
        [("durations", TensorProto.INT64, [1, "tokens"])], build,
    )


def acoustic_token_graph(tensors):
    def build(emit, conv, residual, add_weight, add_const):
        embedding = add_weight("embedding.weight")
        gathered = emit("Gather", [embedding, "ids"], axis=0)
        transposed = emit("Transpose", [gathered], perm=[0, 2, 1])
        joined = emit("Concat", [transposed, "token_features"], axis=1)
        value = conv(joined, "token_input_proj")
        value = residual(value, "token_blocks", 3)
        return emit("Identity", [value], output_name="contextual_tokens")

    return _component_graph(
        "acoustic_token", tensors,
        [("ids", TensorProto.INT64, [1, "tokens"]),
         ("token_features", TensorProto.FLOAT, [1, 2, "tokens"])],
        [("contextual_tokens", TensorProto.FLOAT, [1, 48, "tokens"])], build,
        weight_component="acoustic",
    )


def acoustic_frame_graph(tensors):
    def build(emit, conv, residual, add_weight, add_const):
        value = conv("frame_features", "frame_input_proj")
        value = residual(value, "frame_blocks", 5)
        value = conv(value, "output")
        return emit("Identity", [value], output_name="codes")

    return _component_graph(
        "acoustic_frame", tensors,
        [("frame_features", TensorProto.FLOAT, [1, 51, "frames"])],
        [("codes", TensorProto.FLOAT, [1, 40, "frames"])], build,
        weight_component="acoustic",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()
    if onnx.__version__ != "1.17.0":
        raise SystemExit(f"Expected pinned onnx==1.17.0, found {onnx.__version__}")

    manifest, tensors = load_manifest_tensors(args.model_dir)
    builders = {
        "duration.onnx": duration_graph,
        "acoustic-token.onnx": acoustic_token_graph,
        "acoustic-frame.onnx": acoustic_frame_graph,
        "decoder.onnx": lambda values: load_decoder_builder()(values),
    }
    args.out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "schemaVersion": 1,
        "source": {
            "repo": "dmytro-m/ua-serhiy-0p58m",
            "revision": "1abd585d725a787b405c28a59ce1cbdfd34780bb",
            "manifestSha256": "4af8608e5118cff9718d95516bc7a8298d6f3d350cef4aec7fab8134f39184af",
            "weightsSha256": "ea2599b8db3f1a1c431c3ed0e621ca28338b9edf4841dacd3f395fc8404f8090",
        },
        "build": {"onnx": onnx.__version__, "opset": 17, "irVersion": 9},
        "model": {"storedTensorElements": sum(value.size for value in tensors.values()),
                  "manifestFormat": manifest["format"]},
        "graphs": {},
    }
    for filename, builder in builders.items():
        model = builder(tensors)
        size, digest = write_model(model, args.out_dir / filename)
        report["graphs"][filename] = {"bytes": size, "sha256": digest}
    report_path = args.out_dir / "BUILD-MANIFEST.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
