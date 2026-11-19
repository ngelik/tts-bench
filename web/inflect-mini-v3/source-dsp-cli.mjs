import { inflectMiniSourceFeatures } from './source-dsp.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
request.includeDiagnostics = true;
const result = inflectMiniSourceFeatures(request);
process.stdout.write(JSON.stringify({
  harmonicSource: Array.from(result.harmonicSource),
  sourceReal: Array.from(result.sourceReal),
  sourceImag: Array.from(result.sourceImag),
  magnitude: Array.from(result.magnitude),
  phase: Array.from(result.phase),
  sourceSpec: Array.from(result.sourceSpec),
  bins: result.bins,
  stftFrames: result.stftFrames,
  samples: result.samples,
}));
