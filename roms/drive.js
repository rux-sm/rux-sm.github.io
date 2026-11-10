/* ==========================================================================
   drive.js — the drive as scan.js reads it, in Chrome
   --------------------------------------------------------------------------
   A folder rux picked, the drive's emulation folder, read through Chrome's
   file system access, in the shape scan.js asks for. Fingerprints are
   hashed with hash-wasm, CRC32, MD5 and SHA-1 in one pass over each file,
   because Chrome's own crypto has no MD5 and hashes only a whole buffer.

   Chrome tells a page when a file was last changed but not when it was
   made, so a save's created date here is its last-changed date.
   ========================================================================== */
(root => {
  'use strict';

  const CHUNK = 8 << 20;
  const notFound = e => e?.name === 'NotFoundError' || e?.name === 'TypeMismatchError';

  // Each byte as the character of the same number, as Node's latin1 reads it.
  const latin1 = b => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };

  // `top` is the emulation folder's handle; `progress(read, all)` is told
  // now and then how many new bytes are hashed.
  function driveOf(top, { progress } = {}) {
    const dirs = new Map([['', top]]);
    const files = new Map();
    const parts = rel => rel.split('/').filter(Boolean);

    async function dir(rel) {
      if (dirs.has(rel)) return dirs.get(rel);
      let d = top;
      let at = '';
      for (const p of parts(rel)) {
        at = at ? `${at}/${p}` : p;
        if (dirs.has(at)) { d = dirs.get(at); continue; }
        try { d = await d.getDirectoryHandle(p); } catch (e) { if (notFound(e)) return null; throw e; }
        dirs.set(at, d);
      }
      return d;
    }
    async function file(rel) {
      if (files.has(rel)) return files.get(rel);
      const ps = parts(rel);
      const d = await dir(ps.slice(0, -1).join('/'));
      if (!d) return null;
      try {
        const f = await (await d.getFileHandle(ps.at(-1))).getFile();
        files.set(rel, f);
        return f;
      } catch (e) { if (notFound(e)) return null; throw e; }
    }

    return {
      async list(rel) {
        const d = await dir(rel);
        if (!d) return [];
        const out = [];
        for await (const [name, h] of d.entries()) {
          if (name.startsWith('.')) continue;
          const at = rel ? `${rel}/${name}` : name;
          if (h.kind === 'directory') {
            dirs.set(at, h);
            out.push({ name, dir: true, size: 0, mtimeMs: 0, birthtimeMs: 0 });
          } else {
            const f = await h.getFile();
            files.set(at, f);
            out.push({ name, dir: false, size: f.size, mtimeMs: f.lastModified, birthtimeMs: f.lastModified });
          }
        }
        return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      },
      async read(rel, offset, length) {
        const f = await file(rel);
        return new Uint8Array(await f.slice(offset, offset + length).arrayBuffer());
      },
      async *chunks(rel) {
        const f = await file(rel);
        for (let at = 0; at < f.size; at += CHUNK) yield new Uint8Array(await f.slice(at, at + CHUNK).arrayBuffer());
      },
      async text(rel, enc) {
        const f = await file(rel);
        if (!f) return null;
        return enc === 'latin1' ? latin1(new Uint8Array(await f.arrayBuffer())) : f.text();
      },
      async exists(rel) { return Boolean(await file(rel)); },
      async hasher() {
        const hw = root.hashwasm;
        const [crc, md5, sha1] = await Promise.all([hw.createCRC32(), hw.createMD5(), hw.createSHA1()]);
        for (const h of [crc, md5, sha1]) h.init();
        return {
          update(b) { crc.update(b); md5.update(b); sha1.update(b); },
          digest: () => ({ crc32: crc.digest('hex'), md5: md5.digest('hex'), sha1: sha1.digest('hex') }),
        };
      },
      progress,
    };
  }

  const api = { driveOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Roms = Object.assign(root.Roms || {}, { drive: api });
})(typeof window === 'object' ? window : globalThis);
