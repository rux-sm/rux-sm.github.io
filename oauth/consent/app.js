/* ==========================================================================
   oauth/consent/app.js — the site's consent screen
   --------------------------------------------------------------------------
   Supabase's OAuth server sends an app's request here as
   /oauth/consent/?authorization_id=<id>, and hosts no screen of its own. This
   page reads the request, names the app and what it asks for, and answers
   approve or deny. Supabase would send the browser on itself; this passes
   skipBrowserRedirect so the page does it, and a failure stays visible here.
   funnel.js has already required a log-in, so there is always a session.
   ========================================================================== */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const say = text => { $('consent-error-text').textContent = text || ''; $('consent-error').hidden = !text; };
  const stop = text => { $('consent-waiting').hidden = true; say(text); };
  const account = window.Rux?.account;

  // Plain words for the scopes Supabase's OAuth server names. An unknown one
  // is shown as it came, because saying nothing would be worse than saying it
  // plainly.
  const PLAIN = {
    openid: 'Know that it is you',
    profile: 'See your name',
    email: 'See your email address',
    offline_access: 'Stay connected without asking again each time',
  };

  // A local preview has no account layer, except the cloud preview on :8641.
  if (!account?.client) {
    stop('This preview has no log-in. Open http://localhost:8641/, the cloud preview, to allow an app.');
    return;
  }

  const id = new URLSearchParams(location.search).get('authorization_id');
  if (!id) {
    stop('This page opens only when an app asks for access. There is nothing here to allow.');
    return;
  }

  const oauth = account.client.auth.oauth;

  let ask;
  try {
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error) throw error;
    // Allowed once already: Supabase hands back where to go and asks nothing.
    if (data && 'redirect_url' in data) { location.replace(data.redirect_url); return; }
    ask = data;
  } catch (problem) {
    stop(problem?.message || 'That request has run out or was answered already. Ask the app to try again.');
    return;
  }

  $('consent-client').textContent = ask.client?.name || 'An app';

  const scopes = String(ask.scope || '').split(/\s+/).filter(Boolean);
  const list = $('consent-scopes');
  for (const scope of scopes) {
    const item = document.createElement('li');
    item.className = 'rux--list__item';
    item.textContent = PLAIN[scope] || scope;
    list.append(item);
  }
  if (!scopes.length) {
    const item = document.createElement('li');
    item.className = 'rux--list__item';
    item.textContent = 'Know that it is you';
    list.append(item);
  }

  $('consent-who').textContent =
    `You are ${ask.user?.email || 'signed in'}. It goes back to ${ask.redirect_uri || 'the app'}.`;

  $('consent-waiting').hidden = true;
  $('consent-ask').hidden = false;
  $('consent-allow').focus();

  const answer = async decide => {
    $('consent-allow').disabled = true;
    $('consent-deny').disabled = true;
    say('');
    try {
      const { data, error } = await decide(id, { skipBrowserRedirect: true });
      if (error) throw error;
      if (!data?.redirect_url) throw new Error('No address came back to send you to.');
      location.replace(data.redirect_url);
    } catch (problem) {
      say(problem?.message || 'That did not go through. Try again.');
      $('consent-allow').disabled = false;
      $('consent-deny').disabled = false;
    }
  };

  $('consent-allow').addEventListener('click', () => answer(oauth.approveAuthorization));
  $('consent-deny').addEventListener('click', () => answer(oauth.denyAuthorization));
})();
