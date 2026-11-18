// web/zonos3/upstream/servers/web/src/b64.ts
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var TABLE = (/* @__PURE__ */ new Int8Array(256)).fill(-1);
for (let i = 0; i < 64; i++) TABLE[ALPHABET.charCodeAt(i)] = i;
/** Decoded bytes, or null when the payload is not strict base64 (or a data URL has no comma). */
function b64DecodeStrict(raw) {
	let payload = raw.trim();
	if (payload.startsWith("data:")) {
		const comma = payload.indexOf(",");
		if (comma < 0) return null;
		payload = payload.slice(comma + 1);
	}
	let dataLen = payload.length;
	while (dataLen > 0 && payload.charCodeAt(dataLen - 1) === 61) dataLen--;
	if (payload.length - dataLen > 2 || payload.length % 4 !== 0) return null;
	const out = new Uint8Array(Math.floor(dataLen * 3 / 4));
	let n = 0, val = 0, bits = 0;
	for (let i = 0; i < dataLen; i++) {
		const c = payload.charCodeAt(i);
		const d = c < 256 ? TABLE[c] : -1;
		if (d < 0) return null;
		val = (val << 6 | d) & 16777215;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out[n++] = val >> bits & 255;
		}
	}
	return out.subarray(0, n);
}
// web/zonos3/finish-engine-response.mjs
/** Close a successful engine response or expose a post-start inference failure to its stream reader. */
function finishEngineResponse(pending, error) {
	if (!pending) return;
	if (error !== void 0 && error !== null) {
		const failure = error instanceof Error ? error : new Error(String(error));
		if (pending.controller) try {
			pending.controller.error(failure);
		} catch {}
		else pending.reject(failure);
	} else if (pending.controller) try {
		pending.controller.close();
	} catch {}
}
function failEngineResponses(pendingResponses, error) {
	const failure = error instanceof Error ? error : new Error(String(error));
	for (const [id, pending] of pendingResponses) {
		finishEngineResponse(pending, failure.message);
		pendingResponses.delete(id);
	}
}
var generation_default = {
	description: "Request defaults and limits of every server and the studio (zonos3.generation). sample_rate: the API's audio rate (Hz). sampling: the v2 sampling defaults (servers/api/openapi.yaml repeats them; model/tests/test_generation.py keeps the two equal). silence_prefill_frames: the server default length (ZONOS3_SILENCE_PREFILL_FRAMES overrides it) and the longest a request may ask for. decode_context_frames: the reference tail decoded ahead of the stream when a request leaves decode_context_frames unset or 0. reference_max_frames: the reference prefix of the GGUF servers (60 s at the dual codec's 2940-sample hop; longer reference codes keep their first frames). max_frames: the GGUF servers' default frame budget (--max). audio_max_seconds: the longest reference clip, upload and speech-edit clip. stream_codebooks: the prefix stream's early partial-frame decode defaults (request fields stream_codebooks / stream_codebooks_scope): a frame is decoded once its first `default` codebooks arrived, for the `scope` chunks (first: the first chunk only; all: every chunk); default = n_codebooks decodes complete frames only. output_limit_dbfs: the knee k of the soft limiter every server applies after the decoder's output gain: samples at or below it pass unchanged, louder ones bend smoothly into full scale, sign(x) (k + (1 - k) tanh((|x| - k) / (1 - k))).",
	sample_rate: 44100,
	sampling: {
		"temperature": .75,
		"topk": 80,
		"top_p": .69,
		"min_p": 0,
		"repetition_penalty": 2.4,
		"repetition_window": 96,
		"repetition_codebooks": 6
	},
	silence_prefill_frames: {
		"default": 3,
		"max": 30
	},
	decode_context_frames: 30,
	reference_max_frames: 900,
	max_frames: 2e3,
	audio_max_seconds: {
		"reference": 60,
		"upload": 600,
		"edit": 150
	},
	stream_codebooks: {
		"default": 1,
		"scope": "first"
	},
	output_limit_dbfs: -1
};
// web/zonos3/upstream/servers/web/src/generation.ts
/** The API's audio rate (Hz): generated audio, uploads and default-voice clips. */
var SAMPLE_RATE = generation_default.sample_rate;
Object.freeze({ ...generation_default.sampling });
generation_default.silence_prefill_frames.default;
generation_default.silence_prefill_frames.max;
generation_default.decode_context_frames;
generation_default.reference_max_frames;
/** The frame budget of a request (its max_tokens is capped here). */
var MAX_FRAMES = generation_default.max_frames;
generation_default.stream_codebooks.default;
generation_default.stream_codebooks.scope;
MAX_FRAMES + 4096;
/** The longest reference clip (seconds) the reference and speaker encoders take. */
var REFERENCE_AUDIO_MAX_SECONDS = generation_default.audio_max_seconds.reference;
/** The longest speech-edit source (seconds) the capabilities advertise. */
var EDIT_MAX_SECONDS = generation_default.audio_max_seconds.edit;
generation_default.output_limit_dbfs;
// web/zonos3/upstream/servers/web/src/gpu/weights.ts
/** `?models=` when given, else `/models/` on this origin (a worker's `location` shares the page origin). */
function modelsBaseUrl() {
	const loc = typeof location === "undefined" ? void 0 : location;
	const q = loc ? new URLSearchParams(loc.search).get("models") : null;
	if (q) return q.endsWith("/") ? q : q + "/";
	return new URL("/models/", loc?.origin ?? "http://localhost/").href;
}
async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`);
	return res.json();
}
// web/zonos3/upstream/servers/web/src/client.ts
var worker = new Worker(new URL(
	/* @vite-ignore */
	new URL("worker.js", import.meta.url).href,
	"" + import.meta.url
), { type: "module" });
/** The routes whose body carries audio the worker reads: its field and the longest stretch decoded (seconds). */
var AUDIO_ROUTES = {
	"/v2/speakers": {
		field: "speaker_audio_base64",
		maxSeconds: REFERENCE_AUDIO_MAX_SECONDS
	},
	"/v2/generate": {
		field: "speaker_audio_base64",
		maxSeconds: REFERENCE_AUDIO_MAX_SECONDS
	},
	"/v1/audio/speech": {
		field: "speaker_audio_base64",
		maxSeconds: REFERENCE_AUDIO_MAX_SECONDS
	},
	"/v2/edit": {
		field: "audio_base64",
		maxSeconds: EDIT_MAX_SECONDS
	},
	"/v2/edit/align": {
		field: "audio_base64",
		maxSeconds: EDIT_MAX_SECONDS
	}
};
var codecWorker = new Worker(new URL(
	/* @vite-ignore */
	new URL("codec-worker.js", import.meta.url).href,
	"" + import.meta.url
), { type: "module" });
var pending = /* @__PURE__ */ new Map();
var nextId = 1;
var ready = false;
var initPromise = null;
var initResolve = null;
var initReject = null;
var selectedAdapter = null;
var lastDispatchProbe = null;
var onProgress = null;
var fatalCbs = [];
var encoderCbs = [];
var send = (m, transfer = []) => worker.postMessage(m, transfer);
worker.onmessage = (ev) => {
	const m = ev.data;
	switch (m.type) {
		case "adapter":
			selectedAdapter = m.adapter;
			break;
		case "progress": {
			const { type: _, ...p } = m;
			if (!ready) onProgress?.(p);
			else for (const cb of encoderCbs) cb(p);
			break;
		}
		case "ready":
			ready = true;
			initResolve?.();
			break;
		case "fatal":
			if (!ready) initReject?.(new Error(m.message));
			else {
				failEngineResponses(pending, m.message);
				for (const cb of fatalCbs) cb(m.message);
			}
			break;
		case "res": {
			const p = pending.get(m.id);
			if (!p) break;
			const body = new ReadableStream({ start: (c) => {
				p.controller = c;
			} });
			p.resolve(new Response(body, {
				status: m.status,
				headers: m.headers
			}));
			break;
		}
		case "chunk":
			pending.get(m.id)?.controller?.enqueue(new Uint8Array(m.data));
			break;
		case "end":
			lastDispatchProbe = m.probe ?? null;
			finishEngineResponse(pending.get(m.id), m.error);
			pending.delete(m.id);
	}
};
worker.onerror = (ev) => {
	const msg = ev.message || "engine worker failed to start";
	if (!ready) initReject?.(new Error(msg));
	else {
		failEngineResponses(pending, msg);
		for (const cb of fatalCbs) cb(msg);
	}
};
codecWorker.onerror = (ev) => {
	const msg = "codec worker failed: " + (ev.message || "did not start");
	if (!ready) initReject?.(new Error(msg));
	else {
		failEngineResponses(pending, msg);
		for (const cb of fatalCbs) cb(msg);
	}
};
/** Decode any browser-supported audio file to API-rate mono (downmix + resample), cropped to `maxSeconds`
*  (REFERENCE_AUDIO_MAX_SECONDS by default); `seconds` is the whole file's length. */
async function decodeTo44k(bytes, maxSeconds = REFERENCE_AUDIO_MAX_SECONDS) {
	const decoded = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(bytes);
	const len = Math.min(Math.ceil(decoded.duration * SAMPLE_RATE), maxSeconds * SAMPLE_RATE);
	if (len <= 0) return {
		pcm: /* @__PURE__ */ new Float32Array(0),
		seconds: decoded.duration
	};
	const ctx = new OfflineAudioContext(1, len, SAMPLE_RATE);
	const src = ctx.createBufferSource();
	src.buffer = decoded;
	src.connect(ctx.destination);
	src.start();
	return {
		pcm: (await ctx.startRendering()).getChannelData(0).slice(0, len),
		seconds: decoded.duration
	};
}
/** Each default voice's clip as 44.1 kHz mono (null-free: a clip that fails to decode is left out). */
async function defaultVoicesPcm(base, voiceIds) {
	const voicesBase = new URL("voices/", base).href;
	const voices = selectVoices(await fetchJson(voicesBase + "voices.json"), voiceIds);
	const out = {};
	await Promise.all(voices.map(async (v) => {
		try {
			const r = await fetch(new URL(v.file, voicesBase).href);
			if (r.ok) out[v.id] = (await decodeTo44k(await r.arrayBuffer())).pcm;
		} catch (e) {
			console.warn(`zonos3-web: default voice ${v.file} did not decode`, e);
		}
	}));
	return out;
}
function selectVoices(published, voiceIds) {
	if (voiceIds === void 0) return published;
	if (!Array.isArray(voiceIds) || voiceIds.length === 0 || voiceIds.some((id) => typeof id !== "string" || !id)) throw new Error("voiceIds must be a nonempty list of published default voice ids.");
	const selectedIds = new Set(voiceIds);
	if (selectedIds.size !== voiceIds.length) throw new Error("voiceIds must not contain duplicates.");
	const selected = published.filter((voice) => selectedIds.has(voice.id));
	if (selected.length !== selectedIds.size) throw new Error("voiceIds includes a voice absent from the pinned voices.json.");
	return selected;
}
var engine = {
	init(progress, opts = {}) {
		onProgress = progress;
		initPromise ??= (async () => {
			if (!("gpu" in navigator) || !navigator.gpu) throw new Error("ZONOS3_UNSUPPORTED_WEBGPU: the client worker has no navigator.gpu.");
			const base = opts.base ?? modelsBaseUrl();
			const voicesPcm = opts.loadVoicePreviews === false ? {} : await defaultVoicesPcm(base, opts.voiceIds);
			const started = Promise.withResolvers();
			initResolve = started.resolve;
			initReject = started.reject;
			const ch = new MessageChannel();
			codecWorker.postMessage({ type: "port" }, [ch.port2]);
			send({
				type: "init",
				base,
				cache: opts.cache ?? true,
				voicesPcm,
				voiceIds: opts.voiceIds,
				codecPort: ch.port1
			}, [...Object.values(voicesPcm).map((p) => p.buffer), ch.port1]);
			await started.promise;
		})().catch((e) => {
			initPromise = null;
			throw e;
		});
		return initPromise;
	},
	onFatal(cb) {
		fatalCbs.push(cb);
	},
	onEncoderProgress(cb) {
		encoderCbs.push(cb);
	}
};
function getSelectedAdapterInfo() {
	return selectedAdapter ? { ...selectedAdapter } : null;
}
/** The last request's worker-local dispatch evidence; an ordinary scored request resets it to null. */
function getLastDispatchProbe() {
	const value = lastDispatchProbe;
	lastDispatchProbe = null;
	return value;
}
/** Stop the in-process workers. The benchmark wrapper owns this module in a disposable worker per cell. */
function dispose() {
	for (const call of pending.values()) call.reject(new DOMException("The ZONOS3 benchmark engine was disposed.", "AbortError"));
	pending.clear();
	worker.terminate();
	codecWorker.terminate();
	ready = false;
	initPromise = null;
	initResolve = null;
	initReject = null;
	selectedAdapter = null;
	lastDispatchProbe = null;
	onProgress = null;
	fatalCbs.length = 0;
	encoderCbs.length = 0;
}
/** The route's audio field of a JSON body decoded to 44.1 kHz mono (at most the route's maxSeconds) and the upload's
*  whole length; undefined when absent or undecodable (the worker answers the API's 400 for those after validating the
*  body). */
async function requestPcm(body, route) {
	if (!body) return void 0;
	let json;
	try {
		json = JSON.parse(new TextDecoder().decode(body));
	} catch {
		return;
	}
	if (!json || typeof json !== "object" || !(route.field in json)) return void 0;
	const v = Reflect.get(json, route.field);
	if (typeof v !== "string" || !v.trim()) return void 0;
	const bytes = b64DecodeStrict(v);
	if (!bytes) return void 0;
	try {
		const decoded = await decodeTo44k(bytes.slice().buffer, route.maxSeconds);
		return decoded.pcm.length ? decoded : void 0;
	} catch {
		return;
	}
}
/** fetch() for the v2 API, served by the engine worker. Accepts a Request (openapi-fetch) or a URL plus init. */
async function localFetch(input, init) {
	const req = input instanceof Request ? input : null;
	const url = new URL(req ? req.url : String(input), location.href);
	const path = url.pathname + url.search;
	const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
	const headers = {};
	new Headers(init?.headers ?? req?.headers).forEach((v, k) => {
		headers[k.toLowerCase()] = v;
	});
	let body = null;
	if (init?.body !== void 0 && init.body !== null) body = await new Response(init.body).arrayBuffer();
	else if (req && method !== "GET" && method !== "HEAD") body = await req.arrayBuffer();
	if (body && body.byteLength === 0) body = null;
	const route = method === "POST" ? AUDIO_ROUTES[url.pathname] : void 0;
	const audio = route ? await requestPcm(body, route) : void 0;
	const signal = init?.signal ?? req?.signal ?? null;
	const id = nextId++;
	const { promise, resolve, reject } = Promise.withResolvers();
	const p = {
		resolve,
		reject
	};
	pending.set(id, p);
	if (signal) {
		const onAbort = () => {
			send({
				type: "abort",
				id
			});
			const err = new DOMException("The operation was aborted.", "AbortError");
			if (p.controller) try {
				p.controller.error(err);
			} catch {}
			else reject(err);
			pending.delete(id);
		};
		if (signal.aborted) {
			onAbort();
			return promise;
		}
		signal.addEventListener("abort", onAbort, { once: true });
	}
	const transfer = [];
	if (body) transfer.push(body);
	if (audio) transfer.push(audio.pcm.buffer);
	send({
		type: "req",
		id,
		method,
		path,
		headers,
		body,
		pcm: audio?.pcm,
		pcmSeconds: audio?.seconds
	}, transfer);
	return promise;
}
export { decodeTo44k, dispose, engine, getLastDispatchProbe, getSelectedAdapterInfo, localFetch };
