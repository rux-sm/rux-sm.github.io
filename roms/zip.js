/* ==========================================================================
   zip.js — the backup zip, packed in the page
   --------------------------------------------------------------------------
   The saves, BIOS and keys the scan names, packed as one zip the way the
   Mac's own zip packs them: each file under its path in the emulation
   folder, with its last-changed date, compressed with
   Chrome's own deflate where that makes it smaller. A file is under 50 MB
   and the zip under 4 GB, so plain zip fields hold every size.
   ========================================================================== */
(root => {
  'use strict';

  // A date as a zip keeps it, in local time to two seconds.
  const dos = ms => {
    const d = new Date(ms);
    const y = Math.max(1980, d.getFullYear());
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
  };

  // Bytes deflated as a zip stores them, with no header of their own.
  const deflate = async bytes => new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());

  // `files` are { name, bytes, modified } in order; `crc32(bytes)` is the
  // scan's. The zip as a Blob.
  async function zip(files, crc32) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let at = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.bytes);
      const packed = await deflate(f.bytes);
      const method = packed.length < f.bytes.length ? 8 : 0;
      const data = method ? packed : f.bytes;
      const { time, date } = dos(f.modified);
      // Bit 11 says the name is UTF-8.
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);
      local.setUint16(8, method, true);
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, f.bytes.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(local, name, data);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, (3 << 8) | 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, method, true);
      entry.setUint16(12, time, true);
      entry.setUint16(14, date, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, f.bytes.length, true);
      entry.setUint16(28, name.length, true);
      // A plain file readable by all, as a Unix permission in the high bits.
      entry.setUint32(38, (0o100644 << 16) >>> 0, true);
      entry.setUint32(42, at, true);
      central.push(entry, name);
      at += 30 + name.length + data.length;
    }
    const size = central.reduce((a, p) => a + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, at, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  const api = { zip };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Roms = Object.assign(root.Roms || {}, { zip: api });
})(typeof window === 'object' ? window : globalThis);
