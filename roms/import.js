/* ==========================================================================
   import.js — the Import page
   --------------------------------------------------------------------------
   A scan file from roms/tools/scan-roms.mjs, read on this device, compared
   with what is saved: the games new to the drive, those whose files
   changed, and those no longer on it. The backup zip the scan packed can
   come with it. Save writes the scan on a yes, then uploads the zip to
   Supabase, the saves' offsite copy.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  if (!R?.data) { R?.notice('Roms needs a log-in to save a scan.'); return; }

  let pending = null;
  const key = g => `${g.system}/${g.title}`;
  const saveKey = s => `${s.system}/${s.name}/${s.kind}`;
  // The drive's saves are the scan's; a Mac's come from the Saves page.
  const DRIVE = 'drive';

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

  const sha1 = async file => [...new Uint8Array(await crypto.subtle.digest('SHA-1', await file.arrayBuffer()))]
    .map(b => b.toString(16).padStart(2, '0')).join('');

  async function read(files) {
    R.notice('');
    $('roms-status-wrap').hidden = true;
    const scanFile = files.find(f => /\.json$/i.test(f.name));
    const zipFile = files.find(f => /\.zip$/i.test(f.name));
    if (!scanFile) { R.notice('Choose the scan file, and the backup zip beside it if you have it.'); return; }
    let scan;
    try { scan = JSON.parse(await scanFile.text()); }
    catch { R.notice('That file is not a scan.'); return; }
    if (!Array.isArray(scan?.games) || !scan.scanned) { R.notice('That file is not a scan.'); return; }
    // The zip is the one this scan packed, or none is uploaded.
    let zip = null;
    if (zipFile && scan.backup) {
      if (zipFile.name !== scan.backup.file || zipFile.size !== scan.backup.size || await sha1(zipFile) !== scan.backup.sha1) {
        R.notice(`That zip is not the one this scan packed, ${scan.backup.file}.`);
        return;
      }
      zip = zipFile;
    }
    let saved, savedSaves;
    try { [saved, savedSaves] = await Promise.all([R.data.gameKeys(), R.data.saveKeys()]); }
    catch (error) { console.error(error); R.notice('Roms could not read what is saved. Try again.'); return; }

    const before = new Map(saved.map(g => [key(g), g]));
    const now = new Set(scan.games.map(key));
    const added = scan.games.filter(g => !before.has(key(g)));
    const changed = scan.games.filter(g => before.has(key(g)) && Number(before.get(key(g)).size) !== g.size);
    const gone = saved.filter(g => !now.has(key(g)));
    const scanSaves = Array.isArray(scan.saves) && typeof scan.saves[0] !== 'string' ? scan.saves : [];
    const savesNow = new Set(scanSaves.map(saveKey));
    pending = {
      games: scan.games.map(g => rowOf(g, scan.scanned)),
      gone,
      saves: scanSaves.map(s => saveRowOf(s, scan.scanned)),
      savesGone: savedSaves.filter(s => s.location === DRIVE && !savesNow.has(saveKey(s))),
      bios: (scan.bios ?? []).map(b => ({
        name: b.name, size: b.size ?? null, crc32: b.crc32 ?? null, md5: b.md5 ?? null, sha1: b.sha1 ?? null,
        secret: Boolean(b.secret), scanned_at: scan.scanned,
      })),
      drive: {
        to_delete: scan.toDelete ?? null, unsorted_saves: scan.unsortedSaves ?? [],
        backups: scan.backups ?? [], backup: scan.backup ?? null, installers: scan.installers ?? [], scanned_at: scan.scanned,
      },
      renames: scan.renames ?? [],
      zip,
    };
    $('roms-check-title').textContent = `Scan from ${R.when(scan.scanned)}`;
    $('roms-n-games').textContent = scan.games.length;
    $('roms-n-new').textContent = added.length;
    $('roms-n-changed').textContent = changed.length;
    $('roms-n-gone').textContent = gone.length;
    $('roms-check-note').textContent = [
      scan.fingerprints ? '' : 'This scan has no fingerprints, so games cannot be checked against the lists yet.',
      gone.length ? `Saving removes the ${gone.length} ${gone.length === 1 ? 'game' : 'games'} no longer on the drive from the list.` : '',
      `${scanSaves.length} ${scanSaves.length === 1 ? 'save' : 'saves'}.`,
      zip ? `Saving also uploads ${zip.name} to Supabase.`
        : scan.backup ? `Choose ${scan.backup.file} from the drive's backups folder with the scan to copy the saves to Supabase.` : '',
    ].filter(Boolean).join(' ');
    $('roms-check').hidden = false;
  }

  async function save() {
    if (!pending) return;
    $('roms-save').disabled = true;
    try {
      await R.data.saveScan(pending);
      if (pending.zip) await R.data.uploadBackup(pending.zip);
    } catch (error) {
      console.error(error);
      R.notice(error?.message ? `That did not save: ${error.message}` : 'That did not save. Try again.');
      $('roms-save').disabled = false;
      return;
    }
    $('roms-status').textContent = `${pending.games.length} games and ${pending.saves.length} saves saved${pending.zip ? ', and the backup uploaded' : ''}.`;
    $('roms-status-wrap').hidden = false;
    $('roms-check').hidden = true;
    $('roms-save').disabled = false;
    pending = null;
  }

  const input = $('roms-file');
  $('roms-drop').addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files.length) read([...input.files]); input.value = ''; });
  const drop = $('roms-drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('rux--file__drop-container--drag-over');
    if (e.dataTransfer.files.length) read([...e.dataTransfer.files]);
  });
  $('roms-save').addEventListener('click', save);
  $('roms-cancel').addEventListener('click', () => { pending = null; $('roms-check').hidden = true; });
})();
