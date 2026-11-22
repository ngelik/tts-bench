import argparse
import hashlib
import json
from pathlib import Path

import onnx
import torch
from tiny_voca_gr.frontend import install


parser = argparse.ArgumentParser()
parser.add_argument("checkpoint", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
with args.checkpoint.open("rb") as stream:
    digest = hashlib.file_digest(stream, "sha256").hexdigest()
assert digest == "f0a77dff23a058e180852b6f8b89a2e8a5ddbc1ed9da94bc23aaefafadfab952"
assert torch.__version__ == "2.6.0"
assert torch.serialization.get_unsafe_globals_in_checkpoint(args.checkpoint) == []
state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
assert state["format_version"] == 4 and state["step"] == 104000
assert sum(value.numel() for value in state["model"].values()) == 4_532_107
assert {value.dtype for value in state["model"].values()} == {torch.float32}

frontend = install()
recorded_frontend = dict(state["frontend"])
fingerprint = recorded_frontend.pop("fingerprint")
assert fingerprint == "c046ae2a680a92760786caa0ae74b10ad3a74067885db6e037a0b118a413e839"
assert hashlib.sha256(json.dumps(recorded_frontend, sort_keys=True, ensure_ascii=False).encode()).hexdigest() == fingerprint
actual_frontend = frontend.frontend_identity()
actual_display, actual_path = actual_frontend["espeak_version"].split("  Data at: ", 1)
recorded_display, _ = recorded_frontend["espeak_version"].split("  Data at: ", 1)
assert actual_display == recorded_display == "eSpeak NG text-to-speech: 1.51"
assert Path(actual_path, "el_dict").is_file()
assert actual_frontend | {"espeak_version": recorded_frontend["espeak_version"]} == recorded_frontend

from tiny_voca import export, infer

# The checkpoint's fingerprint includes its original Linux data directory.
# The full identity checks above allow only the local directory to differ.
model = infer.load_model(args.checkpoint, device="cpu", check_frontend=False)
torch.set_num_threads(1)
torch.manual_seed(0)
args.output.parent.mkdir(parents=True, exist_ok=True)
export.export(model, args.output, opset=17)
metadata = export.metadata(model, args.checkpoint)
metadata.update({
    "frontend_fingerprint": fingerprint,
    "normalization": recorded_frontend["normalization"],
    "espeak_version": "1.51",
    "checkpoint_sha256": digest,
})
args.output.with_suffix(".json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
graph = onnx.load(args.output)
onnx.checker.check_model(graph, full_check=True)
assert not any(tensor.data_type == onnx.TensorProto.DOUBLE for tensor in graph.graph.initializer)
assert [node.op_type for node in graph.graph.node].count("RandomNormalLike") == 1
assert [entry.name for entry in graph.graph.input] == list(export.INPUTS)
assert [entry.name for entry in graph.graph.output] == list(export.OUTPUTS)
print(json.dumps({ "nodes": len(graph.graph.node), "bytes": args.output.stat().st_size, **metadata }, ensure_ascii=False))
