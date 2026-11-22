"""Compile the pinned eSpeak NG 1.51 quiet Greek frontend."""

import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess


def upstream_files(source):
    makefile = (source / "Makefile.am").read_text()
    manifest = re.search(r"^src_libespeak_ng_la_SOURCES = \\\n((?:\t[^\n]*\n)+)", makefile, re.MULTILINE)
    if manifest is None:
        raise RuntimeError("Missing eSpeak 1.51 compilation manifest")
    files = re.findall(r"src/[\w/.-]+\.c\b", manifest[1])
    if len(files) != 32 or not all((source / name).is_file() for name in files):
        raise RuntimeError("Unexpected eSpeak 1.51 library files")
    return files


def build_frontend(source, work, output):
    native = work / "native"
    native.mkdir()
    config = native / "config.h"
    config.write_text(
        '#define PACKAGE_VERSION "1.51"\n#define HAVE_MKSTEMP 1\n#define HAVE_SLEEP 1\n'
        "#define HAVE_UNISTD_H 1\n#define HAVE_STDINT_H 1\n#define HAVE_WCHAR_H 1\n#define HAVE_WCTYPE_H 1\n"
    )
    options = [
        "-O2", "-std=gnu11", "-include", str(config), "-include", "wchar.h",
        "-D_DEFAULT_SOURCE", "-D_DARWIN_C_SOURCE", "-DLIBESPEAK_NG_EXPORT",
        "-I", str(config.parent), "-I", "src/include", "-I", "src/include/compat",
        "-I", "src/ucd-tools/src/include", *upstream_files(source),
    ]
    native_cli = native / "espeak-ng"
    subprocess.run(["clang", *options, "src/espeak-ng.c", "-o", str(native_cli), "-lm"], cwd=source, check=True)
    environment = os.environ | {"ESPEAK_DATA_PATH": str(source)}
    for component in ("intonations", "phonemes"):
        subprocess.run([str(native_cli), "--compile-" + component], cwd=source, env=environment, check=True)
    for language in ("el", "en"):
        subprocess.run([str(native_cli), "--compile=" + language], cwd=source / "dictsource", env=environment, check=True)

    pack = work / "pack"
    data = (
        "el_dict", "en_dict", "intonations", "phondata", "phonindex", "phontab",
        "lang/grk/el", "lang/gmw/en", "lang/gmw/en-US",
    )
    for name in data:
        destination = pack / "espeak-ng-data" / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / "espeak-ng-data" / name, destination)

    wrapper = Path(__file__).with_name("quiet-trace.c")
    javascript = output / "espeak-quiet.mjs"
    subprocess.run([
        "emcc", *options, "-DHAVE_ENDIAN_H=1", str(wrapper), "--preload-file", str(pack) + "@/data",
        "-sMODULARIZE=1", "-sEXPORT_ES6=1", "-sENVIRONMENT=web,worker", "-sALLOW_MEMORY_GROWTH=1",
        '-sEXPORTED_FUNCTIONS=["_bench_espeak_init","_bench_espeak_version","_bench_espeak_trace",'
        '"_bench_espeak_dispose","_malloc","_free"]', '-sEXPORTED_RUNTIME_METHODS=["ccall"]',
        "-o", str(javascript), "-lm",
    ], cwd=source, env=os.environ | {"SOURCE_DATE_EPOCH": "315532800"}, check=True)
    # eSpeak's data bundle must resolve next to the module independently of the build directory.
    source_text = javascript.read_text()
    data_path = str(output / "espeak-quiet.data")
    if source_text.count(data_path) != 3:
        raise RuntimeError("Unexpected Emscripten preload path layout")
    javascript.write_text(source_text.replace(data_path, "espeak-quiet.data"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("work", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build_frontend(args.source.resolve(), args.work.resolve(), args.output.resolve())
