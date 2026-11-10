/* ==========================================================================
   update.js — Update, on the Status page
   --------------------------------------------------------------------------
   Scans the drive in Chrome with scan.js, through a folder rux picks once,
   the drive's emulation folder, and reads each Mac's report that Check this
   Mac.command wrote to its `macs/` folder. It says what changed since the
   last save, or that nothing is, and saves on a yes: every game and save, the BIOS list and the
   drive's row, the backup zip to Supabase, and each Mac's report with any
   save it keeps itself.

   It writes back to the drive what the Mac scan writes: the fingerprints,
   so the next scan hashes only what changed, the scan file the organize
   tool reads, and the backup zip, the newest five kept.

   It runs when Status opens if Chrome already lets it read the folder, and
   again on a click; nothing is saved until Save.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  if (!R?.data) return;

  const DRIVE = 'drive';
  const key = g => `${g.system}/${g.title}`;
  const saveKey = s => `${s.system}/${s.name}/${s.kind}`;
  const said = text => { $('roms-update-status').textContent = text; };
  const gb = n => `${(n / 1e9).toFixed(1)} GB`;

  // The drive's folder as Chrome gave it, kept in this browser so it is picked once.
  const handles = (mode, act) => new Promise((resolve, reject) => {
    const open = indexedDB.open('roms', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('handles', mode);
      const req = act(tx.objectStore('handles'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    };
  });

  // The folder, asked for only on a click, since Chrome asks only then.
  async function folder(click) {
    let top = await handles('readonly', store => store.get('drive')).catch(() => null);
    if (top) {
      const state = await top.queryPermission({ mode: 'readwrite' });
      if (state === 'granted') return top;
      if (!click) return null;
      if (await top.requestPermission({ mode: 'readwrite' }) === 'granted') return top;
    }
    if (!click) return null;
    said('Choose the emulation folder on the drive.');
    top = await window.showDirectoryPicker({ id: 'roms-drive', mode: 'readwrite' });
    try { await top.getDirectoryHandle('roms'); }
    catch { said('That folder holds no roms folder. Choose the drive\'s emulation folder.'); return null; }
    await handles('readwrite', store => store.put(top, 'drive'));
    return top;
  }

  const write = async (top, rel, data) => {
    const parts = rel.split('/');
    let dir = top;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
    const w = await (await dir.getFileHandle(parts.at(-1), { create: true })).createWritable();
    await w.write(data);
    await w.close();
  };

  const sha1Of = async bytes => { const h = await window.hashwasm.createSHA1(); h.init(); h.update(bytes); return h.digest('hex'); };
  // Supabase takes a narrower set of characters in a file's path than a file name may hold.
  const safe = p => p.split('/').map(part => part.replace(/[^\w !\-.*'()&$@=;:+,?]/g, '_')).join('/');

  // A game from the scan as its row: the scan's own names, in the table's.
  const rowOf = (g, scanned) => ({
    system: g.system, title: g.title, region: g.region, languages: g.languages, revision: g.revision,
    formats: g.formats, size: g.size, has_save: Boolean(g.hasSave), folder: Boolean(g.folder),
    title_id: g.titleId ?? null, version: g.version ?? null, product_code: g.productCode ?? null,
    // A folder's thousand small files are counted, not each kept.
    files: g.folder ? g.files.map(({ name, size }) => ({ name, size })) : g.files,
    extras: g.extras ?? [], match: g.match ?? null, originals: g.originals ?? [], scanned_at: scanned,
  });
  // A save as its row, without its note, so writing it leaves rux's note.
  const saveRowOf = (s, scanned) => ({
    system: s.system, name: s.name, kind: s.kind, location: DRIVE, game: s.game, files: s.files, size: s.size,
    created_at: s.created, saved_at: s.saved, scanned_at: scanned,
  });

  let pending = null;
  let running = false;

  async function run(click) {
    if (running) return;
    if (!window.showDirectoryPicker) { said('Update needs Chrome, which can read a folder you choose.'); return; }
    running = true;
    $('roms-update').disabled = true;
    $('roms-check').hidden = true;
    pending = null;
    try {
      const top = await folder(click);
      if (!top) {
        if (!click) said('Update reads the drive. Plug it in and click Update.');
        return;
      }
      said('Reading the drive…');
      let last = 0;
      const drive = R.drive.driveOf(top, {
        progress(read, all) {
          if (Date.now() - last < 500) return;
          last = Date.now();
          said(`Fingerprinting new files: ${gb(read)} of ${gb(all)}…`);
        },
      });
      const [emulators, cacheText] = await Promise.all([R.emulators(), drive.text('scans/fingerprints.json', 'utf8')]);
      const cache = cacheText ? JSON.parse(cacheText) : {};
      const { scan, packed } = await R.scanner.scan(drive, { cache, emulators: emulators.systems, saveRules: R.saveRules });

      said('Packing the backup…');
      const date = scan.scanned.slice(0, 10);
      const files = [];
      for (const f of packed) {
        const st = await drive.stat(f);
        files.push({ name: f, bytes: await drive.read(f, 0, st.size), modified: st.mtimeMs });
      }
      const zipBlob = files.length ? await R.zip.zip(files, R.scanner.crc32) : null;
      let zip = null;
      if (zipBlob) {
        const name = `roms-backup_${date}.zip`;
        zip = new File([zipBlob], name, { type: 'application/zip' });
        scan.backup = { file: name, size: zip.size, sha1: await sha1Of(new Uint8Array(await zip.arrayBuffer())), files: files.length };
      }

      said('Writing the scan to the drive…');
      await write(top, 'scans/fingerprints.json', JSON.stringify(cache));
      await write(top, `scans/scan_${date}.json`, JSON.stringify(scan, null, 1));
      if (zip) {
        await write(top, `backups/${zip.name}`, zip);
        const backups = await top.getDirectoryHandle('backups');
        const old = (await drive.list('backups')).map(x => x.name).filter(n => /^roms-backup_.*\.zip$/.test(n)).sort().slice(0, -5);
        for (const n of old) await backups.removeEntry(n);
      }

      // Each Mac's report newer than the one saved.
      const games = scan.games;
      const [saved, savedSaves, savedMacs, savedDrive] = await Promise.all([R.data.gameKeys(), R.data.saveKeys(), R.data.macs(), R.data.drive()]);
      const macs = [];
      for (const it of await drive.list('macs')) {
        if (!it.dir) continue;
        const text = await drive.text(`macs/${it.name}/report.json`, 'utf8');
        if (!text) continue;
        const m = JSON.parse(text);
        const before = savedMacs.find(x => x.name === m.mac);
        if (before && new Date(before.gathered_at) >= new Date(m.made)) continue;
        macs.push({ dir: `macs/${it.name}`, m });
      }

      const before = new Map(saved.map(g => [key(g), g]));
      const now = new Set(games.map(key));
      const added = games.filter(g => !before.has(key(g)));
      const changed = games.filter(g => before.has(key(g)) && Number(before.get(key(g)).size) !== g.size);
      const gone = saved.filter(g => !now.has(key(g)));
      const savesNow = new Set(scan.saves.map(saveKey));
      const savesGone = savedSaves.filter(s => s.location === DRIVE && !savesNow.has(saveKey(s)));
      const savesNew = scan.saves.filter(s => !savedSaves.some(x => x.location === DRIVE && saveKey(x) === saveKey(s)));
      // Nothing to save: the same games, saves and backup, and no Mac's new report.
      if (!added.length && !changed.length && !gone.length && !savesGone.length && !savesNew.length && !macs.length
        && (scan.backup?.sha1 ?? null) === (savedDrive?.backup?.sha1 ?? null)) {
        said(`Nothing new since the last save. Scanned ${R.when(scan.scanned)}.`);
        return;
      }
      pending = {
        scan: {
          games: games.map(g => rowOf(g, scan.scanned)),
          gone,
          saves: scan.saves.map(s => saveRowOf(s, scan.scanned)),
          savesGone,
          bios: scan.bios.map(b => ({
            name: b.name, size: b.size ?? null, crc32: b.crc32 ?? null, md5: b.md5 ?? null, sha1: b.sha1 ?? null,
            secret: Boolean(b.secret), scanned_at: scan.scanned,
          })),
          drive: {
            to_delete: scan.toDelete, unsorted_saves: scan.unsortedSaves, backups: scan.backups,
            backup: scan.backup, installers: scan.installers, scanned_at: scan.scanned,
          },
          renames: scan.renames,
        },
        zip,
        macs,
        drive,
      };
      const counts = [
        `${games.length} games`,
        added.length ? `${added.length} new` : '',
        changed.length ? `${changed.length} changed` : '',
        gone.length ? `${gone.length} gone` : '',
      ].filter(Boolean).join(', ');
      $('roms-check-text').textContent = [
        `${counts}. ${scan.saves.length} saves.`,
        macs.length ? `New from ${macs.map(x => x.m.mac).join(' and ')}.` : '',
        zip ? `Saving also uploads the backup, ${(zip.size / 1e6).toFixed(1)} MB.` : '',
      ].filter(Boolean).join(' ');
      said(`Scanned ${R.when(scan.scanned)}.`);
      $('roms-check').hidden = false;
    } catch (error) {
      if (error?.name === 'AbortError') { said(''); return; }
      console.error(error);
      said(error?.message ? `The scan stopped: ${error.message}` : 'The scan stopped. Try again.');
    } finally {
      running = false;
      $('roms-update').disabled = false;
    }
  }

  async function save() {
    if (!pending) return;
    $('roms-save').disabled = true;
    try {
      said('Saving…');
      await R.data.saveScan(pending.scan);
      if (pending.zip) await R.data.uploadBackup(pending.zip);
      // Each Mac's report, and any save it keeps itself, matched to its game.
      const [games, emulators] = await Promise.all([R.data.games(), R.emulators()]);
      for (const { dir, m } of pending.macs) {
        const uploads = [];
        const files = [];
        for (const f of m.files) {
          const stored = safe(f.stored);
          const bytes = await pending.drive.read(`${dir}/${f.stored}`, 0, f.size);
          uploads.push({ stored, blob: new Blob([bytes]) });
          files.push({ rel: f.rel, systems: f.systems, file: { name: f.rel, stored, from: f.from, size: f.size, created: f.created, saved: f.saved } });
        }
        await R.data.saveMacSaves(m, uploads, R.saveRules.group(files, games, emulators.systems));
      }
      said(`Saved ${R.when(new Date().toISOString())}.`);
      $('roms-check').hidden = true;
      pending = null;
      document.dispatchEvent(new CustomEvent('roms:saved'));
    } catch (error) {
      console.error(error);
      said(error?.message ? `That did not save: ${error.message}` : 'That did not save. Try again.');
    } finally {
      $('roms-save').disabled = false;
    }
  }

  $('roms-update').addEventListener('click', () => run(true));
  $('roms-save').addEventListener('click', save);
  $('roms-cancel').addEventListener('click', () => { pending = null; $('roms-check').hidden = true; said(''); });
  run(false);
})();
