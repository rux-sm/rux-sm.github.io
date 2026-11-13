/* ==========================================================================
   update.js — Update, on the Status page
   --------------------------------------------------------------------------
   Scans the drive with scan.js, read and written through Rux Emu Helper,
   drive.js, so it runs on a Mac with the helper running and the drive
   plugged in, and reads how this Mac stands and each save it keeps itself
   from the helper too. It says what changed since the last save, or that
   nothing is, and saves on a yes, through scan-save.js: every game and save,
   the drive's row, keeping the newest versions out that the home server's
   nightly scan asks, each BIOS, key, firmware and installer the drive holds
   that Supabase lacks, the backup zip to Supabase, and this Mac's report
   with any save it keeps itself, each uploaded file by file.

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
      const [saved, savedSaves, savedMacs, savedDrive, report, macFiles, held] = await Promise.all([
        R.data.gameKeys(), R.data.saves(), R.data.macs(), R.data.drive(), R.helper.mac(), R.helper.macSaves(), R.data.files()]);
      // What every Mac is given, and the drive is the way in for.
      const given = await R.scanSave.givenChanged(scan, path => drive.stat(path), held);
      let mac = null;
      if (report) {
        const before = savedMacs.find(x => x.name === report.mac);
        const had = new Set(savedSaves.filter(x => x.location === report.mac).flatMap(x => x.files ?? []).map(fileKey));
        const has = new Set(macFiles.map(fileKey));
        if (!before || standing(before) !== standing(report) || had.size !== has.size || [...has].some(k => !had.has(k))) {
          mac = { ...report, files: macFiles };
        }
      }

      const change = R.scanSave.changes(scan, saved, savedSaves);
      const { added, changed, gone, savesGone, savesNew } = change;
      // Nothing to save: the same games, saves and backup, and this Mac as it was.
      if (!added.length && !changed.length && !gone.length && !savesGone.length && !savesNew.length && !mac && !given.length
        && (scan.backup?.sha1 ?? null) === (savedDrive?.backup?.sha1 ?? null)) {
        said(`Nothing new since the last save. Scanned ${R.when(scan.scanned)}.`);
        return;
      }
      pending = {
        scan: R.scanSave.rowsOf(scan, change, { backup: scan.backup, newest: savedDrive?.newest }),
        zip,
        mac,
        given,
        from: report?.mac ?? null,
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
        given.length ? `${given.length} ${given.length === 1 ? 'file' : 'files'} every Mac is given ${given.length === 1 ? 'goes' : 'go'} to Supabase, ${R.size(given.reduce((a, f) => a + f.size, 0))}.` : '',
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
          uploads.push({ stored: f.stored, blob: new Blob([await R.helper.macSave(f.stored)]) });
          files.push({ rel: f.rel, systems: f.systems, file: { name: f.rel, stored: f.stored, from: f.from, size: f.size, created: f.created, saved: f.saved } });
        }
        await R.data.saveMacSaves(pending.mac, uploads, R.saveRules.group(files, games, emulators.systems));
      }
      // Each file every Mac is given, read from the drive through the helper.
      if (pending.given.length) {
        const emulators = await R.emulators();
        const drive = R.drive.driveOf({});
        await R.scanSave.putGiven(R.data.db(), pending.given, {
          sha1Of: async path => (await drive.fingerprint(path)).sha1,
          bytesOf: async path => (await R.helper.call(`/drive/file?path=${encodeURIComponent(path)}`, {}, true)).blob(),
          mac: pending.from,
          names: [...Object.keys(emulators.macSaves), emulators.frontend.name, 'Rux Emu Helper'],
          told: (f, i) => said(`Putting ${f.path.split('/').pop()} in Supabase, ${i + 1} of ${pending.given.length}…`),
        });
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
