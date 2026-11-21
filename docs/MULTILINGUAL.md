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

## Use an existing language

From a clone of `ngelik/tts-bench`, run `npm ci`, then list article editions and validate the one you plan to use.

```sh
npm run fixtures -- list
npm run fixtures -- check --id uk-article-v1
```

Choose the fixture by its versioned ID. The language tab describes the **article spoken in the benchmark**. A model’s supported-language list describes its wider capabilities. Results in a tab come from actual receipts for that edition.

## Add a translation

You can submit an article on any computer. Check the registry first to avoid duplicating an existing edition. Translate the complete [English source](../fixtures/en-20000.txt), preserving the story, names, numbers and paragraph order. Keep natural punctuation and phrasing in the target language. Save the text as UTF-8 without a byte-order mark and use LF line endings. A final newline, if present, is part of the article hash. Record the translator or tool, actual review status and the license under which the text can be distributed.

For example, with your complete French translation saved in `/path/to/french.txt`, substitute your actual credit, review description and license in this command:

```sh
npm run fixtures -- add --language fr --id fr-article-v1 \
  --text /path/to/french.txt \
  --creator "Translation credit" \
  --description "How it was translated and which review was performed" \
  --license MIT
npm run fixtures -- check --id fr-article-v1
git diff -- fixtures/registry.json
git status --short -- fixtures/
```

The command registers the language in `fixtures/registry.json` and generates three files in `fixtures/`: **article text**, **metadata** and **chunk manifest**. Its metadata binds the exact translation to the English source SHA-256. It records UTF-8 bytes, Unicode code points and JavaScript UTF-16 length. The span offsets use UTF-16 units, and each span has its own hash. The translation keeps its natural length.

Use a language tag such as `fr`, `pt-BR` or `zh-Hant` that represents the actual text and the speech profile you want to test. For a changed article or segmentation, give it a new fixture ID such as `fr-article-v2`. Keep earlier editions so receipts and recordings remain reproducible.

Open a **fixture PR** with the registry change and the three generated files. Include the target language, fixture ID, translation credit, review status, license and check command. A fixture-only PR is ready for review before any measurements exist. The dashboard discovers language tabs from the registry. A new language shows an empty results tab until a qualifying run is published. When revising an existing language, its measured edition stays visible until the newer one has qualifying evidence. Earlier recordings remain available in the listening room.

## Connect a model and run in Chrome

Use `npm run bench -- models --language fr` to list browser profiles for French, or replace `fr` with your article’s language tag. Check the exact model and voice. The active profile’s executable languages are declared in `modelFrontendLanguages` in `fixtures/registry.json`. Profiles without an entry default to English. Some profiles also pin an exact article edition in `modelRequiredFixtures`, including the published Serhiy configuration. Declare a language when the adapter actually selects it in the tokenizer, phonemizer or synthesis call, or when the pinned single-language checkpoint uses it by design. Return the actual language in the adapter’s `settings.language` and exercise the path in Chrome. Language tags are matched exactly after canonicalization; a regional or script variant needs an explicit profile entry. The model card’s language inventory belongs separately in `assets.lock.json`.

The commands below use the published Ukrainian profile. Supply the exact ID of your model and fixture for another language, and use that model’s documented asset preparation. The model’s license determines whether `--accept-license` is needed.

```sh
model=ua-serhiy-0p58m
fixture=uk-article-v1
node tools/build-ua-serhiy-browser.mjs --accept-license
npm run bench -- run --model "$model" --backend cpu --fixture "$fixture" --smoke --accept-license
```

Inspect the smoke receipt, voice, resolved language and WAV. Listen to a passage or transcribe a sample in the target language to check that the frontend handles its script and pronunciations. Keep the benchmark article and translation fixed during synthesis.

For baseline timing, commit and publish the implementation and edition first. In a clean checkout on the baseline Mac, set `machine` to the actual hardware label. Run each requested backend sequentially under the existing repetition policy. For example:

```sh
machine="MacBook Pro (Apple M1 Pro, 16 GB)"
npm run bench -- run --model "$model" --backend cpu --fixture "$fixture" --scenario warm --machine "$machine" --accept-license
npm run bench -- run --model "$model" --backend webgpu --fixture "$fixture" --scenario warm --machine "$machine" --accept-license
```

For a campaign, use the same top-level `fixtureId` for every cell in its plan. From a clean source commit, preview it with `node tools/run-campaign.mjs --plan PLAN.json --dry-run`. Check the printed language, fixture hash and actual length. For RAM, run a separate full `cached` cell with `--resources --repetitions 1` on each requested backend.

For a **result PR**, follow [CONTRIBUTING.md](../CONTRIBUTING.md) for the baseline and submission commands. Include the exact fixture ID, measured voice/language, receipts and authorized audio. Run `npm run reference`, `npm run audio -- check` and `npm run dashboard:build`. Check the generated Reference results section, the dashboard at `?lang=LANGUAGE_TAG`, and the inline audio for that language. For evaluation on the baseline by a maintainer, use the [request template](../evaluation-requests/TEMPLATE.md) with the model URL, target language and fixture or translation PR.

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
