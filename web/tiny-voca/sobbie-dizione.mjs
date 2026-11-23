const dataFiles = ['lexicon.tsv', 'align.json', 'g2p.json', 'g2p.npz', 'homographs.json'];

// Same Pyodide/NumPy loading flow as web/tiny-voca/dizione.mjs, parameterized
// for Sobbie's independently pinned Dizione snapshot and release data.
export async function loadSobbieDizione({profile, modelAsset, pyodideAsset}) {
  const pyodideRoot = new URL(profile.pyodideRoot, self.location.origin).href;
  await pyodideAsset('pyodide.js');
  await import(new URL('pyodide.js', pyodideRoot).href);
  const pyodide = await globalThis.loadPyodide({indexURL: pyodideRoot});
  if (pyodide.version !== profile.pyodideVersion) throw new Error(`Expected Pyodide ${profile.pyodideVersion}, received ${pyodide.version}`);
  await pyodide.loadPackage('numpy');
  const numpyVersion = String(pyodide.runPython('import numpy; numpy.__version__'));
  if (numpyVersion !== profile.numpyVersion) throw new Error(`Expected NumPy ${profile.numpyVersion}, received ${numpyVersion}`);

  const [archive, ...assets] = await Promise.all([
    modelAsset('dizione/source.zip'),
    ...dataFiles.map(name => modelAsset(`phonemizer/${name}`)),
  ]);
  pyodide.FS.mkdirTree('/dizione-data');
  for (let index = 0; index < dataFiles.length; index++) {
    pyodide.FS.writeFile(`/dizione-data/${dataFiles[index]}`, assets[index]);
  }
  pyodide.unpackArchive(archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength), 'zip', {extractDir: '/dizione-src'});
  pyodide.runPython(`
import json, os, sys
os.environ['DIZIONE_DATA'] = '/dizione-data'
sys.path.insert(0, '/dizione-src/dizione-${profile.dizioneRevision}/src')
import dizione
if dizione.VERSION != ${profile.dizioneVersionConvention}:
    raise RuntimeError('Unexpected Dizione token convention')
def sobbie_phonemize_json(text):
    try:
        result = dizione.phonemize(text)
    except ValueError:
        if any(word for mark, words in dizione.pieces(text) if not mark for word in words):
            raise
        return 'null'
    return json.dumps({'ids': list(result.ids), 'stress': list(result.stress), 'text': str(result)})
sobbie_phonemize_json('Warm up.')
`);
  const identity = JSON.parse(pyodide.runPython("import json, dizione; json.dumps(dizione.identity())"));
  const symbols = JSON.parse(pyodide.runPython("import json; from dizione.symbols import SYMBOLS; json.dumps(list(SYMBOLS))"));
  return {pyodide, phonemize: pyodide.globals.get('sobbie_phonemize_json'), numpyVersion, identity, symbols};
}
