// eSpeak NG 1.52.0 compiled to WebAssembly (WASI), with a tiny in-memory file system
// for its data. Works in browsers, Node and Web Workers; no dependencies.
//
//   const espeak = await Espeak.load(wasmUrl, dataUrl);
//   espeak.phonemes("ආයුබෝවන්")   // -> "ˈaː_j_u_b_oː_w_ə_n"  (as phonemizer gets it)
//
// The data file is a pack of the espeak-ng-data files from the espeakng-loader 0.2.4
// wheel, so phonemes are identical to the Python front end used for training.

const ROOT = "/espeak-ng-data";
const E = { SUCCESS: 0, BADF: 8, INVAL: 28, NOENT: 44, NOTDIR: 54, ROFS: 69, NOSYS: 52 };
const FILETYPE = { CHAR: 2, DIR: 3, FILE: 4 };

function unpack(buffer) {
  // [u32 header length][JSON header: [[path, offset, size], ...]][file bytes]
  const view = new DataView(buffer);
  const length = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
  const base = 4 + length;
  const files = new Map();
  const dirs = new Map([["", new Set()]]);
  for (const [path, offset, size] of header) {
    files.set(path, new Uint8Array(buffer, base + offset, size));
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const parent = parts.slice(0, i - 1).join("/");
      const name = parts[i - 1];
      if (!dirs.has(parent)) dirs.set(parent, new Set());
      dirs.get(parent).add(name);
      if (i < parts.length && !dirs.has(parts.slice(0, i).join("/"))) dirs.set(parts.slice(0, i).join("/"), new Set());
    }
  }
  return { files, dirs };
}

function makeWasi(fs, getMemory, log) {
  const fds = new Map([
    [0, { kind: "char" }], [1, { kind: "char" }], [2, { kind: "char" }],
    [3, { kind: "dir", path: "" }],
  ]);
  let nextFd = 4;
  const mem = () => getMemory();
  const u8 = () => new Uint8Array(mem().buffer);
  const dv = () => new DataView(mem().buffer);
  const str = (ptr, len) => new TextDecoder().decode(u8().subarray(ptr, ptr + len));

  const resolve = (dirPath, rel) => {
    const out = dirPath ? dirPath.split("/") : [];
    for (const part of rel.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") out.pop(); else out.push(part);
    }
    return out.join("/");
  };

  return {
    args_get: () => E.SUCCESS,
    args_sizes_get: (c, s) => { dv().setUint32(c, 0, true); dv().setUint32(s, 0, true); return E.SUCCESS; },
    environ_get: () => E.SUCCESS,
    environ_sizes_get: (c, s) => { dv().setUint32(c, 0, true); dv().setUint32(s, 0, true); return E.SUCCESS; },
    clock_time_get: (id, precision, ptr) => { dv().setBigUint64(ptr, BigInt(Date.now()) * 1000000n, true); return E.SUCCESS; },
    proc_exit: (code) => { throw new Error(`espeak exited with ${code}`); },
    random_get: (ptr, len) => { crypto.getRandomValues(u8().subarray(ptr, ptr + len)); return E.SUCCESS; },

    fd_prestat_get: (fd, ptr) => {
      if (fd !== 3) return E.BADF;
      dv().setUint8(ptr, 0); dv().setUint32(ptr + 4, ROOT.length, true); return E.SUCCESS;
    },
    fd_prestat_dir_name: (fd, ptr, len) => {
      if (fd !== 3) return E.BADF;
      u8().set(new TextEncoder().encode(ROOT).subarray(0, len), ptr); return E.SUCCESS;
    },
    fd_fdstat_get: (fd, ptr) => {
      const f = fds.get(fd); if (!f) return E.BADF;
      const d = dv();
      d.setUint8(ptr, f.kind === "dir" ? FILETYPE.DIR : f.kind === "file" ? FILETYPE.FILE : FILETYPE.CHAR);
      d.setUint16(ptr + 2, 0, true);
      d.setBigUint64(ptr + 8, 0xffffffffffffffffn, true);
      d.setBigUint64(ptr + 16, 0xffffffffffffffffn, true);
      return E.SUCCESS;
    },
    fd_fdstat_set_flags: () => E.SUCCESS,
    path_open: (dirfd, dirflags, pathPtr, pathLen, oflags, rightsBase, rightsInh, fdflags, fdOut) => {
      const dir = fds.get(dirfd); if (!dir || dir.kind !== "dir") return E.BADF;
      if (oflags & (1 | 4 | 8)) return E.ROFS;            // create / exclusive / truncate: read-only file system
      const path = resolve(dir.path, str(pathPtr, pathLen));
      let entry;
      if (fs.files.has(path)) {
        if (oflags & 2) return E.NOTDIR;
        entry = { kind: "file", path, data: fs.files.get(path), pos: 0 };
      } else if (fs.dirs.has(path)) {
        entry = { kind: "dir", path };
      } else {
        return E.NOENT;
      }
      if (log) log(path);
      const fd = nextFd++; fds.set(fd, entry); dv().setUint32(fdOut, fd, true); return E.SUCCESS;
    },
    path_filestat_get: (dirfd, flags, pathPtr, pathLen, ptr) => {
      const dir = fds.get(dirfd); if (!dir || dir.kind !== "dir") return E.BADF;
      const path = resolve(dir.path, str(pathPtr, pathLen));
      const isFile = fs.files.has(path), isDir = fs.dirs.has(path);
      if (!isFile && !isDir) return E.NOENT;
      const d = dv();
      for (let i = 0; i < 64; i += 8) d.setBigUint64(ptr + i, 0n, true);
      d.setUint8(ptr + 16, isFile ? FILETYPE.FILE : FILETYPE.DIR);
      d.setBigUint64(ptr + 24, 1n, true);
      d.setBigUint64(ptr + 32, BigInt(isFile ? fs.files.get(path).length : 0), true);
      return E.SUCCESS;
    },
    fd_read: (fd, iovs, iovsLen, nreadPtr) => {
      const f = fds.get(fd); if (!f || f.kind !== "file") return E.BADF;
      let total = 0; const d = dv(), m = u8();
      for (let i = 0; i < iovsLen; i++) {
        const buf = d.getUint32(iovs + i * 8, true), len = d.getUint32(iovs + i * 8 + 4, true);
        const chunk = f.data.subarray(f.pos, Math.min(f.pos + len, f.data.length));
        m.set(chunk, buf); f.pos += chunk.length; total += chunk.length;
        if (chunk.length < len) break;
      }
      d.setUint32(nreadPtr, total, true); return E.SUCCESS;
    },
    fd_seek: (fd, offset, whence, newPtr) => {
      const f = fds.get(fd); if (!f || f.kind !== "file") return E.BADF;
      const base = whence === 0 ? 0 : whence === 1 ? f.pos : f.data.length;
      const pos = base + Number(offset); if (pos < 0) return E.INVAL;
      f.pos = pos; dv().setBigUint64(newPtr, BigInt(pos), true); return E.SUCCESS;
    },
    fd_write: (fd, iovs, iovsLen, nPtr) => {
      let total = 0; const d = dv(), parts = [];
      for (let i = 0; i < iovsLen; i++) {
        const buf = d.getUint32(iovs + i * 8, true), len = d.getUint32(iovs + i * 8 + 4, true);
        parts.push(u8().slice(buf, buf + len)); total += len;
      }
      if (fd === 1 || fd === 2) { const text = parts.map(p => new TextDecoder().decode(p)).join(""); if (text.trim()) console.warn("[espeak]", text.trim()); }
      d.setUint32(nPtr, total, true); return E.SUCCESS;
    },
    fd_close: (fd) => { if (fd > 3) fds.delete(fd); return E.SUCCESS; },
    fd_readdir: (fd, buf, bufLen, cookie, usedPtr) => {
      const f = fds.get(fd); if (!f || f.kind !== "dir") return E.BADF;
      const names = [".", "..", ...[...(fs.dirs.get(f.path) || [])].sort()];
      const d = dv(), m = u8(); let used = 0;
      for (let i = Number(cookie); i < names.length; i++) {
        const name = new TextEncoder().encode(names[i]);
        const child = f.path ? `${f.path}/${names[i]}` : names[i];
        const type = names[i] === "." || names[i] === ".." || fs.dirs.has(child) ? FILETYPE.DIR : FILETYPE.FILE;
        const header = new Uint8Array(24); const hv = new DataView(header.buffer);
        hv.setBigUint64(0, BigInt(i + 1), true); hv.setBigUint64(8, BigInt(i + 1), true);
        hv.setUint32(16, name.length, true); hv.setUint8(20, type);
        const entry = new Uint8Array(24 + name.length); entry.set(header); entry.set(name, 24);
        const room = bufLen - used;
        m.set(entry.subarray(0, Math.min(room, entry.length)), buf + used);
        used += Math.min(room, entry.length);
        if (used >= bufLen) break;
      }
      d.setUint32(usedPtr, used, true); return E.SUCCESS;
    },
    path_remove_directory: () => E.ROFS,
    path_unlink_file: () => E.ROFS,
  };
}

