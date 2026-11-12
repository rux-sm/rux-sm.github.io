/* ==========================================================================
   this-mac.js — a game on this Mac
   --------------------------------------------------------------------------
   What Rux Emu Helper, helper.js, says of this Mac, and a game's part of its
   side panel that acts on it. `read` is the helper's status, the library's
   files and the downloads, each null where no helper answers or it is too
   old to say. `area` is the part, shown only on a Mac: Play where this Mac
   holds the game or a drive with it is plugged in, Download to this Mac
   with its progress and Cancel while it comes, and Remove from this Mac,
   which takes the game's files and leaves its saves. Where the helper is
   not running it offers to start it. A game played is marked with when,
   for Recently played. `onChanged` is told when what this Mac holds, or
   whether the helper runs, has changed.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const H = R.helper;
  const { el } = R;

  const NOTHING = { helper: null, library: null, downloads: null };
  async function read() {
    if (!H.onMac) return NOTHING;
    const helper = await H.status();
    if (!helper) return NOTHING;
    const [library, downloads] = await Promise.all([H.library().catch(() => null), H.downloads().catch(() => null)]);
    return { helper, library, downloads };
  }

  const button = (text, cls, onClick) => {
    const b = el('button', `rux--btn ${cls}`, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const row = (...buttons) => { const d = el('div', 'emu-actions'); d.append(...buttons); return d; };

  // Carbon's progress bar, saying how much of the game is here.
  function progress() {
    const node = el('div', 'rux--progress-bar rux--progress-bar--big');
    const label = el('div', 'rux--progress-bar__label');
    const text = el('span', 'rux--progress-bar__label-text');
    label.append(text);
    const track = el('div', 'rux--progress-bar__track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    const fill = el('div', 'rux--progress-bar__bar');
    track.append(fill);
    const helper = el('div', 'rux--progress-bar__helper-text');
    node.append(label, track, helper);
    const set = s => {
      const part = s.total ? Math.min(1, s.done / s.total) : 0;
      text.textContent = s.checking ? 'Checking the download' : 'Downloading to this Mac';
      track.setAttribute('aria-label', text.textContent);
      track.setAttribute('aria-valuenow', String(Math.round(part * 100)));
      fill.style.transform = `scaleX(${part})`;
      helper.textContent = `${R.size(s.done)} of ${R.size(s.total)}`;
    };
    return { node, set };
  }

  function area(g, { focus = false, onChanged = () => {} } = {}) {
    const box = el('div', 'emu-mac rux--stack-vertical rux--stack-scale-3');
    if (!H.onMac) return box;
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    // The bar while the game arrives, kept between looks so it moves, not blinks.
    let bar = null;
    let timer = null;
    let wantsFocus = focus;
    const closed = () => !box.isConnected || Boolean(box.closest('[hidden]'));

    // The part drawn again. The focus it had, or was asked to take, goes to
    // `safe`, a button that removes nothing, so a press of A or Return never
    // stops a download or removes a game unasked; with none, the panel's
    // close takes the focus the part had.
    const show = (nodes, safe = null) => {
      const held = box.contains(document.activeElement);
      const takes = wantsFocus || held;
      wantsFocus = false;
      box.replaceChildren(...nodes);
      if (takes && safe) safe.focus({ focusVisible: true });
      else if (held) document.getElementById('emu-panel-close').focus({ focusVisible: true });
    };

    // `words` is said in place of how the game stands, after a step.
    async function draw(words) {
      clearTimeout(timer);
      const { helper, library, downloads } = await read();
      if (closed()) return;

      if (!helper) {
        bar = null;
        said.textContent = words ?? 'Rux Emu Helper is not running on this Mac.';
        const start = button('Start Rux Emu Helper', 'rux--btn--secondary', async () => {
          start.disabled = true;
          said.textContent = 'Starting…';
          if (await H.wake()) { onChanged(); draw(); }
          else draw('It did not start. Install it from the drive: Install Rux Emu Helper.command.');
        });
        return show([row(start), said], start);
      }

      const s = H.standings(library, downloads)(g);
      if (s.state === 'arriving') {
        if (!bar) {
          bar = progress();
          const cancel = button('Cancel', 'rux--btn--tertiary', async () => {
            cancel.disabled = true;
            try { await H.remove(g); onChanged(); draw('Stopped.'); }
            catch (error) { said.textContent = error.message; cancel.disabled = false; }
          });
          said.textContent = '';
          show([bar.node, row(cancel), said]);
        }
        bar.set(s);
        timer = setTimeout(draw, 1000);
        return;
      }
      // It was arriving and is not now: it came whole, or it stopped.
      if (bar) { bar = null; onChanged(); }

      // A helper that names its library downloads to it and plays from it;
      // an older one plays only from a drive.
      const keeps = Boolean(helper.library) && library != null;
      const drive = Boolean(helper.collection) && (!keeps || !helper.collection.network);
      const here = keeps && s.state === 'held';
      const emulator = helper.systems.includes(g.system);
      const name = R.systemName(g.system);

      const buttons = [];
      if ((here || drive) && emulator) {
        const play = button('Play', 'rux--btn--primary', async () => {
          play.disabled = true;
          said.textContent = 'Starting…';
          try {
            await H.play(g);
            said.textContent = 'Playing.';
            try { g.notes = { ...g.notes, system: g.system, title: g.title, played_at: await R.data.markPlayed(g) }; }
            catch (error) { console.error(error); said.textContent = 'Playing, but it could not be marked as played.'; }
          } catch (error) { said.textContent = error.message; }
          play.disabled = false;
        });
        buttons.push(play);
      }
      if (keeps && !here) {
        const get = button(s.done ? 'Resume download' : 'Download to this Mac', buttons.length ? 'rux--btn--tertiary' : 'rux--btn--primary', async () => {
          get.disabled = true;
          said.textContent = 'Asking Rux Emu Helper…';
          try { await H.download(g); draw(); }
          catch (error) { said.textContent = error.message; get.disabled = false; }
        });
        buttons.push(get);
      }
      if (keeps && (here || s.done)) {
        const remove = button('Remove from this Mac', 'rux--btn--danger--tertiary', async () => {
          remove.disabled = true;
          try { await H.remove(g); onChanged(); draw('Removed from this Mac. Its saves are kept.'); }
          catch (error) { said.textContent = error.message; remove.disabled = false; }
        });
        buttons.push(remove);
      }

      const facts = [
        s.state === 'failed' ? s.error : '',
        here ? `On this Mac, ${R.size(s.total)}.` : '',
        keeps && !here && s.state !== 'failed' ? (s.done ? `${R.size(s.done)} of ${R.size(s.total)} is on this Mac.` : `${R.size(s.total)} to download.`) : '',
        !keeps && !drive ? 'Plug in the drive to play.' : '',
        !keeps && !helper.library ? 'Rux Emu Helper on this Mac is too old to download a game: Status has the newest.' : '',
        (here || drive) && !emulator ? `This Mac has no emulator installed for ${name}.` : '',
      ].filter(Boolean);
      said.textContent = words ?? facts.join(' ');
      // Play or Download leads where there is one; Remove is always last.
      const safe = keeps && (here || s.done) ? buttons.slice(0, -1)[0] : buttons[0];
      show(buttons.length ? [row(...buttons), said] : [said], safe);
    }

    draw();
    return box;
  }

  R.thisMac = { read, area };
})();
