"""Rebuild and verify the locked Blue-Buff Mandarin browser artifacts."""
import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import sys
import tarfile
import types
import urllib.request
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

HERE = Path(__file__).resolve().parent
MODEL = 'tiny-voca-zh-blue-buff'


def checked_bytes(data, row):
    if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
        raise ValueError('Size or SHA-256 mismatch for ' + str(row.get('path', row.get('target'))))
    return data


def pinned_file(root, row):
    path = root / row['path']
    if path.exists():
        checked_bytes(path.read_bytes(), row)
    else:
        with urllib.request.urlopen(row['url'], timeout=90) as response:
            data = checked_bytes(response.read(row['bytes'] + 1), row)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return path



def safe_under(root, relative_path):
    path = Path(relative_path)
    if path.is_absolute() or not path.parts or '..' in path.parts:
        raise ValueError('Locked asset path must be relative and stay inside its root: ' + str(relative_path))
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError('Locked asset path escapes its root: ' + str(relative_path))
    return resolved


def verify_locked_file(path, row):
    if not path.is_file():
        raise FileNotFoundError(f"Missing locked asset {row.get('id', row.get('target', path))}: {path}")
    checked_bytes(path.read_bytes(), row)


def stage_locked_assets(output, model_lock, asset_cache=None):
    """Stage/check locked generated and URL assets; source and npm files remain importer-owned."""
    receipts = []
    for asset in model_lock.get('assets', []):
        if asset.get('sourcePath'):
            continue
        if asset.get('generated'):
            source_path = safe_under(output, asset['generated']['artifactPath'])
            verify_locked_file(source_path, asset)
            receipts.append({'id': asset.get('id'), 'source': str(source_path), 'target': asset['target'],
                             'bytes': asset['bytes'], 'sha256': asset['sha256'], 'origin': 'generated'})
            continue
        if not asset.get('url'):
            raise ValueError('Portable build cannot stage a locked model asset without generated/sourcePath/url: ' + str(asset.get('id')))
        target = safe_under(output, asset['target'])
        if target.exists():
            verify_locked_file(target, asset)
            origin = 'existing-output'
        else:
            cached = None
            if asset_cache:
                for candidate in (safe_under(asset_cache, asset['target']), safe_under(asset_cache, Path(asset['target']).name)):
                    if candidate.is_file():
                        cached = candidate
                        break
            if cached is not None:
                verify_locked_file(cached, asset)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(cached, target)
                verify_locked_file(target, asset)
                origin = 'pinned-cache-copy'
            else:
                pinned_file(output, {'path': asset['target'], 'url': asset['url'],
                                     'bytes': asset['bytes'], 'sha256': asset['sha256']})
                verify_locked_file(target, asset)
                origin = 'pinned-url'
        receipts.append({'id': asset.get('id'), 'source': str(target), 'target': asset['target'],
                         'bytes': asset['bytes'], 'sha256': asset['sha256'], 'origin': origin})
    return receipts

def build_frontend(source, packages, output):
    entries = {}
    for project, archive in packages.items():
        if project == 'jieba':
            prefix = 'jieba-0.42.1/'
            with tarfile.open(archive) as tar:
                for member in tar.getmembers():
                    path = member.name.removeprefix(prefix)
                    if (member.isfile() and member.name.startswith(prefix + 'jieba/')
                            and (path.count('/') == 1 or path.startswith('jieba/finalseg/'))
                            and path.endswith(('.py', '.p', '.txt'))):
                        entries[path] = tar.extractfile(member).read()
        else:
            with ZipFile(archive) as wheel:
                for path in wheel.namelist():
                    if path.startswith(project + '/') and not path.endswith('/'):
                        entries[path] = wheel.read(path)
    for module in ('text.py', 'zh_text.py'):
        entries['tiny_voca/' + module] = (source / 'src/tiny_voca' / module).read_bytes()
    policy = HERE / 'frame_plan_policy.py'
    entries['tiny_voca/frame_plan_policy.py'] = policy.read_bytes()
    with ZipFile(output, 'w') as archive:
        for name, data in sorted(entries.items()):
            entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            archive.writestr(entry, data)


