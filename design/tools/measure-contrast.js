//
// TEXT CONTRAST, THEME BY THEME — load into a rendered page from the server.
//
// For every piece of text on the page, in each theme, the ratio of its colour
// to the surface behind it, and every one under WCAG's 4.5 to 1 (3 to 1 for
// text 24px and up, or 18.66px and bold). It switches `data-theme` on the root
// itself, so one run reads all seven themes without touching the stored
// preference, and puts the page's own theme back when it is done.
//
// A MEASUREMENT, NOT A GATE. Nothing fails on its output, because a page has
// text that is faint on purpose and exempt -- disabled controls, which it
// skips -- and a rule that needs a growing list of exceptions to pass is not
// a rule. Read the rows, screenshot each one, and decide.
//
// Options, set before loading it:
//   window.MEASURE_CONTRAST = { themes: ['geist-dark'], scope: '#scheduler-panel' }
// `themes` defaults to all seven; `scope` to the whole body.
//
// HOW IT READS A COLOUR. Every computed colour is painted into a 1px canvas
// and read back, so oklch(), color-mix() and color(srgb …) all come out as
// the same four numbers. A see-through colour is laid over what is behind it,
// walking up the parents to the first solid fill.
//
// TRANSITIONS ARE TURNED OFF FIRST. In a tab that is not in front, a
// transition does not advance, so without this a colour read after switching
// the theme is still the old theme's.
//
// BLIND TO:
//   - a fill painted by ::before or ::after, such as the content switcher's
//     selected option: the walk up the parents misses it and reports a false
//     failure. A screenshot settles it.
//   - hover, focus and pressed states: it reads the page as it stands. Hover a
//     real pointer over the element and run it again.
//   - text over a background image or a gradient.
//   - anything not rendered: a closed menu, a hidden tab, a panel not open.

(function () {
  'use strict';
  const opts = window.MEASURE_CONTRAST || {};
  const THEMES = opts.themes || ['white', 'g10', 'g90', 'g100', 'geist-dark', 'ant-dark', 'spotify-dark', 'apple-light'];
  const scope = opts.scope ? document.querySelector(opts.scope) : document.body;
  if (!scope) throw new Error(`measure-contrast: nothing matches ${opts.scope}`);

  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const parse = css => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
  };
  const surface = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c[3] > 0.02) return c[3] < 1 ? over(c, surface(e.parentElement)) : c;
    }
    return [255, 255, 255, 1];
  };
  const exempt = el => el.closest('[disabled], [aria-disabled="true"], [class*="disabled"], [class*="skeleton"], '
    + '[hidden], .rux--visually-hidden, .rux--assistive-text') || el.closest('label')?.control?.disabled;
  const label = el => (typeof el.className === 'string' && el.className.split(' ').filter(Boolean).slice(0, 2).join('.'))
    || el.tagName.toLowerCase();

  const noMotion = document.createElement('style');
  noMotion.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.append(noMotion);
  const root = document.documentElement;
  const own = root.getAttribute('data-theme');

  const result = {};
  let texts = 0;
  for (const theme of THEMES) {
    root.setAttribute('data-theme', theme);
    void document.body.offsetHeight;
    const rows = {};
    const placeholders = [];
    texts = 0;
    for (const el of scope.querySelectorAll('*')) {
      if (!el.getClientRects().length || exempt(el) || el.closest('[data-theme]:not(html)')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const field = el.matches('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select');
      const text = field ? el.value
        : [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      const bg = surface(el);
      if (field && el.placeholder) {
        placeholders.push(ratio(over(parse(getComputedStyle(el, '::placeholder').color), bg), bg));
      }
      if (!text) continue;
      texts++;
      const r = ratio(over(parse(cs.color), bg), bg);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
      if (r >= (large ? 3 : 4.5)) continue;
      const key = `${label(el)} ${cs.color.replace(/ /g, '')} on rgb(${bg.slice(0, 3).map(Math.round)})`;
      rows[key] ??= { ratio: r, count: 0, example: text.slice(0, 32) };
      rows[key].count++;
    }
    result[theme] = {
      under: Object.entries(rows).map(([what, v]) => ({ what, ...v })).sort((a, b) => a.ratio - b.ratio),
      placeholderLowest: placeholders.length ? Math.min(...placeholders) : null,
    };
  }

  own ? root.setAttribute('data-theme', own) : root.removeAttribute('data-theme');
  noMotion.remove();
  for (const [theme, r] of Object.entries(result)) {
    console.log(`  ${theme}: ${r.under.length} under the line`);
    if (r.under.length) console.table(r.under);
  }
  console.log(`  ${texts} text elements read per theme. A false failure is usually a fill `
    + 'painted by ::before or ::after; see the header.');
  return { texts, themes: result };
})();
