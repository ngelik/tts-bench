// English G2P bridge for the Micro phoneme interface. This reuses the
// repository's pinned contextual Klein/Misaki-derived browser G2P and strict
// local eSpeak runtime; the native Micro wrapper's Misaki 0.9.4 frontend is a
// different implementation, so this is not described as bit-for-bit parity.
import { phonemize } from '../klein/g2p.mjs';

export async function phonemizeMicroEnglish(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Micro G2P requires nonempty text.');
  return phonemize(text, 'en');
}

export const MICRO_G2P_DESCRIPTION = 'Klein 0.2.0 browser G2P port, derived from Misaki English lookup/context rules, with the pinned local browser eSpeak fallback; native Micro uses Misaki 0.9.4 + bundled eSpeak, so this is a separately disclosed frontend adaptation pending native-output qualification.';