def export_acoustics(source, output, noise_stream_count):
    import onnx
    import torch

    os.environ['TINY_VOCA_FRONTEND'] = 'zh'
    sys.path.insert(0, str(source / 'src'))
    from tiny_voca.export import export, metadata
    from tiny_voca.infer import load_model

    torch.set_num_threads(1)
    torch.manual_seed(0)
    checkpoint = source / 'tiny-voca-zh.pt'
    model = load_model(checkpoint)
    if sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad) != 4545355:
        raise ValueError('Unexpected trainable parameter count for the pinned checkpoint')
    graph = output / 'mandarin-f-external-noise.onnx'
    torch.manual_seed(0)
    export(model, graph, external_noise=True, opset=17)
    network = onnx.load(graph)
    onnx.checker.check_model(network, full_check=True)
    config = metadata(model, checkpoint)
    config['inputs'] = [field.name for field in network.graph.input]
    if config['inputs'] != ['tokens', 'stress', 'voice', 'speed', 'pitch_shift', 'pitch_range', 'noise']:
        raise ValueError('Unexpected graph inputs')
    (output / 'config.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for seed in range(noise_stream_count):
        samples = model.config.max_frames * model.config.hop
        noise = torch.randn(samples, generator=torch.Generator().manual_seed(seed))
        (output / f'noise-{seed}.f32le').write_bytes(noise.numpy().astype('<f4', copy=False).tobytes())



def create_plan(source):
    """Recompute the source-preserving fixture plan from pinned frontend inputs."""
    fixture_root = HERE.parents[1] / 'fixtures'
    fixture_id = 'zh-hans-article-v1'
    article_path = fixture_root / f'{fixture_id}.txt'
    chunks_path = fixture_root / f'{fixture_id}.chunks.json'
    meta_path = fixture_root / f'{fixture_id}.meta.json'
    article_bytes = article_path.read_bytes()
    article = article_bytes.decode('utf-8')
    chunks = json.loads(chunks_path.read_bytes())
    meta = json.loads(meta_path.read_bytes())
    digest = lambda value: hashlib.sha256(value).hexdigest()
    if digest(article_bytes) != chunks['articleSha256'] or digest(article_bytes) != meta['sha256']:
        raise ValueError('Registered Mandarin fixture files do not match the article SHA-256')
    os.environ['TINY_VOCA_FRONTEND'] = 'zh'
    package = types.ModuleType('tiny_voca')
    package.__path__ = [str(source / 'src/tiny_voca')]
    sys.modules['tiny_voca'] = package
    sys.path.insert(0, str(source / 'src'))
    from tiny_voca.text import frontend_fingerprint, phonemize
    import jieba
    policy_path = HERE / 'frame_plan_policy.py'
    spec = importlib.util.spec_from_file_location('blue_buff_frame_plan_policy', policy_path)
    policy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(policy)
    policy_sha = digest(policy_path.read_bytes())
    raw, candidate_spans, vector_plan = [], [], []
    for span_id, chunk in enumerate(chunks['chunks']):
        if chunk['id'] != span_id:
            raise ValueError('Mandarin fixture chunk order changed')
        text = article[chunk['start']:chunk['end']]
        if digest(text.encode()) != chunk['sha256']:
            raise ValueError(f'Fixture chunk {span_id} digest mismatch')
        whole = phonemize(text)
        raw.append([span_id, list(whole.ids), list(whole.stress)])
        pieces = policy.plan_piece(text, phonemize, jieba, policy.DEFAULT_TOKEN_TARGET)
        if ''.join(piece['text'] for piece in pieces) != text:
            raise ValueError(f'Frame policy changed source text in span {span_id}')
        rows, vectors, cursor = [], [], 0
        for piece_id, piece in enumerate(pieces):
            source = piece['text']
            if piece['sourceStart'] != cursor or piece['sourceEnd'] != cursor + len(source):
                raise ValueError(f'Invalid source offsets in span {span_id}')
            vector = [piece['ids'], piece['stress']]
            rows.append({'spanIndex':span_id,'pieceIndex':piece_id,'fixtureStart':chunk['start']+piece['sourceStart'],
                'fixtureEnd':chunk['start']+piece['sourceEnd'],'sourceStart':piece['sourceStart'],'sourceEnd':piece['sourceEnd'],
                'text':source,'sourceSha256':digest(source.encode()),'tokens':len(piece['ids']),
                'plansSha256':digest(json.dumps(vector,separators=(',',':')).encode()),'ids':piece['ids'],
                'stress':piece['stress'],'unknown':[]})
            vectors.append(vector); cursor=piece['sourceEnd']
        if cursor != len(text): raise ValueError(f'Frame policy did not cover span {span_id}')
        candidate_spans.append(rows); vector_plan.append([span_id,vectors])
    flattened=[piece for span in candidate_spans for piece in span]
    all_plan_sha=digest(json.dumps(vector_plan,separators=(',',':')).encode())
    native={'rawSpanSha256':digest(json.dumps(raw,separators=(',',':')).encode()),
        'frontendFingerprint':frontend_fingerprint(),'splitPolicy':policy.POLICY_ID,'splitPolicySha256':policy_sha,
        'spanPlans':[[piece['tokens'] for piece in span] for span in candidate_spans],
        'spanCount':len(candidate_spans),'overTokenLimit':[],
        'candidate':{'method':policy.POLICY_ID,'policyVersion':policy.POLICY_VERSION,'policySha256':policy_sha,
            'tokenTarget':policy.DEFAULT_TOKEN_TARGET,'fixtureId':fixture_id,'fixtureSha256':meta['sha256'],
            'spans':candidate_spans,'maximumTokens':max(piece['tokens'] for piece in flattened),
            'utterances':len(flattened),'maximumPiecesPerSpan':max(map(len,candidate_spans)),'allPlanSha256':all_plan_sha}}
    native_bytes=(json.dumps(native,ensure_ascii=False,indent=2)+'\n').encode()
    return {'fixtureId':fixture_id,'fixtureSha256':meta['sha256'],'splitPolicy':policy.POLICY_ID,
        'splitPolicySha256':policy_sha,'tokenTarget':policy.DEFAULT_TOKEN_TARGET,
        'nativePlansSha256':digest(native_bytes),'allPlanSha256':all_plan_sha,'allSpanCount':len(candidate_spans),
        'checkedUtterances':len(flattened),'maximumTokens':native['candidate']['maximumTokens'],
        'maximumPiecesPerSpan':native['candidate']['maximumPiecesPerSpan'],'plans':vector_plan[:3]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache', type=Path, help='pinned model/frontend source cache; required for a fresh build')
    parser.add_argument('--lock-file', type=Path, help='asset lock path; defaults to the checkout asset lock')
    parser.add_argument('--model', default=MODEL, help='locked model id to verify or build')
    parser.add_argument('--asset-cache', type=Path, help='optional cache of URL-pinned model assets, indexed by target or basename')
    parser.add_argument('--stage-locked-assets-only', action='store_true', help='stage and verify lock assets without exporting or loading a model')
    parser.add_argument('--plan', type=Path, help='optional reviewed plan receipt; defaults to the checked-in plan.json')
    parser.add_argument('--preflight-only', action='store_true', help='validate arguments and reproduce frontend archive without loading a model or ONNX')
    parser.add_argument('--expected-frontend-sha256', help='required for --preflight-only; hash of the reviewed browser frontend archive')
    args = parser.parse_args()
    if args.preflight_only and not args.expected_frontend_sha256:
        parser.error('--preflight-only requires --expected-frontend-sha256')
    lock_path = args.lock_file.resolve() if args.lock_file else HERE.parents[1] / 'assets.lock.json'
    if args.stage_locked_assets_only:
        lock = json.loads(lock_path.read_bytes())
        if args.model not in lock.get('models', {}):
            raise ValueError(f'Published asset lock has no model entry: {args.model}')
        receipts = stage_locked_assets(args.output, lock['models'][args.model], args.asset_cache)
        print(json.dumps({'status':'passed-locked-asset-staging','model':args.model,
            'receipts':receipts,'checkedInSourceAndNpmRuntime':'left to assets importer'},indent=2))
        return
    if args.cache is None:
        parser.error('--cache is required for model export or frontend preflight')
    pins = json.loads((HERE / 'inputs.json').read_bytes())
    source = args.cache / 'source'
    for row in pins['source']:
        pinned_file(source, row)
    packages = {row['project']: pinned_file(args.cache / 'distributions', row) for row in pins['frontend']}
    plan_path = args.plan.resolve() if args.plan else HERE / 'plan.json'
    expected_plan = json.loads(plan_path.read_bytes())
    plan = create_plan(source)
    if plan != expected_plan:
        differences={key:{'computed':plan.get(key),'expected':expected_plan.get(key)} for key in set(plan)|set(expected_plan) if plan.get(key)!=expected_plan.get(key)}
        raise ValueError('Recomputed pinned-fixture plan differs from plan.json: '+json.dumps(differences,ensure_ascii=False)[:4000])
    args.output.mkdir(parents=True, exist_ok=True)
    archive_path = args.output / 'mandarin-frontend.zip'
    build_frontend(source, packages, archive_path)
    policy_path = HERE / 'frame_plan_policy.py'
    with ZipFile(archive_path) as archive:
        packaged_policy = archive.read('tiny_voca/frame_plan_policy.py')
    if packaged_policy != policy_path.read_bytes():
        raise ValueError('Portable frontend archive does not contain the exact reviewed policy module')
    archive_sha = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    if args.preflight_only:
        if archive_sha != args.expected_frontend_sha256:
            raise ValueError(f'Portable frontend archive differs from reviewed bytes: {archive_sha}')
        print(json.dumps({'status':'passed-no-acoustic-build-preflight','plan':str(plan_path),
            'splitPolicySha256':plan['splitPolicySha256'],'allPlanSha256':plan['allPlanSha256'],'maximumPiecesPerSpan':plan['maximumPiecesPerSpan'],
            'noiseSeeds':[{'seed':seed,'reset':'per-outer-span'} for seed in range(plan['maximumPiecesPerSpan'])],
            'frontendArchiveSha256':archive_sha,'policyPackagedExactly':True,'modelLoaded':False,'onnxExecuted':False},indent=2))
        return
    export_acoustics(source, args.output, plan['maximumPiecesPerSpan'])
    config_path = args.output / 'config.json'
    config = json.loads(config_path.read_bytes())
    config['frame_plan'] = {'policy': plan['splitPolicy'], 'policy_version': 1, 'policy_sha256': plan['splitPolicySha256'], 'token_target': plan['tokenTarget'], 'all_plan_sha256': plan['allPlanSha256'], 'native_plans_sha256': plan['nativePlansSha256'], 'outer_span_count': plan['allSpanCount'], 'internal_piece_count': plan['checkedUtterances'], 'maximum_pieces_per_span': plan['maximumPiecesPerSpan'], 'maximum_tokens': plan['maximumTokens'], 'noise_reset': 'per-outer-span'}
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    graph_path = args.output / 'mandarin-f-external-noise.onnx'
    checkpoint_path = source / 'tiny-voca-zh.pt'
    noise = []
    for seed in range(plan['maximumPiecesPerSpan']):
        path = args.output / f'noise-{seed}.f32le'
        data = path.read_bytes()
        noise.append({'file': path.name, 'seed': seed, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    proof = {
        'graph': graph_path.name, 'bytes': graph_path.stat().st_size, 'sha256': hashlib.sha256(graph_path.read_bytes()).hexdigest(),
        'sourceCheckpoint': hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(), 'parameters': 4545355,
        'configSha256': hashlib.sha256(config_path.read_bytes()).hexdigest(),
        'nativePlansSha256': plan['nativePlansSha256'], 'overTokenLimit': [], 'framePlan': config['frame_plan'],
        'noiseReset': 'per-outer-span', 'noise': noise,
    }
    proof_path = args.output / 'proof.json'
    proof_path.write_text(json.dumps(proof, indent=2) + '\n')
    checked_bytes((args.output / proof['graph']).read_bytes(), {'path': proof['graph'], 'bytes': proof['bytes'], 'sha256': proof['sha256']})
    checked_bytes(config_path.read_bytes(), {'path': 'config.json', 'bytes': config_path.stat().st_size, 'sha256': hashlib.sha256(config_path.read_bytes()).hexdigest()})
    for row in proof['noise']:
        checked_bytes((args.output / row['file']).read_bytes(), row)
    lock = json.loads(lock_path.read_bytes())
    if args.model not in lock.get('models', {}):
        raise ValueError(f'Published asset lock has no model entry: {args.model}; run the checked finalizer first')
    locked_model = lock['models'][args.model]
    graph_pin = next((asset for asset in locked_model['assets'] if asset.get('generated', {}).get('artifactPath') == proof['graph']), None)
    config_pin = next((asset for asset in locked_model['assets'] if asset.get('generated', {}).get('artifactPath') == 'config.json'), None)
    if not graph_pin or graph_pin['sha256'] != proof['sha256'] or graph_pin['bytes'] != proof['bytes'] or not config_pin or config_pin['sha256'] != proof['configSha256']:
        raise ValueError('Fresh graph/config proof does not match the published asset lock')
    receipts = stage_locked_assets(args.output, locked_model, args.asset_cache)
    print(json.dumps({'status':'passed-locked-build-assets','model':args.model,
        'framePlan':proof['framePlan'],'noiseReset':proof['noiseReset'],'stagedOrVerified':receipts,
        'checkedInSourceAndNpmRuntime':'left to assets importer'},indent=2))


if __name__ == '__main__':
    main()
