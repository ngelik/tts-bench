// Adapted from OfficinePixel/vocina's Apache-2.0 browser frontend for this benchmark worker.
// See LICENSE, UPSTREAM-NOTICE and NOTICE.md in this directory.
import { creaG2P } from "/models/vocina-it/8dd17b31b0b6e40ce132105f5d0ea9eb7da98f34/g2p_it.js";

const PICCO = 0.99;

function limitaPicco(campioni) {
  let max = 0;
  for (let i = 0; i < campioni.length; i++) max = Math.max(max, Math.abs(campioni[i]));
  if (max > PICCO) for (let i = 0; i < campioni.length; i++) campioni[i] *= PICCO / max;
}

export async function caricaVoce({ ort, dati, modello, metadati, wasm, executionProviders = ["wasm"] }) {
  const g2p = creaG2P(dati);
  // Il modello può avere meno simboli riservati in coda (il pilota non ne ha): conta che i suoi coincidano
  // e che ci siano tutti quelli che il G2P produce.
  const base = g2p.SYMBOLS.findIndex((s) => s.startsWith("<riservato"));
  const n = metadati.symbols.length;
  if (n < base || JSON.stringify(g2p.SYMBOLS.slice(0, n)) !== JSON.stringify(metadati.symbols)) {
    throw new Error("L'inventario dei fonemi del G2P non è quello del modello");
  }
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  if (wasm) ort.env.wasm.wasmBinary = wasm;
  let sessione;
  try {
    sessione = await ort.InferenceSession.create(modello, { executionProviders });
  } finally {
    // Session creation compiles its WASM module. Drop the verified download buffer
    // afterward so it is not retained alongside the live session during generation.
    if (wasm) ort.env.wasm.wasmBinary = undefined;
  }
  const limite = metadati.max_tokens - 12;

  // Il modello è addestrato su clip di pochi secondi (al massimo 9 s): una frase lunga si legge a pezzi di
  // circa 12 s al massimo, unendo i tratti fra le virgole finché ci stanno; un tratto troppo lungo da solo si
  // divide a metà delle parole. Ogni pezzo porta la pausa da lasciare dopo.
  const PEZZO = Math.min(limite, 200);
  // In fondo a un'emissione il modello non fa pausa sull'ultimo segno: la si aggiunge qui, lunga quanto quella
  // che fa dentro la frase (misurata sul pilota: virgola e parentesi ~0,35 s, due punti ~0,25 s).
  const PAUSA_FRASE = 0.3;
  const pausaDopo = (pezzo) => {
    const fine = pezzo.trim().slice(-2);
    if (/[,;)—]/.test(fine)) return 0.35;
    if (/:/.test(fine)) return 0.28;
    return 0.06;  // spezzata a metà delle parole
  };

  function tratti(frase, varianti) {
    const f = g2p.fonemi(frase, varianti);
    if (f.symbols.length <= 2) return [];
    if (f.ids.length <= PEZZO) return [frase];
    const parole = frase.split(" ");
    if (parole.length < 2) return [frase];
    const meta = Math.ceil(parole.length / 2);
    return [...tratti(parole.slice(0, meta).join(" "), varianti), ...tratti(parole.slice(meta).join(" "), varianti)];
  }

  function adatta(frase, varianti) {
    const intera = g2p.fonemi(frase, varianti);
    if (intera.symbols.length <= 2) return [];
    if (intera.ids.length <= PEZZO) return [{ f: intera, pausa: PAUSA_FRASE }];
    const pezzi = [];
    let corrente = "";
    for (const t of frase.split(/(?<=[,;:—])\s+/).flatMap((t) => tratti(t, varianti))) {
      const unito = corrente ? corrente + " " + t : t;
      if (corrente && g2p.fonemi(unito, varianti).ids.length > PEZZO) { pezzi.push(corrente); corrente = t; }
      else corrente = unito;
    }
    if (corrente) pezzi.push(corrente);
    return pezzi.map((p, i) => ({ f: g2p.fonemi(p, varianti), pausa: i + 1 < pezzi.length ? pausaDopo(p) : PAUSA_FRASE }));
  }

  async function sintetizza(f, voce, velocita) {
    const n = f.ids.length;
    const interi = (v) => new ort.Tensor("int64", BigInt64Array.from(v.map(BigInt)), [1, n]);
    const scalare = (v) => new ort.Tensor("float32", Float32Array.from([v]), [1]);
    const inputs = {
      tokens: interi(f.ids), stress: interi(f.stress),
      voice: new ort.Tensor("int64", BigInt64Array.from([BigInt(voce)]), [1]),
      speed: scalare(velocita), pitch_shift: scalare(0), pitch_range: scalare(1),
    };
    let out;
    try {
      out = await sessione.run(inputs);
      const audio = Float32Array.from(out.audio.data);
      const frames = Array.from(out.durations.data, Number).reduce((sum, value) => sum + value, 0);
      if (!audio.length || !Number.isSafeInteger(frames) || frames < 1 || audio.length !== frames * metadati.hop) {
        throw new Error("Vocina returned audio that does not match its duration output");
      }
      return audio;
    } finally {
      for (const tensor of Object.values(inputs)) tensor.dispose?.();
      if (out) for (const tensor of Object.values(out)) tensor.dispose?.();
    }
  }

  // suFrase({indice, totale, testo, fonemi, audio, ms}) per ogni frase pronta; ritorna l'audio intero.
  // varianti: letture facoltative del G2P (dati.json, «varianti»), per esempio ["richard"].
  async function leggi(testo, { voce = 0, velocita = 1, varianti = [], suFrase = () => {} } = {}) {
    const frasi = g2p.frasi(testo);
    const pezzi = [];
    for (let i = 0; i < frasi.length; i++) {
      for (const { f, pausa } of adatta(frasi[i], varianti)) {
        const t0 = performance.now();
        const audio = await sintetizza(f, voce, velocita);
        const ms = performance.now() - t0;
        const copia = audio.slice();
        limitaPicco(copia);
        pezzi.push(audio, new Float32Array(Math.round(pausa * metadati.sample_rate)));
        suFrase({ indice: i, totale: frasi.length, testo: frasi[i], fonemi: leggibile(f), audio: copia, ms, pausa });
      }
    }
    const lunghezza = pezzi.reduce((s, p) => s + p.length, 0);
    const tutto = new Float32Array(lunghezza);
    let o = 0;
    for (const p of pezzi) { tutto.set(p, o); o += p.length; }
    limitaPicco(tutto);
    return tutto;
  }

  function audit(text, varianti = []) {
    return g2p.frasi(text).flatMap((frase) => adatta(frase, varianti).map(({ f, pausa }) => ({
      ids: f.ids, stress: f.stress, unknown: f.ids.includes(4), pausa,
    })));
  }
  return { leggi, g2p, audit, frequenza: metadati.sample_rate, voci: metadati.voices };
}

export function leggibile(f) {
  return f.symbols.slice(1, -1).map((s, i) => (f.stress[i + 1] ? "ˈ" : "") + (s === "<sp>" ? " " : s)).join("")
    .replace(/ +/g, " ");
}
