"""Pack the pinned Sano Amy FP16 distribution for the official FP32 WASM inference ABI.

Input is a local ampixa/sanoTTS package from revision 25410576d005d7f08d186990fd91f6a2651243de.
Slot order and headers follow Ampixa/sanoTTS c0584a51213721faba98135821faab71bae888f0
(mcu/ports/wasm/snt_voice_wasm.c and tools/export_{front,piperlite}_golden.py).
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

MANIFESTS = {
    'amy-en-1p1m': '6d4e580326353fdf67d193687714875dace782a0807e108a6858445d2464c62b',
    'amy-en-1p46m': '5c6b782b0b418758e4dfd8b877a5d34f361c94e5917b2a3ec82542c35b6677b7',
    'amy-en-1p8m': '6dc68af208e6ae021b3680940099520d6f4dd809aad6ae7e078ce45c285ffba9',
}
PHONEMES = '95a23eb4d42909d38df73bb9ac7f45f597dbfcde2d1bf9526fdeaf5466977d77'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pair(prefix):
    return [prefix + '.weight', prefix + '.bias']


def residual_blocks(prefix, count):
    result = []
    for index in range(count):
        name = f'{prefix}.{index}'
        result += [name + '.scale', *pair(name + '.net.0'), *pair(name + '.net.2')]
    return result


def decoder_slots():
    names = pair('pre')
    for stage in range(3):
        names += pair(f'up{stage}')
        for branch in range(3):
            block = f'res{stage}.0.blocks.{branch}'
            names += pair(block + '.conv1') + pair(block + '.conv2')
    return names + pair('post')


def encode(component, names, weights):
    tensors = {item['name']: item for item in component['tensors']}
    if set(names) != tensors.keys() or len(names) != len(component['tensors']):
        raise ValueError('Runtime slots and package tensor inventory differ')
    parts = []
    for name in names:
        item = tensors[name]
        start, size = item['offset_bytes'], item['nbytes']
        chunk = weights[start:start + size]
        if (item['dtype'] != 'float16' or len(chunk) != 2 * math.prod(item['shape'])
                or sha(chunk) != item['sha256']):
            raise ValueError(f'Invalid FP16 tensor: {name}')
        values = struct.unpack(f'<{len(chunk)//2}e', chunk)
        parts.append(struct.pack(f'<{len(values)}f', *values))
    return parts


def pack_slots(header, tensors):
    offsets = bytearray()
    position = 0
    for tensor in tensors:
        size = len(tensor) // 4
        offsets.extend(struct.pack('<ii', position, size))
        position += size
    return header + struct.pack('<i', len(tensors)) + offsets + b''.join(tensors)


def convert(package, output):
    data = (package/'manifest.json').read_bytes()
    manifest = json.loads(data)
    name = manifest['package_name']
    if MANIFESTS.get(name) != sha(data) or sha((package/'piper-phoneme-config.json').read_bytes()) != PHONEMES:
        raise ValueError('Unexpected manifest or phoneme vocabulary')
    weights = (package/'weights.fp16.bin').read_bytes()
    if sha(weights) != manifest['weights_sha256'] or len(weights) != 2 * manifest['total_parameters']:
        raise ValueError('Weights do not match pinned manifest')
    duration, acoustic, decoder = [manifest['components'][key] for key in ('duration','acoustic','decoder')]
    d, a, c = [component['config'] for component in (duration, acoustic, decoder)]
    duration_names = ['embedding.weight', *pair('input_proj'), *residual_blocks('blocks', d['depth']), *pair('output')]
    acoustic_names = ['embedding.weight', *pair('token_input_proj'), *residual_blocks('token_blocks', a['token_depth']),
                      *pair('frame_input_proj'), *residual_blocks('frame_blocks', a['depth']), *pair('output')]
    front_tensors = encode(duration, duration_names, weights) + encode(acoustic, acoustic_names, weights)
    decoder_tensors = encode(decoder, decoder_slots(), weights)
    values = [0x534e4652, 1, d['vocab_size'], d['hidden'], d['depth'], d['kernel_size'], d['max_tokens'],
              d['max_duration'], a['vocab_size'], a['hidden'], a['token_depth'], a['depth'], a['kernel_size'],
              a['out_channels'], 0, 0, 0]
    front = pack_slots(struct.pack('<17i', *values), front_tensors)
    decoder_header = struct.pack('<10if', 0x534e504c, 1, c['in_channels'], *c['channels'], c['post_filter_channels'],
                                 c['post_filter_layers'], c['post_filter_kernel'], c['post_filter_scale'])
    dec = pack_slots(decoder_header, decoder_tensors)
    meta = dict(key=name, espeak_voice='en-us', g2p_voice_slot=1, length_scale=manifest['inference']['duration_length_scale'],
                sample_rate=manifest['sample_rate'], front_bytes=len(front), dec_bytes=len(dec))
    output.mkdir(parents=True, exist_ok=True)
    for filename, content in [('front_f32.bin', front), ('dec_f32.bin', dec), ('meta.json', (json.dumps(meta, indent=2)+'\n').encode())]:
        (output/filename).write_bytes(content)
        print(filename, len(content), sha(content))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    convert(args.package, args.output)
