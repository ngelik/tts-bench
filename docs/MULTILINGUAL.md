# Language-specific benchmark fixtures and publication

The original English article and a translated article are separate measured
workloads. Translation can change character count, segmentation, phonemes and
spoken duration. An equal sentence count or a shared story does not make their
generation times directly comparable.

The registered `uk-article-v1` translation has 19,980 UTF-16 characters/code
points, 36,364 UTF-8 bytes and 92 source spans, including the final newline.
Its text SHA-256 is
`542130c28a312d8e29d4ab7615280bcb661d8c1d8f74e8f2d9c298e4eaceff40`.
The provenance links the complete original English fixture and describes the
translation as AI-assisted, without an independent human review. Preserve that
qualification; audio integrity checks do not establish translation quality.

## Register the exact text before scoring

Register each version in `lib/benchmark-fixtures.mjs`, with immutable text,
metadata and chunk files under `fixtures/`. Record its language code, exact text
SHA-256, actual JavaScript UTF-16 character count, actual chunk count and source
span boundaries. Preserve translation provenance, the original fixture link,
review status and any intentionally retained names or passages. Do not pad,
truncate or relabel a translation to force the English article's 20,000-character
or 93-span counts. A text or segmentation change requires a new fixture version.

Select the registered fixture explicitly for a translated run and use the same
`fixtureId` in its frozen campaign plan. Check the actual CLI help and dry-run
output before admission. The harness records `fixture.language`, identity, digest
and actual counts; it must run the registered text, not translate it during the
timed call. Keep the selected checkpoint, voice, language frontend, synthesis
settings, clean source and hardware in the original receipt. Model language
support alone does not prove that a recording used that language.

Legacy `english-20k-v1` receipts without `fixture.language` remain English and
are not rewritten. Unknown or non-English fixtures cannot acquire English by
omitting the field. Native publication validation must establish the registered
fixture identity before presentation or audio registration.

## Keep comparisons separate

Reference warm selection is partitioned by exact fixture identity before model,
backend and environment selection. A newer Ukrainian attempt cannot replace an
English score for the same model. README sections show language, fixture ID,
digest and actual character/span counts. RAM selection also preserves fixture,
source, protocol and environment; memory is never borrowed from another language.

The existing English RAM chart remains `docs/reference-memory.svg`. Other
languages have distinct charts such as `docs/reference-memory-uk.svg`, each
containing only receipts in that language. Exact fixture variants remain distinct
cohorts within a language chart. The generator creates a chart only from existing
resource evidence, not from a planned benchmark.

CPU/WebGPU speed ratios require the same exact fixture and compatible source,
settings, voice, assets, protocol and hardware. Preserve the existing strict
comparison and campaign-report guards. Do not rank an English score against a
Ukrainian score or combine their repetitions. If the implementations differ,
describe that scope explicitly rather than editing a receipt to make it match.

## Preserve actual recordings

Use `npm run audio -- add` only for an authorized original scored WAV. Its digest,
sample count/rate, selected trial and voice must match the native receipt. The
audio manifest's language is derived from the registered receipt fixture;
`npm run audio -- check` rejects a different declared language. A Ukrainian
recording is never relabeled English to enter the existing player.

Keep the full unmodified WAV and its provenance. Create the exact first 30 seconds
of PCM (or the entire shorter output), without normalization, trimming or new
synthesis. Review the complete file/header/digest and retain waveform findings;
these do not prove intelligibility or translation fidelity. Record any actual
listening/transcript review separately and disclose its limits.

Check model, voice, dataset and output terms, retain attribution and primary
source links, and do not treat a runtime license as a blanket recording grant.
Benchmark permission does not automatically authorize redistribution of weights,
runtime bundles or recordings. Existing explicit publication approval persists.

For `ua-serhiy-0p58m`, retain the pinned upstream
[notice](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/NOTICE.md)
and [model card](https://huggingface.co/dmytro-m/ua-serhiy-0p58m/blob/1abd585d725a787b405c28a59ce1cbdfd34780bb/README.md)
in its registered source URLs. Attribute dmytro-m's Serhiy 0.58M student, its
Serhiy Piper teacher and sanoTTS by Ampixa: student weights/reference GPL-3.0,
teacher Apache-2.0 and training corpus MIT. These are source attributions, not a
blanket generated-output license. Publish only the assessed original synthetic
benchmark narration; upstream publisher demo/sample WAVs are not result audio.
The notice does not establish an independent audit of speaker consent or dataset
rights; preserve that limitation instead of implying a new assurance.

For local-only delivery, retain original receipts, charts and playable local WAV
links without claiming a public release exists. When external publication is
authorized, stage the verified clip/manifest and four-file result bundle, upload
only the authorized full recording, verify its public bytes, then follow the
normal PR/CI/Pages process. Keep all previous results and recordings. Never bypass
an external-publication restriction through a different upload mechanism.
