# Restore assets for a source-pinned replay

Some historical source revisions point to Microsoft ONNX Runtime notice URLs that now return HTTP 404. Current registrations use immutable repository mirrors of the same license and third-party bytes. A historical run can retain its exact source and asset identities by restoring only the matching notices into its ignored local cache before fetching its remaining assets.

Clone the current repository to obtain the recovery tool, then create the scoring checkout at the campaign’s recorded source. The example uses Sopro’s published source. Substitute the source and model from another campaign for its replay.

```sh
git clone https://github.com/ngelik/tts-bench.git tts-bench
git -C tts-bench worktree add --detach ../tts-score 37fa12d505a3691f783fbbe34f4628c55bde9ca1
node tts-bench/tools/restore-runtime-notices.mjs --checkout tts-score --model sopro-v2-turbo
cd tts-score
npm ci --cache .cache/npm
npm run assets -- fetch --model sopro-v2-turbo
npm run assets -- verify --model sopro-v2-turbo
git status --porcelain
```

The status command should print nothing. The helper reads the historical checkout’s own asset lock and verifies both byte count and SHA-256 against checked-in notice text. It restores files inside that checkout’s ignored `.cache/public/` directory, and refuses unknown hashes or a cache path that resolves outside the checkout. Model binaries still come from their original pinned sources. Voice and runtime notices retain their original attribution.

Run the campaign commands from the scoring checkout. Each receipt then retains the historical source commit, original configuration and original asset digests. The standard asset verifier checks all staged model/runtime files before inference. The helper also supports affected ORT 1.23.2 and 1.22 development registrations, including older Klein, Supra, Tiny Voca and Kokoro plans.