export class Espeak {
  static async load(wasm, data, { voice = "inc/si", log = null } = {}) {
    const fetchBytes = async (x) => (x instanceof ArrayBuffer ? x : await (await fetch(x)).arrayBuffer());
    const [wasmBytes, dataBytes] = await Promise.all([fetchBytes(wasm), fetchBytes(data)]);
    const fs = unpack(dataBytes);
    let instance;
    const wasi = makeWasi(fs, () => instance.exports.memory, log);
    ({ instance } = await WebAssembly.instantiate(wasmBytes, { wasi_snapshot_preview1: wasi }));
    instance.exports._initialize();
    const espeak = new Espeak(instance.exports);
    if (espeak._call("ev_init", ROOT) <= 0) throw new Error("eSpeak NG failed to initialise");
    if (espeak._call("ev_voice", voice) !== 0) throw new Error(`eSpeak NG has no voice ${voice}`);
    return espeak;
  }

  constructor(exports) { this.ex = exports; }

  _call(name, text) {
    const bytes = new TextEncoder().encode(text + "\0");
    const ptr = this.ex.ev_alloc(bytes.length);
    new Uint8Array(this.ex.memory.buffer, ptr, bytes.length).set(bytes);
    try { return this.ex[name](ptr); } finally { this.ex.ev_free(ptr); }
  }

  /** Raw eSpeak output, exactly what phonemizer's text_to_phonemes returns. */
  phonemes(text) {
    const out = this._call("ev_phonemes", text);
    const m = new Uint8Array(this.ex.memory.buffer);
    let end = out; while (m[end]) end++;
    return new TextDecoder().decode(m.subarray(out, end));
  }
}
