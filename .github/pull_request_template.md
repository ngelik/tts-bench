## Contribution type

- [ ] Measured baseline result: Apple M1 Pro MacBook Pro, native arm64.
- [ ] Model evaluation request: no baseline run supplied.
- [ ] New or revised language fixture: include the language tag, fixture ID, translation credit and review status.
- [ ] Implementation, documentation or maintenance change.

## Model evaluation request

For a request-only PR, add `evaluation-requests/<model-slug>.md` using the template,
link that file here, and provide the model name and public model URL. Optional:
target fixture ID or translation PR, upstream/browser code, license and preferred voice. No benchmark run or adapter is
required. Mark the result-only checklist below not applicable.

Request file / model URL:

## Result or implementation change

Describe the machine, model/backend, scenario and resulting behavior. For measured
results, report exact M1 Pro hardware/RAM, native architecture, OS and Chrome.
Other hardware should use the evaluation-request route. Code/docs-only PRs do not
need a baseline result. Checks below apply only to the files and work submitted.

- [ ] For results: I verified Apple M1 Pro hardware and native arm64; the machine label is accurate.
- [ ] I ran `npm test`, `npm run validate`, and `npm run reference -- --check`.
- [ ] Every new result is included in README Reference results via the generated index.
- [ ] Supported voice/language counts have primary sources, scope and tested-voice distinctions.
- [ ] For translations: `npm run fixtures -- check` verifies the registered article and spans.
- [ ] Scores use the full registered fixture and disclose the language/voice used by the adapter.
- [ ] Requested/effective backend, precision, voice, source and asset hashes are recorded.
- [ ] Failures and unavailable metrics remain explicit; no missing value is replaced with zero.
- [ ] I reviewed files for private paths, credentials, hostnames and unrelated data.
- [ ] No model binaries or browser profiles are included; any audio has explicit authorization, receipt-bound hashes and retained terms.
- [ ] I disclose power mode, concurrent workload and protocol deviations below.

### Commands and conditions

### Limitations / listening observations

