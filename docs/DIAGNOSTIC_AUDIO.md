# Diagnostic audio examples

Diagnostic audio is separate from [`audio/manifest.json`](../audio/manifest.json),
which remains limited to clips from publishable scored trials. Supplemental
examples live in [`audio/diagnostics.json`](../audio/diagnostics.json). The
manifest may be empty before any examples are approved, or contain verified
diagnostic recordings. Every registered clip is checked against its receipts
and WAV metadata when the dashboard data is built.

An entry is eligible only when its short clip comes from a clean, committed
three-span smoke trial and it links to a failed full-article attempt from that
same source commit, model, backend, voice, configuration and fixture. The full
attempt must identify its first failing source span. `tools/diagnostic-audio.mjs`
checks both source fingerprints, receipt and WAV hashes, fixture language,
attribution, and exact 30-second PCM16 sample count. The dashboard displays the
clip under **Diagnostic audio**, labels it as excluded from scores and rankings,
and does not pass it into score, comparison, or listening-example selection.

To prepare a real example after its source commit has been published:

1. Run the original first-three-span smoke with audio saving enabled. Preserve
   its native receipt and full WAV. Run the actual full article on the same
   committed source and preserve the failed receipt. Do not edit either receipt.
2. Copy only the smoke receipt under `diagnostics/<example-id>/smoke.json` and
   record its exact SHA-256 digest. Keep the failed full attempt at its original
   `results/<result-id>/result.json` path and link that file directly. Confirm
   both receipts are clean, native and reference the same source commit, model,
   backend, voice and full fixture.
3. Create an exact 30-second prefix clip from a smoke WAV that is at least 30
   seconds long. Shorter source audio is rejected:

   ```sh
   node tools/stage-diagnostic-audio.mjs \
     --id tiny-voca-nl-opening \
     --receipt diagnostics/tiny-voca-nl-opening/smoke.json \
     --wav /path/to/original-smoke.wav \
     --model tiny-voca-nl --backend cpu --trial 1 \
     --output diagnostics/audio/tiny-voca-nl-opening.wav
   ```

   The command checks the smoke receipt's WAV hash and frame metadata, then
   writes the first 30 seconds as an unnormalized PCM16 prefix with the original
   sample rate. It prints the clip hash, exact byte count and source WAV pins for
   the manifest.
4. Add one entry to `audio/diagnostics.json`, using the emitted clip metadata
   and linking the smoke receipt and original full result paths and hashes. The
   loader verifies that the smoke fixture ID and hash equal the registered
   fixture's exact first three spans. Set `smoke.spanIds` to
   `[0,1,2]`, `smoke.trialIndex` to `1`, `smoke.sourceWavSha256` and
   `smoke.sourceWavBytes` to the receipt's audio fields, and set
   `firstFailureSpanId` from the full attempt's actual error. Preserve the
   model's exact attribution, model terms and source URLs.
5. Run `npm run audio:diagnostic -- check`, focused audio/dashboard tests,
   `npm run listen:build`, `npm run validate`, and
   `node tools/publication-check.mjs` after staging.

Do not add a record until both native receipts and the clip exist. Do not place
the example in the scored audio manifest, change the model's scores, or imply
that it covers the unrendered article. The diagnostic sample is a listenable
supported-prefix output with an explicit full-article failure link.
