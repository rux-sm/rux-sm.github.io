/* ==========================================================================
   drive.js — the drive as scan.js reads it, through Rux Emu Helper
   --------------------------------------------------------------------------
   The collection Rux Emu Helper found on this Mac, read and written through
   its /drive calls, helper.js, in the shape scan.js asks for, every path
   relative to the emulation folder. The helper fingerprints a file itself,
   CRC32, MD5 and SHA-1 in one pass on the Mac, so only the three come
   over, and says when a file was made, so a save's created date is its
   own.
   ========================================================================== */
(root => {
  'use strict';

  // Each byte as the character of the same number, as Node's latin1 reads it.
  const latin1 = b => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };

  // `progress(read, all)` is told after each file how many new bytes are hashed.
  function driveOf({ progress } = {}) {
    const { call } = root.Emu.helper;
    const at = rel => `path=${encodeURIComponent(rel)}`;
    const stats = new Map();
    const bytes = async (rel, from, n) => {
      const range = from == null ? '' : `&at=${from}&n=${n}`;
      const r = await call(`/drive/file?${at(rel)}${range}`);
      return r && new Uint8Array(await r.arrayBuffer());
    };
    const stat = async rel => {
      if (!stats.has(rel)) {
        const r = await call(`/drive/stat?${at(rel)}`);
        stats.set(rel, r && await r.json());
      }
      return stats.get(rel);
    };

    return {
      async list(rel) {
        const r = await call(`/drive/list?${at(rel)}`);
        const out = r ? await r.json() : [];
        for (const e of out) if (!e.dir) stats.set(rel ? `${rel}/${e.name}` : e.name, { size: e.size, mtimeMs: e.mtimeMs });
        return out;
      },
      read: (rel, offset, length) => bytes(rel, offset, length),
      async text(rel, enc) {
        const b = await bytes(rel);
        if (!b) return null;
        return enc === 'latin1' ? latin1(b) : new TextDecoder().decode(b);
      },
      async exists(rel) { return Boolean(await stat(rel)); },
      // A file's size and last-changed time, or null.
      stat,
      fingerprint: async rel => (await call(`/drive/fingerprint?${at(rel)}`, {}, true)).json(),
      progress,
      // Written whole into place, the folders it needs made.
      async write(rel, data) {
        stats.delete(rel);
        await call(`/drive/file?${at(rel)}`, { method: 'PUT', body: data }, true);
      },
      async remove(rel) {
        stats.delete(rel);
        await call(`/drive/file?${at(rel)}`, { method: 'DELETE' }, true);
      },
    };
  }

  root.Emu = Object.assign(root.Emu || {}, { drive: { driveOf } });
})(window);
