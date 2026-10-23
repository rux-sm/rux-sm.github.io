/* ==========================================================================
   document-status.js — WHETHER A DOCUMENT IS IN FORCE
   --------------------------------------------------------------------------
   One rule for the Documents page and a customer's Documents tab: a
   document's parts, each with the day it ends, say whether it is up to date,
   ending soon or expired. A certificate's parts are its policies, such as
   Workers' comp; a document whose kind has no parts is one part with no name,
   ending on its Ends day. The database keeps `ends_on` as the earliest part's
   day, so everything that reads one date reads that.

   SchedulerDocumentStatus.of(doc, today) answers { state, text, rank }:
   state is 'ok', 'soon', 'ended', or 'none' for a document with no end date;
   text is what the row says; rank sorts by how soon it ends.
   ========================================================================== */
(() => {
  'use strict';

  // A part this close to its end is ending soon, as a driver's licence is.
  const WARN_DAYS = 30;
  const DAY = 864e5;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const shortDay = s => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Names said together, the first as written and the rest in lower case:
  // "Auto and workers' comp".
  function together(names) {
    const said = names.map((n, i) => (i ? n.charAt(0).toLowerCase() + n.slice(1) : n));
    return said.length < 2 ? said.join('') : `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
  }

  // The parts with an end day; a document with none is one unnamed part.
  function partsOf(doc) {
    const named = (Array.isArray(doc.parts) ? doc.parts : []).filter(p => p && p.ends_on);
    if (named.length) return named.map(p => ({ name: p.name || '', ends_on: String(p.ends_on).slice(0, 10) }));
    return doc.ends_on ? [{ name: '', ends_on: String(doc.ends_on).slice(0, 10) }] : [];
  }

  function of(doc, today = iso(new Date())) {
    const parts = partsOf(doc);
    if (!parts.length) return { state: 'none', text: '', rank: Infinity };
    const now = parseISO(today);
    const left = p => Math.round((parseISO(p.ends_on) - now) / DAY);
    const rank = Math.min(...parts.map(left));

    const ended = parts.filter(p => left(p) < 0);
    if (ended.length) {
      const names = ended.map(p => p.name).filter(Boolean);
      return { state: 'ended', text: names.length ? `${together(names)} expired` : 'Expired', rank };
    }

    const soon = parts.filter(p => left(p) <= WARN_DAYS);
    if (soon.length) {
      // One phrase for each day, soonest first: "Auto ends Nov 2, umbrella ends Nov 9".
      const days = [...new Set(soon.map(p => p.ends_on))].sort();
      const text = days.map((day, i) => {
        const names = soon.filter(p => p.ends_on === day).map(p => p.name).filter(Boolean);
        const when = day === today ? 'today' : shortDay(day);
        const phrase = names.length ? `${together(names)} end${names.length > 1 ? '' : 's'} ${when}` : `Ends ${when}`;
        return i ? phrase.charAt(0).toLowerCase() + phrase.slice(1) : phrase;
      }).join(', ');
      return { state: 'soon', text, rank };
    }

    return { state: 'ok', text: 'Up to date', rank };
  }

  window.SchedulerDocumentStatus = { of, WARN_DAYS };
})();
