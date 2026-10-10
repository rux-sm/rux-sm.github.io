/* ==========================================================================
   friends.js — the player's invite link, and every other player
   --------------------------------------------------------------------------
   YOUR INVITE LINK is the address of the front page with `?join=` and the
   player's own code. Whoever joins by it is their friend both ways. Copy
   puts it on the clipboard; New link makes a new code, which closes the old
   link to anyone new and goes into this page's address as the old one did.

   EVERY OTHER PLAYER is a row, friends first: their picture, their username
   and a key. Add is one-way and needs no answer: the player added is not
   told, and their published gates are sent to the one who added them.
   Remove takes that back.

   A guest with no player yet gets the door first; data.js's `enter` draws
   it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, invite, portrait, words } = window.Pixels;
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
    const h2 = words('rux--type-productive-heading-02', 'Your invite link');
    const address = document.createElement('p');
    address.className = 'pixels-meta';
    const show = code => { address.textContent = `${site}/pixels/?join=${encodeURIComponent(code)}`; };
    show(me.code);
    const note = words('pixels-meta', 'Whoever joins by it is your friend.');
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
        const { code } = await data.renewInvite();
        show(code);
        invite(code);
        document.getElementById('pixels-error').hidden = true;
      } catch {
        say('The link did not change', 'Try again.');
      }
    });
    keys.append(copy, renew);
    el.append(h2, address, note, keys);
    return el;
  };

  const list = people => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    el.append(words('rux--type-productive-heading-02', 'Players'));
    if (!people.length) {
      el.append(words('pixels-meta', 'Nobody else is here yet. Send your link to bring someone in.'));
      return el;
    }
    const ul = document.createElement('ul');
    ul.className = 'pixels-people';
    ul.append(...people.map(p => {
      const li = document.createElement('li');
      li.className = 'pixels-person';
      const key = button('', ''), named = words('pixels-person-name', '');
      const show = () => {
        named.textContent = p.friend ? `${p.name} · friend` : p.name;
        key.className = `rux--btn rux--btn--sm rux--layout--size-sm ${p.friend ? 'rux--btn--ghost' : 'rux--btn--tertiary'}`;
        key.textContent = p.friend ? 'Remove' : 'Add';
        key.setAttribute('aria-label', `${p.friend ? 'Remove' : 'Add'} ${p.name}`);
      };
      show();
      key.addEventListener('click', async () => {
        key.disabled = true;
        try {
          await data.befriend(p.id, !p.friend);
          p.friend = !p.friend;
          document.getElementById('pixels-error').hidden = true;
        } catch {
          say(`${p.name} was not ${p.friend ? 'removed' : 'added'}`, 'Try again.');
        }
        key.disabled = false;
        show();
      });
      li.append(portrait(p), named, key);
      return li;
    }));
    el.append(ul);
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
      say('The players did not load', 'Reload the page to try again.');
      return;
    }
    host.append(link(me), list(people || []));
  })();
})();
