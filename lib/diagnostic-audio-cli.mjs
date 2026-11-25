const usage = 'Usage: node tools/stage-diagnostic-audio.mjs --id ID --receipt diagnostics/ID/smoke.json --wav FULL_SMOKE.wav --model MODEL --backend cpu|webgpu --trial 1 --output diagnostics/audio/ID.wav';
export const diagnosticSmokeReceiptPath = id => `diagnostics/${id}/smoke.json`;
export const diagnosticClipPath = id => `diagnostics/audio/${id}.wav`;

export function parseStageDiagnosticArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (!['--id', '--receipt', '--wav', '--model', '--backend', '--trial', '--output'].includes(args[i]) || !args[i + 1]) {
      throw new Error(usage);
    }
    options[args[i].slice(2)] = args[++i];
  }
  if (!options.id || !/^[a-z0-9][a-z0-9.-]{0,119}$/.test(options.id) || !options.model || !options.wav || !options.receipt ||
      !['cpu', 'webgpu'].includes(options.backend) || options.trial !== '1' ||
      options.receipt !== diagnosticSmokeReceiptPath(options.id) ||
      options.output !== diagnosticClipPath(options.id)) {
    throw new Error(usage);
  }
  return options;
}
