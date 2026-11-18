# Sopro CPU resource diagnostic repeat

The first CPU cached resource diagnostic overlapped local validation work by two other executors. Approximate overlap was 08:17–08:26 UTC on November 18, 2026. Klein ran npm tests (75.717 seconds), validation (about 51.6 seconds), and small targeted checks. The Silencio executor ran an audio check (about 46 seconds), listening-page build (about 70–80 seconds, ending 08:20:51 UTC), and parallel validation/report checks (about 40 seconds around 08:21–08:22 UTC). Exact individual start times were unavailable.

The original raw receipt remains unchanged. The separately recorded repeat ran under the exclusive benchmark lock with the same source, assets, voice and settings. Its later timestamp makes it the selected resource observation. Neither timing nor memory was adjusted, and no impact estimate is claimed. The two saved full recordings have identical SHA-256 c4cf4658ae01fc379b8eddc4d5cde49e0db37dea83cb851fbb1a022fbdd0dd9f, so the current audio link also represents the original output bytes.

[Original receipt](../../../results/2026-11-18t08-17-08-445z-sopro-v2-turbo-cpu-cached-519c04ea/summary.md) · [Clean repeat and recording](../../../results/2026-11-18t08-39-21-266z-sopro-v2-turbo-cpu-cached-371daf7e/summary.md)
