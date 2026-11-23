const DATA_FILES = [
  'lexicon.tsv',
  'align.json',
  'g2p.json',
  'g2p.npz',
  'homographs.json',
];

// The adapted expression wrapper retains the publisher's Apache-2.0 terms. See NOTICE.md.
export async function loadFiatoDizione({ profile, modelAsset, pyodideAsset, config }) {
  const pyodideRoot = new URL(profile.pyodideRoot, self.location.origin).href;
  const [lockBytes] = await Promise.all([
    pyodideAsset('pyodide-lock.json'),
    ...Object.keys(profile.pyodideFiles).filter(name => name !== 'pyodide-lock.json').map(pyodideAsset),
  ]);
  const lock = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(lockBytes));
  const numpy = lock.packages?.numpy;
  if (numpy?.version !== profile.numpyVersion
      || numpy.file_name !== 'numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl'
      || numpy.sha256 !== profile.pyodideFiles[numpy.file_name]?.[1]) {
    throw new Error('Pinned Pyodide lock does not select the required NumPy wheel');
  }
  await import(new URL('pyodide.js', pyodideRoot).href);

  const pyodide = await globalThis.loadPyodide({ indexURL: pyodideRoot });
  if (pyodide.version !== profile.pyodideVersion) {
    throw new Error(`Expected Pyodide ${profile.pyodideVersion}, received ${pyodide.version}`);
  }

  await pyodide.loadPackage('numpy');
  const numpyVersion = String(pyodide.runPython('import numpy; numpy.__version__'));
  if (numpyVersion !== profile.numpyVersion) {
    throw new Error(`Expected NumPy ${profile.numpyVersion}, received ${numpyVersion}`);
  }

  const [archive, ...dataFiles] = await Promise.all([
    modelAsset('demo/assets/dizione.zip'),
    ...DATA_FILES.map((name) => modelAsset(`phonemizer/${name}`)),
  ]);
  pyodide.FS.mkdirTree('/dizione-data');
  DATA_FILES.forEach((name, index) => {
    pyodide.FS.writeFile(`/dizione-data/${name}`, dataFiles[index]);
  });

  const archiveBuffer = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  );
  pyodide.unpackArchive(archiveBuffer, 'zip', { extractDir: '/dizione-src' });
  pyodide.globals.set('VOCAB', JSON.stringify(config.vocab));
  pyodide.globals.set('EXPRESSIONS', JSON.stringify(config.expressions));

  pyodide.runPython(`
import json, os, re, sys
os.environ["DIZIONE_DATA"] = "/dizione-data"
sys.path.insert(0, "/dizione-src")
import dizione
if dizione.__version__ != "${profile.phonemizerVersion}" or dizione.VERSION != ${profile.phonemizerConvention}:
    raise RuntimeError("Unexpected Fiato Dizione version or token convention")
if dizione.identity()["fingerprint"] != "${profile.configDizioneFingerprint}":
    raise RuntimeError("Fiato Dizione identity differs from pinned config")
vocab = json.loads(VOCAB)
expressions = json.loads(EXPRESSIONS)
expression = re.compile("(" + "|".join(re.escape(e) for e in expressions) + ")")
def fiato_phonemize_json(text):
    ids, stress = [vocab["<bos>"]], [0]
    spoken = False
    for part in expression.split(text):
        if part in expressions:
            ids.append(vocab[part])
            stress.append(0)
        elif any(word for mark, words in dizione.pieces(part) if not mark for word in words):
            result = dizione.phonemize(part)
            ids += result.ids[1:-1]
            stress += result.stress[1:-1]
            spoken = True
    if not spoken:
        return "null"
    return json.dumps({"ids": ids + [vocab["<eos>"]], "stress": stress + [0]})
fiato_phonemize_json("Warm up.")
`);

  const identity = JSON.parse(
    pyodide.runPython('import json, dizione; json.dumps(dizione.identity())'),
  );
  return {
    pyodide,
    numpyVersion,
    identity,
    phonemizeJson: pyodide.globals.get('fiato_phonemize_json'),
  };
}
