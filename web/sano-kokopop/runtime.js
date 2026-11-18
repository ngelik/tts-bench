// Internal worker engine; calls are serialized by worker.js (JSPI is reentrant).
export class Runtime {
  constructor(module) {
    this.module = module;
    this.model = 0;
    this.backend = 'cpu';
  }

  call(name, type, types = [], args = [], async = false) {
    return this.module.ccall(`kp_${name}`, type, types, args, { async });
  }

  error() {
    return new Error(this.call('error', 'string') || 'kokopop operation failed');
  }

  async load(bytes, backend) {
    if (this.model) throw new Error('A model is already loaded');

    const path = '/model.gguf';
    this.module.FS.writeFile(path, new Uint8Array(bytes));

    try {
      this.model = await this.call('load', 'number', ['string', 'number'], [path, backend], true);
      if (!this.model) throw this.error();

      const backendName = this.call('backend', 'number', ['number'], [this.model]) === 6 ? 'webgpu' : 'cpu';
      this.backend = backendName;
      const voices = [];
      const count = this.call('voice_count', 'number', ['number'], [this.model]);
      for (let i = 0; i < count; i++) {
        const name = this.call('voice_name', 'string', ['number', 'number'], [this.model, i]);
        const sampleRate = this.call('voice_rate', 'number', ['number', 'string'], [this.model, name]);
        voices.push({ name, sampleRate });
      }

      return {
        voices,
        backend: backendName,
        architecture: this.call('arch', 'string', ['number'], [this.model]),
      };
    } finally {
      this.module.FS.unlink(path);
    }
  }

  async synthesize(text, { voice = '', speed = 1, phonemes = false, seed, trace = false } = {}) {
    if (!this.model) throw new Error('No model loaded');
    if (typeof text !== 'string' || !text.trim() || text.includes('\0')) {
      throw new TypeError('text must be a nonempty string without NUL');
    }
    if (typeof voice !== 'string' || voice.includes('\0')) {
      throw new TypeError('voice must be a string without NUL');
    }
    if (!Number.isFinite(speed) || speed <= 0) {
      throw new RangeError('speed must be positive and finite');
    }
    if (seed !== undefined && (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)) {
      throw new RangeError('seed must be an unsigned 32-bit integer');
    }

    if (trace && !phonemes) {
      this.call('reset_webgpu_op_assignments', null, ['number'], [this.model]);
    }

    const useSeededText = !phonemes && seed !== undefined;
    const audio = await this.call(
      useSeededText ? 'synthesize_seeded' : 'synthesize',
      'number',
      ['number', 'string', 'string', 'number', 'number'],
      useSeededText
        ? [this.model, text, voice, speed, seed]
        : [this.model, text, voice, speed, Number(phonemes)],
      true,
    );
    if (!audio) throw this.error();

    try {
      const start = this.call('samples', 'number', ['number'], [audio]) / 4;
      const length = this.call('length', 'number', ['number'], [audio]);
      const sampleRate = this.call('rate', 'number', ['number'], [audio]);
      // Copy before freeing native audio; never expose a view into growing WASM memory.
      const result = { samples: this.module.HEAPF32.slice(start, start + length), sampleRate };
      if (trace && !phonemes) {
        const json = this.call('webgpu_op_assignments_json', 'string', ['number'], [this.model]);
        result.webgpuOpAssignments = JSON.parse(json || '{}');
      }
      return result;
    } finally {
      this.call('audio_free', null, ['number'], [audio]);
    }
  }

  async dispose() {
    if (this.model) {
      await this.call('free', null, ['number'], [this.model], true);
      this.model = 0;
    }
  }
}
