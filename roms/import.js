/* ==========================================================================
   import.js — the Import page
   --------------------------------------------------------------------------
   A scan file from roms/tools/scan-roms.mjs, read on this device, compared
   with what is saved: the games new to the drive, those whose files
   changed, and those no longer on it. Save writes the scan on a yes.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  if (!R?.data) { R?.notice('Roms needs a log-in to save a scan.'); return; }

  let pending = null;
  const key = g => `${g.system}/${g.title}`;

  // A game from the scan as its row: the scan's own names, in the table's.
  const rowOf = (g, scanned) => ({
    system: g.system, title: g.title, region: g.region, languages: g.languages, revision: g.revision,
    formats: g.formats, size: g.size, has_save: Boolean(g.hasSave), folder: Boolean(g.folder),
    title_id: g.titleId ?? null, version: g.version ?? null, product_code: g.productCode ?? null,
    // A folder's thousand small files are counted, not each kept.
    files: g.folder ? g.files.map(({ name, size }) => ({ name, size })) : g.files,
    extras: g.extras ?? [], match: g.match ?? null, scanned_at: scanned,
  });

  async function read(file) {
    R.notice('');
    $('roms-status-wrap').hidden = true;
    let scan;
    try { scan = JSON.parse(await file.text()); }
    catch { R.notice('That file is not a scan.'); return; }
    if (!Array.isArray(scan?.games) || !scan.scanned) { R.notice('That file is not a scan.'); return; }
    let saved;
    try { saved = await R.data.gameKeys(); }
    catch (error) { console.error(error); R.notice('Roms could not read what is saved. Try again.'); return; }

    const before = new Map(saved.map(g => [key(g), g]));
    const now = new Set(scan.games.map(key));
    const added = scan.games.filter(g => !before.has(key(g)));
    const changed = scan.games.filter(g => before.has(key(g)) && Number(before.get(key(g)).size) !== g.size);
    const gone = saved.filter(g => !now.has(key(g)));
    pending = {
      games: scan.games.map(g => rowOf(g, scan.scanned)),
      gone,
      bios: (scan.bios ?? []).map(b => ({
        name: b.name, size: b.size ?? null, crc32: b.crc32 ?? null, md5: b.md5 ?? null, sha1: b.sha1 ?? null,
        secret: Boolean(b.secret), scanned_at: scan.scanned,
      })),
    };
    const when = new Date(scan.scanned).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    $('roms-check-title').textContent = `Scan from ${when}`;
    $('roms-n-games').textContent = scan.games.length;
    $('roms-n-new').textContent = added.length;
    $('roms-n-changed').textContent = changed.length;
    $('roms-n-gone').textContent = gone.length;
    $('roms-check-note').textContent = [
      scan.fingerprints ? '' : 'This scan has no fingerprints, so games cannot be checked against the lists yet.',
      gone.length ? `Saving removes the ${gone.length} ${gone.length === 1 ? 'game' : 'games'} no longer on the drive from the list.` : '',
    ].filter(Boolean).join(' ');
    $('roms-check').hidden = false;
  }

  async function save() {
    if (!pending) return;
    $('roms-save').disabled = true;
    try {
      await R.data.saveScan(pending.games, pending.gone, pending.bios);
    } catch (error) {
      console.error(error);
      R.notice(error?.message ? `That did not save: ${error.message}` : 'That did not save. Try again.');
      $('roms-save').disabled = false;
      return;
    }
    $('roms-status').textContent = `${pending.games.length} games saved.`;
    $('roms-status-wrap').hidden = false;
    $('roms-check').hidden = true;
    $('roms-save').disabled = false;
    pending = null;
  }

  const input = $('roms-file');
  $('roms-drop').addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) read(input.files[0]); input.value = ''; });
  const drop = $('roms-drop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('rux--file__drop-container--drag-over');
    if (e.dataTransfer.files[0]) read(e.dataTransfer.files[0]);
  });
  $('roms-save').addEventListener('click', save);
  $('roms-cancel').addEventListener('click', () => { pending = null; $('roms-check').hidden = true; });
})();
