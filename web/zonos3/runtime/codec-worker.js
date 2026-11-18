// web/zonos3/upstream/servers/web/src/istft.ts
/** Real inverse DFT of even length n from FFTPACK halfcomplex input [r0, r1, i1, …, r(n/2-1), i(n/2-1), r(n/2)]:
*  x[j] = scale * (r0 + r(n/2)(-1)^j + 2 Σ_k (rk cos(2πjk/n) - ik sin(2πjk/n))). Half-length transform: with
*  M = n/2 and X the Hermitian spectrum, z[m] = x[2m] + i x[2m+1] is the inverse complex DFT of size M of
*  Z[k] = (X[k] + X[k+M]) + i e^{2πik/n} (X[k] - X[k+M]), X[k+M] = conj(X[M-k]). The size-M transform is a mixed-radix
*  decimation in time: radix-2/3 butterflies, a table-driven DFT for any other prime factor (23 here). */
var Irfft = class {
	n;
	m;
	factors = [];
	wc;
	ws;
	cos;
	sin;
	leaf = /* @__PURE__ */ new Map();
	xr;
	xi;
	yr;
	yi;
	tr;
	ti;
	ur;
	ui;
	vr;
	vi;
	constructor(n) {
		this.n = n;
		if (!Number.isInteger(n) || n < 2 || n % 2) throw new Error(`irfft: n=${n} must be even`);
		const m = this.m = n / 2;
		let r = m;
		for (const p of [2, 3]) while (r % p === 0) {
			this.factors.push(p);
			r /= p;
		}
		for (let p = 5; r > 1; p += 2) while (r % p === 0) {
			this.factors.push(p);
			r /= p;
		}
		this.factors.sort((a, b) => a - b);
		this.wc = new Float64Array(m);
		this.ws = new Float64Array(m);
		this.cos = new Float64Array(m);
		this.sin = new Float64Array(m);
		for (let k = 0; k < m; k++) {
			this.wc[k] = Math.cos(2 * Math.PI * k / n);
			this.ws[k] = Math.sin(2 * Math.PI * k / n);
			this.cos[k] = Math.cos(2 * Math.PI * k / m);
			this.sin[k] = Math.sin(2 * Math.PI * k / m);
		}
		for (const p of this.factors) {
			if (p < 5 || this.leaf.has(p)) continue;
			const h = (p - 1) / 2, c = new Float64Array(h * h), s = new Float64Array(h * h);
			for (let q = 1; q <= h; q++) for (let j = 1; j <= h; j++) {
				const a = 2 * Math.PI * (q * j % p) / p;
				c[(q - 1) * h + j - 1] = Math.cos(a);
				s[(q - 1) * h + j - 1] = Math.sin(a);
			}
			this.leaf.set(p, {
				c,
				s
			});
		}
		this.xr = new Float64Array(m);
		this.xi = new Float64Array(m);
		this.yr = new Float64Array(m);
		this.yi = new Float64Array(m);
		const pmax = this.factors.length ? this.factors[this.factors.length - 1] : 1;
		this.tr = new Float64Array(pmax);
		this.ti = new Float64Array(pmax);
		const hmax = pmax - 1 >> 1;
		this.ur = new Float64Array(hmax);
		this.ui = new Float64Array(hmax);
		this.vr = new Float64Array(hmax);
		this.vi = new Float64Array(hmax);
	}
	exec(hc, out, scale) {
		const { n, m, xr, xi, yr, yi, wc, ws } = this;
		for (let k = 0; k < m; k++) {
			const ar = k ? hc[2 * k - 1] : hc[0], ai = k ? hc[2 * k] : 0;
			const j = m - k;
			const br = j === m ? hc[n - 1] : hc[2 * j - 1], bi = j === m ? 0 : -hc[2 * j];
			const sr = ar + br, si = ai + bi, dr = ar - br, di = ai - bi;
			const c = wc[k], s = ws[k];
			xr[k] = sr - (c * di + s * dr);
			xi[k] = si + (c * dr - s * di);
		}
		if (this.factors.length) this.rec(0, 1, 0, 0, m);
		else {
			yr[0] = xr[0];
			yi[0] = xi[0];
		}
		for (let j = 0; j < m; j++) {
			out[2 * j] = yr[j] * scale;
			out[2 * j + 1] = yi[j] * scale;
		}
	}
	/** y[o + j] = Σ_k x[i0 + k*is] e^{+2πi jk/nl}, j < nl, splitting by factors[level..]. */
	rec(i0, is, o, level, nl) {
		const { xr, xi, yr, yi, tr, ti, cos, sin, m: n } = this;
		const p = this.factors[level], m = nl / p;
		if (m === 1) {
			for (let r = 0; r < p; r++) {
				tr[r] = xr[i0 + r * is];
				ti[r] = xi[i0 + r * is];
			}
			this.dft(p, o, 1);
			return;
		}
		for (let r = 0; r < p; r++) this.rec(i0 + r * is, is * p, o + r * m, level + 1, m);
		const s = n / nl;
		if (p === 2) {
			for (let j0 = 0, k = 0; j0 < m; j0++, k += s) {
				const i = o + j0, i2 = i + m;
				const a = yr[i2], b = yi[i2], c = cos[k], d = sin[k];
				const wr = a * c - b * d, wi = a * d + b * c, ar = yr[i], ai = yi[i];
				yr[i] = ar + wr;
				yi[i] = ai + wi;
				yr[i2] = ar - wr;
				yi[i2] = ai - wi;
			}
			return;
		}
		for (let j0 = 0; j0 < m; j0++) {
			tr[0] = yr[o + j0];
			ti[0] = yi[o + j0];
			for (let r = 1, k = j0 * s; r < p; r++, k += j0 * s) {
				const a = yr[o + r * m + j0], b = yi[o + r * m + j0];
				const c = cos[k], d = sin[k];
				tr[r] = a * c - b * d;
				ti[r] = a * d + b * c;
			}
			this.dft(p, o + j0, m);
		}
	}
	/** y[o + q*stride] = Σ_r t[r] w_p^(qr), q < p. Primes >= 5 pair r with p-r and q with p-q:
	*  y[q] = (A - B, D + C), y[p-q] = (A + B, D - C) with A = t0r + Σ (tr[r] + tr[p-r]) c, D = t0i + Σ (ti[r] + ti[p-r]) c,
	*  B = Σ (ti[r] - ti[p-r]) s, C = Σ (tr[r] - tr[p-r]) s over r <= (p-1)/2, c/s = cos/sin(2πqr/p). */
	dft(p, o, stride) {
		const { yr, yi, tr, ti } = this;
		if (p === 2) {
			yr[o] = tr[0] + tr[1];
			yi[o] = ti[0] + ti[1];
			yr[o + stride] = tr[0] - tr[1];
			yi[o + stride] = ti[0] - ti[1];
			return;
		}
		if (p === 3) {
			const c = -.5, d = Math.sqrt(3) / 2;
			const sr = tr[1] + tr[2], si = ti[1] + ti[2];
			const dr = tr[1] - tr[2], di = ti[1] - ti[2];
			const ar = tr[0] + c * sr, ai = ti[0] + c * si;
			yr[o] = tr[0] + sr;
			yi[o] = ti[0] + si;
			yr[o + stride] = ar - d * di;
			yi[o + stride] = ai + d * dr;
			yr[o + 2 * stride] = ar + d * di;
			yi[o + 2 * stride] = ai - d * dr;
			return;
		}
		const { ur, ui, vr, vi } = this;
		const { c, s } = this.leaf.get(p);
		const h = (p - 1) / 2;
		let y0r = tr[0], y0i = ti[0];
		for (let r = 1; r <= h; r++) {
			const ar = tr[r], ai = ti[r], br = tr[p - r], bi = ti[p - r];
			ur[r - 1] = ar + br;
			ui[r - 1] = ai + bi;
			vr[r - 1] = ar - br;
			vi[r - 1] = ai - bi;
			y0r += ar + br;
			y0i += ai + bi;
		}
		yr[o] = y0r;
		yi[o] = y0i;
		for (let q = 1; q <= h; q++) {
			let A = tr[0], D = ti[0], B = 0, C = 0;
			const row = (q - 1) * h;
			for (let r = 0; r < h; r++) {
				const cq = c[row + r], sq = s[row + r];
				A += ur[r] * cq;
				D += ui[r] * cq;
				B += vi[r] * sq;
				C += vr[r] * sq;
			}
			yr[o + q * stride] = A - B;
			yi[o + q * stride] = D + C;
			yr[o + (p - q) * stride] = A + B;
			yi[o + (p - q) * stride] = D - C;
		}
	}
};
/** Growable f32 vector with front erase (the std::vector<float> operations the C++ state uses). */
var Vec = class {
	data = /* @__PURE__ */ new Float32Array(0);
	len = 0;
	/** std::vector::resize(n, 0.0f). */
	resize(n) {
		if (n > this.data.length) {
			const d = new Float32Array(Math.max(n, 2 * this.data.length));
			d.set(this.data.subarray(0, this.len));
			this.data = d;
		} else if (n > this.len) this.data.fill(0, this.len, n);
		this.len = n;
	}
	erase(k) {
		this.data.copyWithin(0, k, this.len);
		this.len -= k;
	}
	clear() {
		this.len = 0;
	}
};
/** Streaming equivalent of torch.istft(center=True, length=frames*hop) per branch followed by the non-causal mixer
*  Conv1d (2 -> 1, taps K, zero padding (K-1)/2). Frame t of branch i overlaps padded positions [t*hop, t*hop + n);
*  branch sample m is padded position m + n/2. */
var IstftHead = class {
	nFft;
	hop;
	windows;
	mixer;
	fir;
	maxLogMag;
	irfft;
	hc;
	buf;
	ola = [new Vec(), new Vec()];
	env = [new Vec(), new Vec()];
	olaBase = [0, 0];
	mixIn = [new Vec(), new Vec()];
	mixAvail = [0, 0];
	mixBase = 0;
	mixNext = 0;
	headFrames = 0;
	headDone = false;
	constructor(p) {
		this.nFft = p.nFft;
		this.hop = p.hop;
		this.fir = p.mixer.length / 2;
		if (!Number.isInteger(this.fir) || this.fir % 2 !== 1) throw new Error(`istft: mixer has ${p.mixer.length} taps, expected 2 x odd`);
		for (let i = 0; i < 2; i++) if (p.windows[i].length !== p.nFft[i]) throw new Error(`istft: window ${i} has ${p.windows[i].length} taps, expected ${p.nFft[i]}`);
		this.windows = p.windows;
		this.mixer = p.mixer;
		this.maxLogMag = p.maxLogMag;
		this.irfft = [new Irfft(p.nFft[0]), new Irfft(p.nFft[1])];
		this.hc = [new Float64Array(p.nFft[0]), new Float64Array(p.nFft[1])];
		this.buf = [new Float32Array(p.nFft[0]), new Float32Array(p.nFft[1])];
	}
	/** Head frames pushed so far. */
	get frames() {
		return this.headFrames;
	}
	reset() {
		for (let i = 0; i < 2; i++) {
			this.ola[i].clear();
			this.env[i].clear();
			this.mixIn[i].clear();
			this.olaBase[i] = 0;
			this.mixAvail[i] = 0;
		}
		this.mixBase = 0;
		this.mixNext = 0;
		this.headFrames = 0;
		this.headDone = false;
	}
	/** Adds `nCols` head frames: y0 [nCols][n0 + 2], y1 [nCols][n1 + 2] (logmag[0:bins], phase[bins:2*bins]);
	*  returns the 44160 Hz samples that are final so far. */
	push(y0, y1, nCols) {
		if (this.headDone) throw new Error("istft: push after flush");
		if (this.headFrames === 0) this.init();
		const y = [y0, y1];
		const hop = this.hop;
		for (let i = 0; i < 2; i++) {
			const n = this.nFft[i], bins = n / 2 + 1;
			if (y[i].length < nCols * (n + 2)) throw new Error(`istft: branch ${i} has ${y[i].length} values, expected ${nCols * (n + 2)}`);
			const win = this.windows[i], hc = this.hc[i], buf = this.buf[i], yi = y[i], maxLog = this.maxLogMag;
			const ola = this.ola[i], env = this.env[i];
			for (let c = 0; c < nCols; c++) {
				const t = this.headFrames + c;
				const f = c * (n + 2), ph = f + bins;
				const mag = (k) => Math.exp(Math.min(yi[f + k], maxLog));
				hc[0] = mag(0) * Math.cos(yi[ph]);
				for (let k = 1; k < n / 2; k++) {
					const a = mag(k);
					hc[2 * k - 1] = a * Math.cos(yi[ph + k]);
					hc[2 * k] = a * Math.sin(yi[ph + k]);
				}
				hc[n - 1] = mag(n / 2) * Math.cos(yi[ph + n / 2]);
				this.irfft[i].exec(hc, buf, 1 / n);
				const need = t * hop + n - this.olaBase[i];
				if (ola.len < need) {
					ola.resize(need);
					env.resize(need);
				}
				const o = t * hop - this.olaBase[i], od = ola.data, ed = env.data;
				for (let j = 0; j < n; j++) {
					od[o + j] += win[j] * buf[j];
					ed[o + j] += win[j] * win[j];
				}
			}
		}
		this.headFrames += nCols;
		for (let i = 0; i < 2; i++) this.olaFinalize(i, this.headFrames * hop);
		return this.mixEmit();
	}
	/** End of stream: every sample m < L = frames*hop is final (the envelope only covers existing frames, like torch);
	*  the mixer's right zero padding is h zeros after the last branch sample. */
	flush() {
		if (this.headDone || this.headFrames === 0) return /* @__PURE__ */ new Float32Array(0);
		this.headDone = true;
		const h = (this.fir - 1) / 2;
		for (let i = 0; i < 2; i++) {
			this.olaFinalize(i, this.olaBase[i] + this.ola[i].len);
			const keep = h + this.headFrames * this.hop - this.mixBase;
			this.mixIn[i].resize(keep);
			this.mixIn[i].resize(keep + h);
			this.mixAvail[i] = this.mixBase + keep + h;
		}
		return this.mixEmit();
	}
	init() {
		const h = (this.fir - 1) / 2;
		for (let i = 0; i < 2; i++) {
			this.mixIn[i].clear();
			this.mixIn[i].resize(h);
			this.mixAvail[i] = h;
		}
		this.mixBase = 0;
		this.mixNext = 0;
	}
	/** Finalizes overlap-add positions [olaBase, pf) of branch i into the mixer input (dropping the centre padding m < 0). */
	olaFinalize(i, pf) {
		const pad = this.nFft[i] / 2;
		const n = pf - this.olaBase[i];
		if (n <= 0) return;
		const ola = this.ola[i], env = this.env[i], mix = this.mixIn[i];
		const skip = Math.min(n, Math.max(0, pad - this.olaBase[i]));
		const m0 = mix.len;
		mix.resize(m0 + n - skip);
		const md = mix.data, od = ola.data, ed = env.data;
		for (let j = skip; j < n; j++) md[m0 + j - skip] = od[j] / ed[j];
		this.mixAvail[i] += n - skip;
		ola.erase(n);
		env.erase(n);
		this.olaBase[i] = pf;
	}
	/** Emits mixer outputs y[m] for every m whose taps are available: mixIn index j holds s[j - h];
	*  y[m] = Σ_c Σ_k w[c][k] * mixIn_c[m + k]. */
	mixEmit() {
		const K = this.fir;
		const m1 = Math.min(this.mixAvail[0], this.mixAvail[1]) - K + 1;
		if (m1 <= this.mixNext) return /* @__PURE__ */ new Float32Array(0);
		const n = m1 - this.mixNext;
		const y = new Float32Array(n);
		for (let c = 0; c < 2; c++) {
			const s = this.mixIn[c].data, s0 = this.mixNext - this.mixBase, w = c * K;
			for (let k = 0; k < K; k++) {
				const wk = this.mixer[w + k];
				for (let i = 0; i < n; i++) y[i] += wk * s[s0 + i + k];
			}
		}
		this.mixNext = m1;
		for (let c = 0; c < 2; c++) if (this.mixNext > this.mixBase) this.mixIn[c].erase(this.mixNext - this.mixBase);
		this.mixBase = this.mixNext;
		return y;
	}
};
// web/zonos3/upstream/servers/web/src/resample.ts
var Resampler = class {
	kernel;
	orig;
	nw;
	width;
	buf = /* @__PURE__ */ new Float32Array(0);
	len = 0;
	base = 0;
	inCount = 0;
	nextBlock = 0;
	kl;
	lo;
	hi;
	constructor(kernel, orig = 736, nw = 735, width = 17) {
		this.kernel = kernel;
		this.orig = orig;
		this.nw = nw;
		this.width = width;
		this.kl = 2 * width + orig;
		if (kernel.length !== nw * this.kl) throw new Error(`resampler: kernel has ${kernel.length} taps, expected ${nw * this.kl}`);
		this.lo = new Int32Array(nw);
		this.hi = new Int32Array(nw);
		for (let i = 0; i < nw; i++) {
			const ki = i * this.kl;
			let a = 0;
			while (a < this.kl && kernel[ki + a] === 0) a++;
			let z = this.kl;
			while (z > a && kernel[ki + z - 1] === 0) z--;
			this.lo[i] = a;
			this.hi[i] = z;
		}
	}
	push(x) {
		if (this.len + x.length > this.buf.length) {
			const nb = new Float32Array(Math.max(this.len + x.length, 2 * this.buf.length));
			nb.set(this.buf.subarray(0, this.len));
			this.buf = nb;
		}
		this.buf.set(x, this.len);
		this.len += x.length;
		this.inCount += x.length;
		return this.run(false);
	}
	flush() {
		return this.run(true);
	}
	reset() {
		this.len = 0;
		this.base = 0;
		this.inCount = 0;
		this.nextBlock = 0;
	}
	run(flush) {
		const { orig: O, nw: N, width: W, kl: KL, kernel, lo, hi } = this;
		const total = flush ? Math.floor((N * this.inCount + O - 1) / O) : -1;
		const blocks = [];
		const xw = new Float32Array(KL);
		for (;; this.nextBlock++) {
			const n = this.nextBlock, x0 = n * O - W;
			if (flush ? n * N >= total : x0 + KL > this.inCount) break;
			for (let k = 0; k < KL; k++) {
				const j = x0 + k;
				xw[k] = j < 0 || j >= this.inCount ? 0 : this.buf[j - this.base];
			}
			const emit = flush ? Math.min(N, total - n * N) : N;
			const y = new Float32Array(emit);
			for (let i = 0; i < emit; i++) {
				const ki = i * KL;
				let acc = 0;
				for (let k = lo[i]; k < hi[i]; k++) acc += kernel[ki + k] * xw[k];
				y[i] = acc;
			}
			blocks.push(y);
		}
		const keepFrom = Math.min(this.inCount, Math.max(0, this.nextBlock * O - W));
		if (keepFrom > this.base) {
			const drop = keepFrom - this.base;
			this.buf.copyWithin(0, drop, this.len);
			this.len -= drop;
			this.base = keepFrom;
		}
		const out = new Float32Array(blocks.reduce((a, b) => a + b.length, 0));
		let o = 0;
		for (const b of blocks) {
			out.set(b, o);
			o += b.length;
		}
		return out;
	}
};
// web/zonos3/upstream/servers/web/src/spec-sink.ts
var LocalSpecSink = class {
	istft;
	rs;
	constructor(p) {
		this.istft = new IstftHead(p);
		this.rs = new Resampler(p.resampleKernel);
	}
	async push(s0, s1, cols) {
		return this.rs.push(this.istft.push(s0, s1, cols));
	}
	async flush() {
		const a = this.rs.push(this.istft.flush());
		const z = this.rs.flush();
		const out = new Float32Array(a.length + z.length);
		out.set(a);
		out.set(z, a.length);
		return out;
	}
	reset() {
		this.istft.reset();
		this.rs.reset();
	}
};
// web/zonos3/upstream/servers/web/src/codec-worker.ts
function serve(port) {
	let sink = null;
	let initError = "not initialized";
	let queue = Promise.resolve();
	const reply = (m, transfer = []) => port.postMessage(m, transfer);
	const handle = async (m) => {
		if (m.type === "init") {
			try {
				sink = new LocalSpecSink(m);
			} catch (e) {
				sink = null;
				initError = e instanceof Error ? e.message : String(e);
			}
			return;
		}
		if (m.type === "reset") {
			sink?.reset();
			return;
		}
		try {
			if (!sink) throw new Error(initError);
			const pcm = m.type === "push" ? await sink.push(m.s0, m.s1, m.cols) : await sink.flush();
			reply({
				type: "pcm",
				pcm
			}, [pcm.buffer]);
		} catch (e) {
			reply({
				type: "error",
				message: e instanceof Error ? e.message : String(e)
			});
		}
	};
	port.onmessage = (ev) => {
		const m = ev.data;
		if (m.type === "port") {
			if (ev.ports[0]) serve(ev.ports[0]);
			return;
		}
		queue = queue.then(() => handle(m));
	};
}
self.onmessage = (ev) => {
	if (ev.data.type === "port" && ev.ports[0]) serve(ev.ports[0]);
};
