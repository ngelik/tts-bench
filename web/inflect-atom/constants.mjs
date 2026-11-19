// Immutable source of the compiled-runtime release, independently of checkpoint revision.
export const ATOM_ASSET_REVISION = '1957f001c43f4f556e94501f47a268ed8810f366';

// Only the standard executionProviders field varies between paired backends.
export function atomProviderSettings(settings, executionProviders) {
  return { ...settings, executionProviders, encoderExecutionProviders: ['wasm'],
    executionProviderScope: 'executionProviders selects the convolution decoder; encoder, frontend and DSP always use WASM' };
}
