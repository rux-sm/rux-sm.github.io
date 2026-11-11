/* ==========================================================================
   update.js — Update, on the Status page
   --------------------------------------------------------------------------
   Scans the drive with scan.js, read and written through Rux Emu Helper,
   drive.js, so it runs on a Mac with the helper running and the drive
   plugged in, and reads how this Mac stands and each save it keeps itself
   from the helper too. It says what changed since the last save, or that
   nothing is, and saves on a yes: every game and save, the BIOS list and the
   drive's row, the backup zip to Supabase, and this Mac's report with any
   save it keeps itself, each uploaded file by file.

   It writes back to the drive what the Mac scan writes: the fingerprints,
   so the next scan hashes only what changed, the scan file the organize
   tool reads, and the backup zip, the newest five kept.

   It runs when Status opens if the helper has the drive, and again on a
   click; nothing is saved until Save.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  if (!R?.data) return;

  const DRIVE = 'drive';
  const key = g => `${g.system}/${g.title}`;
  const saveKey = s => `${s.system}/${s.name}/${s.kind}`;
  const said = text => { $('emu-update-status').textContent = text; };
  const gb = n => `${(n / 1e9).toFixed(1)} GB`;

  // A value with its keys in order, so a saved JSON column compares with a fresh one.
  const canon = v => Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
  // How a Mac stands, its emulators by name, since the helper lists them in no set order.
  const standing = m => JSON.stringify(canon({ macos: m.macos ?? null, chip: m.chip ?? null, frontend: m.frontend ?? null,
    emulators: [...(m.emulators ?? [])].sort((a, b) => a.emulator.localeCompare(b.emulator)) }));
  const fileKey = f => `${f.from}/${f.rel ?? f.name}|${Number(f.size)}|${f.saved}`;

  const sha1Of = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
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
    running = true;
    $('emu-update').disabled = true;
    $('emu-check').hidden = true;
    pending = null;
    try {
      const helper = R.helper.onMac ? await R.helper.status() : null;
      if (!helper?.collection) {
        said(!R.helper.onMac ? 'Update runs on a Mac, through Rux Emu Helper.'
          : !helper ? (click ? 'Rux Emu Helper is not running on this Mac. Start it below, then Update.' : '')
          : 'Update reads the drive. Plug it in and click Update.');
        return;
      }
      said('Reading the drive…');
      let last = 0;
      const drive = R.drive.driveOf({
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
        const name = `emu-backup_${date}.zip`;
        zip = new File([zipBlob], name, { type: 'application/zip' });
        scan.backup = { file: name, size: zip.size, sha1: await sha1Of(new Uint8Array(await zip.arrayBuffer())), files: files.length };
      }

      said('Writing the scan to the drive…');
      await drive.write('scans/fingerprints.json', JSON.stringify(cache));
      await drive.write(`scans/scan_${date}.json`, JSON.stringify(scan, null, 1));
      if (zip) {
        await drive.write(`backups/${zip.name}`, zip);
        const old = (await drive.list('backups')).map(x => x.name).filter(n => /^emu-backup_.*\.zip$/.test(n)).sort().slice(0, -5);
        for (const n of old) await drive.remove(`backups/${n}`);
      }

      // This Mac, when how it stands or a save it keeps itself differs from the last saved.
      said('Reading this Mac…');
      const games = scan.games;
      const [saved, savedSaves, savedMacs, savedDrive, report, macFiles] = await Promise.all([
        R.data.gameKeys(), R.data.saves(), R.data.macs(), R.data.drive(), R.helper.mac(), R.helper.macSaves()]);
      let mac = null;
      if (report) {
        const before = savedMacs.find(x => x.name === report.mac);
        const had = new Set(savedSaves.filter(x => x.location === report.mac).flatMap(x => x.files ?? []).map(fileKey));
        const has = new Set(macFiles.map(fileKey));
        if (!before || standing(before) !== standing(report) || had.size !== has.size || [...has].some(k => !had.has(k))) {
          mac = { ...report, files: macFiles };
        }
      }

      const before = new Map(saved.map(g => [key(g), g]));
      const now = new Set(games.map(key));
      const added = games.filter(g => !before.has(key(g)));
      const changed = games.filter(g => before.has(key(g)) && Number(before.get(key(g)).size) !== g.size);
      const gone = saved.filter(g => !now.has(key(g)));
      const savesNow = new Set(scan.saves.map(saveKey));
      const savesGone = savedSaves.filter(s => s.location === DRIVE && !savesNow.has(saveKey(s)));
      const savesNew = scan.saves.filter(s => !savedSaves.some(x => x.location === DRIVE && saveKey(x) === saveKey(s)));
      // Nothing to save: the same games, saves and backup, and this Mac as it was.
      if (!added.length && !changed.length && !gone.length && !savesGone.length && !savesNew.length && !mac
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
        mac,
      };
      const counts = [
        `${games.length} games`,
        added.length ? `${added.length} new` : '',
        changed.length ? `${changed.length} changed` : '',
        gone.length ? `${gone.length} gone` : '',
      ].filter(Boolean).join(', ');
      $('emu-check-text').textContent = [
        `${counts}. ${scan.saves.length} saves.`,
        mac ? `${mac.mac} has changed${mac.files.length ? `, with ${mac.files.length} saves it keeps itself` : ''}.` : '',
        zip ? `Saving also uploads the backup, ${(zip.size / 1e6).toFixed(1)} MB.` : '',
      ].filter(Boolean).join(' ');
      said(`Scanned ${R.when(scan.scanned)}.`);
      $('emu-check').hidden = false;
    } catch (error) {
      console.error(error);
      said(error?.message ? `The scan stopped: ${error.message}` : 'The scan stopped. Try again.');
    } finally {
      running = false;
      $('emu-update').disabled = false;
    }
  }

  async function save() {
    if (!pending) return;
    $('emu-save').disabled = true;
    try {
      said('Saving…');
      await R.data.saveScan(pending.scan);
      if (pending.zip) await R.data.uploadBackup(pending.zip);
      // This Mac's report, and any save it keeps itself, matched to its game.
      if (pending.mac) {
        const [games, emulators] = await Promise.all([R.data.games(), R.emulators()]);
        const uploads = [];
        const files = [];
        for (const f of pending.mac.files) {
          const stored = safe(f.stored);
          uploads.push({ stored, blob: new Blob([await R.helper.macSave(f.stored)]) });
          files.push({ rel: f.rel, systems: f.systems, file: { name: f.rel, stored, from: f.from, size: f.size, created: f.created, saved: f.saved } });
        }
        await R.data.saveMacSaves(pending.mac, uploads, R.saveRules.group(files, games, emulators.systems));
      }
      said(`Saved ${R.when(new Date().toISOString())}.`);
      $('emu-check').hidden = true;
      pending = null;
      document.dispatchEvent(new CustomEvent('emu:saved'));
    } catch (error) {
      console.error(error);
      said(error?.message ? `That did not save: ${error.message}` : 'That did not save. Try again.');
    } finally {
      $('emu-save').disabled = false;
    }
  }

  $('emu-update').addEventListener('click', () => run(true));
  $('emu-save').addEventListener('click', save);
  $('emu-cancel').addEventListener('click', () => { pending = null; $('emu-check').hidden = true; said(''); });
  run(false);
})();
