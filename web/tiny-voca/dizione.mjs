import { fetchModelAsset } from '../cache-model-asset.mjs';

export const revision = 'a46fbe0c8514cb32f5e80be987e6c96ef0540f8d';
export const modelBase = '/models/tiny-voca/' + revision + '/';
const dizione = 'f8629fe989f3d0db5f440f9b3c6f0154f2e6110f';
const pyodideBase = '/runtimes/pyodide/0.26.4/';
const dataFiles = ['lexicon.tsv', 'align.json', 'g2p.json', 'g2p.npz', 'homographs.json'];

export async function loadDizione() {
  await import(pyodideBase + 'pyodide.js');
  const py = await globalThis.loadPyodide({ indexURL: new URL(pyodideBase, self.location.href).href });
  await py.loadPackage('numpy');
  const source = await fetchModelAsset(modelBase + 'dizione-' + dizione + '.zip', revision);
  py.unpackArchive(await source.arrayBuffer(), 'zip', { extractDir: '/source' });
  py.FS.mkdirTree('/dizione-data');
  for (const name of dataFiles) {
    const file = await fetchModelAsset(modelBase + 'phonemizer/' + name, revision);
    py.FS.writeFile('/dizione-data/' + name, new Uint8Array(await file.arrayBuffer()));
  }
  py.runPython(`
import json, os, sys
os.environ["DIZIONE_DATA"] = "/dizione-data"
sys.path.insert(0, "/source/dizione-${dizione}/src")
import dizione
def phonemize_json(text):
    out = dizione.phonemize(text)
    return json.dumps({"ids": list(out.ids), "stress": list(out.stress)})
phonemize_json("Warm up.")
`);
  return py.globals.get('phonemize_json');
}
