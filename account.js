/* ==========================================================================
   Rux Apps — ACCOUNT                                  roadmap.md §4.13 step 5
   --------------------------------------------------------------------------
   Loads after rux-ds's vendor/rux-ds/js/profile.js, which must run first and
   which this depends on for window.Rux.profile. Opens an anonymous Supabase
   session on first visit, reads and writes the cloud half of the profile
   js/profile.js already keeps in this browser, and wires the sign-in button
   js/profile.js reveals to GitHub identity linking.

   THE SAME CONTRACT AS switcher.js: a fetch that fails — no network, the
   backend paused, Turnstile unavailable — leaves the local profile standing
   and does nothing else. Nothing here blocks first paint or the local
   profile from working; this only adds a cloud layer on top when it can.

   CLOUD WINS ON LOAD, FIELD BY FIELD: a name or theme already in
   platform.profiles overwrites what this browser has stored, once, right
   after the session opens. A field the row does not have yet (a brand-new
   anonymous session) leaves the local value alone rather than blanking it.
   After that, local edits push up through window.Rux.profile.onChange,
   debounced, so typing does not spam the API.

   THE PUBLISHABLE KEY AND THE TURNSTILE SITE KEY ARE NOT SECRETS — both are
   meant to sit in client code the browser can read; the paired secret keys
   stay in rux-backend's Supabase project settings, never here.

   NOT DONE: an interrupted anonymous sign-in (Turnstile times out, the
   network drops) is not retried until the next page load. A Turnstile
   challenge, on the rare visit that needs an interactive one, renders
   inside the account panel below the sign-in button — untested against a
   real challenge, since Managed/interaction-only mode did not trigger one
   in verification.
   ========================================================================== */
(async () => {
  'use strict';
  const profile = window.Rux?.profile;
  if (!profile || !window.supabase) return;

  const SUPABASE_URL = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';
  const TURNSTILE_SITE_KEY = '0x4AAAAAAEmfPE09UcbC-aRI';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const profiles = () => sb.schema('platform').from('profiles');

  // A GitHub redirect can come back with an error instead of a session:
  // linkIdentity redirects to GitHub before it knows whether linking will
  // succeed, so a conflict — this identity already belongs to a different,
  // permanent account, not this visit's anonymous one — only surfaces here,
  // in the URL, never through the linkIdentity() promise itself. Recover by
  // signing in directly, which authenticates that existing account instead.
  const authError = new URLSearchParams(location.hash.slice(1));
  if (authError.has('error')) {
    history.replaceState(null, '', location.pathname + location.search);
    if (authError.get('error_code') === 'identity_already_exists') {
      try { await sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } }); return; }
      catch { /* falls through to the anonymous flow below */ }
    }
  }

  // Turnstile loads async and may not be ready yet; poll briefly rather than
  // block first paint on it. No Turnstile after ~10s: skip anonymous sign-in
  // for this visit, same as any other unreachable dependency.
  const getCaptchaToken = () => new Promise(resolve => {
    let tries = 0;
    const attempt = () => {
      if (window.turnstile) return render();
      if (++tries > 40) return resolve(null);
      setTimeout(attempt, 250);
    };
    const render = () => {
      const panel = document.getElementById('rux-account-panel');
      const host = document.createElement('div');
      host.id = 'rux-turnstile';
      (panel ?? document.body).appendChild(host);
      try {
        window.turnstile.render(host, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          callback: token => resolve(token),
          'error-callback': () => resolve(null),
        });
      } catch { resolve(null); }
    };
    attempt();
  });

  const ensureSession = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (session) return session;
    const captchaToken = await getCaptchaToken();
    if (!captchaToken) return null;
    const { data, error } = await sb.auth.signInAnonymously({ options: { captchaToken } });
    return error ? null : data.session;
  };

  let session;
  try { session = await ensureSession(); } catch { return; }
  if (!session) return;

  const uid = session.user.id;

  try {
    const { data: row } = await profiles().select('display_name, theme').eq('id', uid).maybeSingle();
    const patch = {};
    if (row?.display_name != null) patch.name = row.display_name;
    if (row?.theme != null) patch.theme = row.theme;
    if (Object.keys(patch).length) profile.set(patch);
    if (!row) {
      const local = profile.get();
      await profiles().upsert({ id: uid, display_name: local.name ?? null, theme: local.theme ?? null });
    }
  } catch { /* platform unreachable: local profile stands */ }

  let timer;
  profile.onChange(p => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      profiles().update({ display_name: p.name ?? null, theme: p.theme ?? null }).eq('id', uid)
        .then(() => {}, () => {});
    }, 500);
  });

  profile.onSignIn(async () => {
    try { await sb.auth.linkIdentity({ provider: 'github', options: { redirectTo: window.location.origin } }); }
    catch { /* linking failed or was refused: local profile stands */ }
  });
})();
