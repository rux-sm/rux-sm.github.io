/* ==========================================================================
   friends.js — the player's friend link, and their friends
   --------------------------------------------------------------------------
   YOUR FRIEND LINK is the address of the front page with `?join=` and the
   player's own code. Whoever opens it is shown the player's username and
   picture and asked whether to add them, and Add makes the two friends both
   ways. Share hands it to the phone's own share sheet, where the browser has
   one, and Copy puts it on the clipboard. New link makes a new code, which
   closes the old link.

   FRIENDS is every friend the player has and nobody else: their picture,
   their username and Remove, which asks once and then ends it both ways.
   Nobody is added from a list or by a typed name.

   A guest with no player yet gets the door first; data.js's `enter` draws
   it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, portrait, words } = window.Pixels;
  const host = document.getElementById('pixels-friends');
  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };
  const button = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rux--btn rux--btn--sm rux--layout--size-sm ${cls}`;
    b.textContent = text;
    return b;
  };
  // The link is the published site's, since a preview's address opens for nobody else.
  const site = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? 'https://rux-sm.github.io' : location.origin;

  const link = me => {
    const el = document.createElement('section');
    el.className = 'pixels-link';
    const h2 = words('rux--type-productive-heading-02', 'Your friend link');
    const address = document.createElement('p');
    address.className = 'pixels-meta';
    const show = code => { address.textContent = `${site}/pixels/?join=${encodeURIComponent(code)}`; };
    show(me.code);
    const note = words('pixels-meta', 'Whoever opens it is asked to add you.');
    const keys = document.createElement('div');
    keys.className = 'pixels-link-keys';
    const copy = button('rux--btn--tertiary', 'Copy');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(address.textContent);
        copy.textContent = 'Copied';
      } catch {
        // Where the clipboard is refused, the address is selected to copy by hand.
        getSelection().selectAllChildren(address);
      }
      setTimeout(() => { copy.textContent = 'Copy'; }, 2000);
    });
    const renew = button('rux--btn--ghost', 'New link');
    // A second press within a few seconds does it; the first only asks.
    renew.addEventListener('click', async () => {
      if (renew.dataset.sure == null) {
        renew.dataset.sure = '';
        renew.textContent = 'Close the old link?';
        setTimeout(() => { delete renew.dataset.sure; renew.textContent = 'New link'; }, 4000);
        return;
      }
      delete renew.dataset.sure;
      renew.textContent = 'New link';
      try {
        show((await data.renewInvite()).code);
        document.getElementById('pixels-error').hidden = true;
      } catch {
        say('The link did not change', 'Try again.');
      }
    });
    // The phone's own share sheet, where the browser has one.
    if (navigator.share) {
      const share = button('rux--btn--primary', 'Share');
      share.addEventListener('click', () => {
        navigator.share({ title: 'Pixels', url: address.textContent }).catch(() => { /* closed without sharing */ });
      });
      keys.append(share);
    }
    keys.append(copy, renew);
    el.append(h2, address, note, keys);
    return el;
  };

  const list = people => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    el.append(words('rux--type-productive-heading-02', 'Friends'));
    const none = words('pixels-meta', 'No friends yet. Send your link to someone to play with.');
    const ul = document.createElement('ul');
    ul.className = 'pixels-people';
    ul.append(...people.map(p => {
      const li = document.createElement('li');
      li.className = 'pixels-person';
      const key = button('rux--btn--ghost', 'Remove');
      key.setAttribute('aria-label', `Remove ${p.name}`);
      // A second press within a few seconds does it; the first only asks.
      key.addEventListener('click', async () => {
        if (key.dataset.sure == null) {
          key.dataset.sure = '';
          key.textContent = 'Remove?';
          setTimeout(() => { delete key.dataset.sure; key.textContent = 'Remove'; }, 4000);
          return;
        }
        key.disabled = true;
        try {
          await data.unfriend(p.id);
          document.getElementById('pixels-error').hidden = true;
          li.remove();
          none.hidden = ul.childElementCount > 0;
        } catch {
          key.disabled = false;
          say(`${p.name} was not removed`, 'Try again.');
        }
      });
      li.append(portrait(p), words('pixels-person-name', p.name), key);
      return li;
    }));
    none.hidden = people.length > 0;
    el.append(none, ul);
    return el;
  };

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let me, people;
    try {
      me = await enter(host);
      if (!me) return;
      people = await data.people();
    } catch {
      say('Your friends did not load', 'Reload the page to try again.');
      return;
    }
    host.append(link(me), list(people || []));
  })();
})();
