"""Build the pinned Ukrainian Serhiy FSD decoder ONNX graph."""

from __future__ import annotations

import numpy as np
from onnx import TensorProto, helper

from ua_serhiy_onnx_common import build_model


def build_decoder(tensors):
    """Return a deterministic ONNX graph for codes -> spectral parameters.

    ``tensors`` is the validated component-prefixed mapping returned by the
    shared manifest loader. The graph retains the reference's utterance-wide
    GroupNorm, exact GELU, five FiLM residual blocks, and clamped log-magnitude
    plus normalized two-channel phase head.
    """
    nodes = []
    initializers = {}
    serial = 0

    def add_const(name, value):
        array = np.asarray(value, dtype=np.float32)
        initializers[name] = array
        return name

    def add_weight(name):
        key = "decoder." + name
        if key not in tensors:
            raise KeyError(f"manifest loader did not return {key}")
        return add_const("weight_" + name.replace(".", "_"), tensors[key])

    def emit(op, inputs, outputs, **attrs):
        nonlocal serial
        serial += 1
        nodes.append(helper.make_node(op, inputs, outputs, name=f"decoder_{serial:03d}_{op}", **attrs))

    def conv(x, prefix, groups=1, pad=None):
        weight_name = prefix + ".weight"
        bias_name = prefix + ".bias"
        weight = add_weight(weight_name)
        bias = add_weight(bias_name)
        shape = tensors["decoder." + weight_name].shape
        kernel = int(shape[-1])
        padding = kernel // 2 if pad is None else pad
        y = f"v{serial + 1}_conv"
        emit("Conv", [x, weight, bias], [y],
             auto_pad="NOTSET", dilations=[1], group=groups, kernel_shape=[kernel],
             pads=[padding, padding], strides=[1])
        return y

    def gelu(x):
        # Exact PyTorch F.gelu(x, approximate="none"): 0.5*x*(1+erf(x/sqrt(2))).
        sqrt_two = add_const(f"gelu_sqrt2_{serial + 1}", np.asarray(2.0 ** 0.5, dtype=np.float32))
        one = add_const(f"gelu_one_{serial + 1}", np.asarray(1.0, dtype=np.float32))
        half = add_const(f"gelu_half_{serial + 1}", np.asarray(0.5, dtype=np.float32))
        scaled = f"v{serial + 1}_gelu_scaled"
        erf = f"v{serial + 1}_gelu_erf"
        plus_one = f"v{serial + 1}_gelu_plus_one"
        product = f"v{serial + 1}_gelu_product"
        output = f"v{serial + 1}_gelu"
        emit("Div", [x, sqrt_two], [scaled])
        emit("Erf", [scaled], [erf])
        emit("Add", [erf, one], [plus_one])
        emit("Mul", [x, plus_one], [product])
        emit("Mul", [product, half], [output])
        return output

    def group_norm_one(x, prefix):
        # torch.nn.functional.group_norm(groups=1) normalizes across channels
        # and time independently for each batch row, with epsilon 1e-5.
        square = add_const(f"groupnorm_square_{serial + 1}", np.asarray(2.0, dtype=np.float32))
        eps = add_const(f"groupnorm_eps_{serial + 1}", np.asarray(1e-5, dtype=np.float32))
        channels = tensors[f"decoder.{prefix}.norm.weight"].shape[0]
        affine_weight = add_const(f"{prefix.replace('.', '_')}_norm_weight",
                                  tensors[f"decoder.{prefix}.norm.weight"].reshape(1, channels, 1))
        affine_bias = add_const(f"{prefix.replace('.', '_')}_norm_bias",
                                 tensors[f"decoder.{prefix}.norm.bias"].reshape(1, channels, 1))
        mean = f"v{serial + 1}_mean"
        centered = f"v{serial + 1}_centered"
        squared = f"v{serial + 1}_squared"
        variance = f"v{serial + 1}_variance"
        var_eps = f"v{serial + 1}_var_eps"
        std = f"v{serial + 1}_std"
        normalized = f"v{serial + 1}_normalized"
        weighted = f"v{serial + 1}_weighted"
        output = f"v{serial + 1}_groupnorm"
        emit("ReduceMean", [x], [mean], axes=[1, 2], keepdims=1)
        emit("Sub", [x, mean], [centered])
        emit("Pow", [centered, square], [squared])
        emit("ReduceMean", [squared], [variance], axes=[1, 2], keepdims=1)
        emit("Add", [variance, eps], [var_eps])
        emit("Sqrt", [var_eps], [std])
        emit("Div", [centered, std], [normalized])
        emit("Mul", [normalized, affine_weight], [weighted])
        emit("Add", [weighted, affine_bias], [output])
        return output

    x = conv("codes", "pre")
    for index in range(5):
        prefix = f"fsd_blocks.{index}"
        residual = conv(x, prefix + ".depthwise", groups=76)
        residual = group_norm_one(residual, prefix)
        film = conv(conv("codes", prefix + ".film_reduce"), prefix + ".film_out")
        film_scale = f"film_{index}_scale"
        film_shift = f"film_{index}_shift"
        emit("Split", [film], [film_scale, film_shift], axis=1)
        one = add_const(f"film_{index}_one", np.asarray(1.0, dtype=np.float32))
        scale_plus_one = f"film_{index}_scale_plus_one"
        scaled_residual = f"film_{index}_scaled_residual"
        shifted_residual = f"film_{index}_shifted_residual"
        emit("Add", [film_scale, one], [scale_plus_one])
        emit("Mul", [residual, scale_plus_one], [scaled_residual])
        emit("Add", [scaled_residual, film_shift], [shifted_residual])
        residual = gelu(conv(shifted_residual, prefix + ".pointwise0"))
        residual = conv(residual, prefix + ".pointwise1")
        residual_scale = add_weight(prefix + ".scale")
        residual_scaled = f"block_{index}_scaled_residual"
        output = f"block_{index}_output"
        emit("Mul", [residual, residual_scale], [residual_scaled])
        emit("Add", [x, residual_scaled], [output])
        x = output

    x = gelu(conv(x, "fsd_head_in"))
    x = conv(x, "fsd_head_out")
    # The reference head has 1539 channels = 513 log magnitudes + 1026 phase values.
    # Magnitude clamping, phase normalization and iSTFT run in the shared host DSP.
    emit("Identity", [x], ["spectral_params"])

    inputs = [("codes", TensorProto.FLOAT, [1, 40, "frames"])]
    outputs = [("spectral_params", TensorProto.FLOAT, [1, 1539, "frames"])]
    return build_model(
        "decoder", inputs, outputs, nodes, initializers,
    )
