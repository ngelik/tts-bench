// These digests identify the audited recording. A different export or run is evaluated independently.
const pcm = '329919ac38ad0050e0687156dcc7f58713188e0d1ad40920b31e0ae495b6e74e';
const wav = '05664d30dbbdfe2b6731fa8e9b32db822f95b72a2e65e5c11f108bde83a1812f';

export const waveformReport = 'https://github.com/ngelik/tts-bench/tree/main/diagnostics/audio8-waveform';
export const waveformFinding = '90.31% of this recording is constant at one PCM value. Its elapsed time describes a diagnostic execution.';
export const matchesAuditedWav = sha256 => sha256 === wav;

export function affectedTrials(cell) {
  return (cell?.trials ?? []).filter(trial => trial.pcmSha256 === pcm || matchesAuditedWav(trial.audio?.sha256));
}
