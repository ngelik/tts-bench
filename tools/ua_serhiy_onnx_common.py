"""Pinned raw-FP16 loader and deterministic ONNX helpers for Ukrainian Serhiy.

This file only understands the public ``roota.raw-fp16.v1`` checkpoint at the
revision below. It validates every tensor slice before exposing it to a graph
builder; no pickle/checkpoint deserialization is used.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Iterable

import numpy as np
import onnx
from onnx import TensorProto, checker, helper, numpy_helper


SOURCE_REVISION = "1abd585d725a787b405c28a59ce1cbdfd34780bb"
MANIFEST_SHA256 = "4af8608e5118cff9718d95516bc7a8298d6f3d350cef4aec7fab8134f39184af"
WEIGHTS_BYTES = 1_151_776
WEIGHTS_SHA256 = "ea2599b8db3f1a1c431c3ed0e621ca28338b9edf4841dacd3f395fc8404f8090"
ONNX_OPSET = 17
ONNX_IR_VERSION = 9


def sha256_bytes(value: bytes | bytearray | memoryview) -> str:
    return hashlib.sha256(value).hexdigest()


def _component_shapes(component: str) -> dict[str, tuple[int, ...]]:
    shapes: dict[str, tuple[int, ...]] = {}

    def conv(name: str, out_channels: int, in_channels: int, kernel: int = 1) -> None:
        shapes[name + ".weight"] = (out_channels, in_channels, kernel)
        shapes[name + ".bias"] = (out_channels,)

    def residual(prefix: str, depth: int, hidden: int) -> None:
        for index in range(depth):
            name = f"{prefix}.{index}"
            conv(name + ".net.0", hidden, hidden, 5)
            conv(name + ".net.2", hidden, hidden, 5)
            shapes[name + ".scale"] = (1,)

    if component == "duration":
        shapes["embedding.weight"] = (256, 32)
        conv("input_proj", 32, 35)
        residual("blocks", 3, 32)
        conv("output", 1, 32)
    elif component == "acoustic":
        shapes["embedding.weight"] = (256, 48)
        conv("token_input_proj", 48, 50)
        residual("token_blocks", 3, 48)
        conv("frame_input_proj", 48, 51)
        residual("frame_blocks", 5, 48)
        conv("output", 40, 48)
    elif component == "decoder":
        conv("pre", 76, 40)
        for index in range(5):
            name = f"fsd_blocks.{index}"
            conv(name + ".depthwise", 76, 1, 7)
            shapes[name + ".norm.weight"] = (76,)
            shapes[name + ".norm.bias"] = (76,)
            conv(name + ".pointwise0", 304, 76)
            conv(name + ".pointwise1", 76, 304)
            conv(name + ".film_reduce", 12, 40)
            conv(name + ".film_out", 152, 12)
            shapes[name + ".scale"] = (1,)
        conv("fsd_head_in", 48, 76)
        conv("fsd_head_out", 1539, 48)
    else:
        raise ValueError(f"unsupported checkpoint component {component!r}")
    return shapes


def load_manifest_tensors(model_dir: str | Path) -> tuple[dict, dict[str, np.ndarray]]:
    """Return the pinned manifest and ``component.tensor`` FP32 arrays.

    Every raw tensor digest, shape, dtype, bound and non-overlap is checked
    against the pinned manifest and checkpoint bytes before conversion.
    """
    root = Path(model_dir).expanduser().resolve()
    manifest_bytes = (root / "manifest.json").read_bytes()
    if sha256_bytes(manifest_bytes) != MANIFEST_SHA256:
        raise ValueError("pinned Ukrainian Serhiy manifest SHA-256 mismatch")
    manifest = json.loads(manifest_bytes)
    if manifest.get("format") != "roota.raw-fp16.v1":
        raise ValueError("expected roota.raw-fp16.v1 manifest")
    if manifest.get("sample_rate") != 22050 or manifest.get("hop_length") != 256:
        raise ValueError("unsupported Ukrainian Serhiy sample-rate or hop-length")
    if manifest.get("weights_file") != "weights.fp16.bin":
        raise ValueError("unexpected pinned checkpoint filename")
    if manifest.get("weights_size_bytes") != WEIGHTS_BYTES:
        raise ValueError("pinned checkpoint byte count mismatch")
    if manifest.get("weights_sha256") != WEIGHTS_SHA256:
        raise ValueError("pinned checkpoint SHA-256 metadata mismatch")

    blob = (root / "weights.fp16.bin").read_bytes()
    if len(blob) != WEIGHTS_BYTES or sha256_bytes(blob) != WEIGHTS_SHA256:
        raise ValueError("pinned Ukrainian Serhiy checkpoint bytes failed verification")
    components = manifest.get("components")
    if not isinstance(components, dict) or set(components) != {"duration", "acoustic", "decoder"}:
        raise ValueError("checkpoint must contain exactly duration, acoustic and decoder components")

    arrays: dict[str, np.ndarray] = {}
    intervals: list[tuple[int, int, str]] = []
    for component in ("duration", "acoustic", "decoder"):
        entry = components[component]
        config = entry.get("config")
        expected_config = {
            "duration": {"architecture": "duration_conv", "vocab_size": 256, "hidden": 32,
                         "depth": 3, "kernel_size": 5, "max_tokens": 255, "max_duration": 80},
            "acoustic": {"architecture": "token_context", "vocab_size": 256, "hidden": 48,
                         "depth": 5, "token_depth": 3, "kernel_size": 5, "out_channels": 40},
            "decoder": {"variant": "lrc", "in_channels": 40, "fsd_dim": 76,
                        "fsd_blocks": 5, "fsd_film_rank": 12, "fsd_head_rank": 48,
                        "istft_n_fft": 1024},
        }[component]
        if not isinstance(config, dict) or any(config.get(k) != v for k, v in expected_config.items()):
            raise ValueError(f"{component}: unsupported architecture config")
        expected_shapes = _component_shapes(component)
        tensors = entry.get("tensors")
        if not isinstance(tensors, list) or len(tensors) != len(expected_shapes):
            raise ValueError(f"{component}: tensor descriptor count mismatch")
        seen: set[str] = set()
        for item in tensors:
            name = item.get("name")
            if not isinstance(name, str) or name not in expected_shapes or name in seen:
                raise ValueError(f"{component}: unexpected or duplicate tensor {name!r}")
            seen.add(name)
            full_name = f"{component}.{name}"
            shape = item.get("shape")
            if not isinstance(shape, list) or tuple(shape) != expected_shapes[name]:
                raise ValueError(f"{full_name}: unsupported shape {shape!r}")
            if item.get("dtype") != "float16":
                raise ValueError(f"{full_name}: expected little-endian float16")
            offset = item.get("offset_bytes")
            nbytes = item.get("nbytes")
            if (type(offset) is not int or type(nbytes) is not int or offset < 0
                    or offset % 2 or nbytes != math.prod(shape) * 2 or offset + nbytes > len(blob)):
                raise ValueError(f"{full_name}: invalid offset or byte length")
            raw = memoryview(blob)[offset:offset + nbytes]
            if sha256_bytes(raw) != item.get("sha256"):
                raise ValueError(f"{full_name}: tensor SHA-256 mismatch")
            values = np.frombuffer(raw, dtype="<f2").astype("<f4", copy=True).reshape(shape)
            if not np.isfinite(values).all():
                raise ValueError(f"{full_name}: non-finite tensor data")
            arrays[full_name] = values
            intervals.append((offset, offset + nbytes, full_name))
        if seen != set(expected_shapes):
            raise ValueError(f"{component}: incomplete tensor set")

    intervals.sort()
    if any(curr[0] < prev[1] for prev, curr in zip(intervals, intervals[1:])):
        raise ValueError("checkpoint tensor ranges overlap")
    return manifest, arrays


def build_model(
    component: str,
    inputs: Iterable[tuple[str, int, list[int | str]]],
    outputs: Iterable[tuple[str, int, list[int | str]]],
    nodes: Iterable[onnx.NodeProto],
    initializers: dict[str, np.ndarray],
) -> onnx.ModelProto:
    """Build/check a timestamp-free opset-17 graph.

    Tensor specs are ``(name, TensorProto type, dims)`` where symbols such as
    ``"tokens"`` and ``"frames"`` denote dynamic dimensions. ``nodes`` are
    ordinary ONNX NodeProto values; initializer arrays are emitted as f32.
    """
    input_info = [helper.make_tensor_value_info(name, dtype, shape)
                  for name, dtype, shape in inputs]
    output_info = [helper.make_tensor_value_info(name, dtype, shape)
                   for name, dtype, shape in outputs]
    initializer_info = []
    for name, value in sorted(initializers.items()):
        array = np.asarray(value)
        if array.dtype.kind == "f":
            array = np.asarray(array, dtype="<f4")
        elif array.dtype.kind in "iu":
            array = np.asarray(array, dtype="<i8" if array.dtype.kind == "i" else "<u8")
        else:
            raise TypeError(f"unsupported initializer dtype for {name}: {array.dtype}")
        initializer_info.append(numpy_helper.from_array(array, name=name))
    graph = helper.make_graph(list(nodes), f"ua_serhiy_{component}", input_info,
                              output_info, initializer=initializer_info)
    model = helper.make_model(
        graph,
        producer_name="ua-serhiy-onnx-graphs",
        producer_version="1",
        opset_imports=[helper.make_opsetid("", ONNX_OPSET)],
    )
    model.ir_version = ONNX_IR_VERSION
    model.domain = "org.ngelik.tts-bench.ua-serhiy"
    model.model_version = 1
    model.doc_string = (
        f"Generated from dmytro-m/ua-serhiy-0p58m@{SOURCE_REVISION}; "
        f"component={component}; FP16 checkpoint tensors converted to FP32."
    )
    helper.set_model_props(model, {
        "source.repo": "dmytro-m/ua-serhiy-0p58m",
        "source.revision": SOURCE_REVISION,
        "source.weights_sha256": WEIGHTS_SHA256,
        "component": component,
        "generator": "tools/export-ua-serhiy-graphs.py",
    })
    checker.check_model(model, full_check=False)
    return model


def write_model(model: onnx.ModelProto, path: str | Path) -> tuple[int, str]:
    """Write a deterministic, self-contained ONNX file and return size/SHA."""
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    data = model.SerializeToString(deterministic=True)
    checker.check_model(data, full_check=False)
    output.write_bytes(data)
    return len(data), sha256_bytes(data)


def f32_tensor(name: str, values: np.ndarray) -> onnx.TensorProto:
    """Make a stable, named float32 initializer tensor."""
    return numpy_helper.from_array(np.asarray(values, dtype="<f4"), name=name)


TensorProto = TensorProto
