// The load rule. Runs each scheduler page's own scripts, in the order of its
// script tags, against a stand-in page, and fails when one throws as it
// loads. That is what a page missing a script another script reads at load
// looks like, and what a name used before it exists looks like: the page
// opens blank, or with half its buttons dead, and every other rule passes.
//
// The stand-in is an empty page that knows only the page's own HTML: an
// element is found when the HTML carries its id, and `window` holds what the
// page's scripts put there and no more, so a script that reads another's
// export finds it only when that script ran first. A script from another
// site is not run. There is no list of pages and none of excused scripts:
// the pages are the folder's, and the scripts are each page's own tags.
//
// It does not see an error behind a click, anything after a log-in, or what a
// promise does later.
//
//   node scheduler/tools/check-load.mjs [root]
//
// `root` is another copy of the site to read, for trying the rule on an
// earlier tree.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const ROOT = process.argv[2] ? resolve(process.argv[2]) : HERE;
// What a script does after it has loaded is not this rule's to judge.
process.on('unhandledRejection', () => {});

/* Anything on the page a script may touch: every property is another of
   these, every call answers with one, and it reads as an empty list, an
   empty string and zero. */
function anything() {
  const target = function () {};
  const kept = new Map();
  const proxy = new Proxy(target, {
    get(_, key) {
      if (key === Symbol.iterator) return function* () {};
      if (key === Symbol.toPrimitive) return hint => (hint === 'number' ? 0 : '');
      if (key === 'then' || key === Symbol.asyncIterator) return undefined;
      if (key === 'length' || key === 'size') return 0;
      if (key === 'toString' || key === 'toJSON') return () => '';
      if (key === 'dataset') { if (!kept.has(key)) kept.set(key, {}); return kept.get(key); }
      if (['querySelectorAll', 'getElementsByClassName', 'getElementsByTagName', 'children', 'childNodes', 'options', 'files'].includes(key)) {
        return key === 'children' || key === 'childNodes' || key === 'options' || key === 'files' ? [] : () => [];
      }
      if (['querySelector', 'closest', 'firstElementChild', 'lastElementChild', 'nextElementSibling', 'previousElementSibling', 'parentElement'].includes(key)) {
        return key === 'querySelector' || key === 'closest' ? () => null : null;
      }
      if (['contains', 'matches', 'hasAttribute', 'checked', 'disabled', 'hidden', 'open'].includes(key)) {
        return key === 'contains' || key === 'matches' || key === 'hasAttribute' ? () => false : (kept.get(key) ?? false);
      }
      if (key === 'getAttribute') return () => null;
      if (['value', 'textContent', 'innerHTML', 'id', 'className', 'href', 'src', 'title', 'placeholder', 'tagName', 'nodeName'].includes(key)) return kept.get(key) ?? '';
      if (!kept.has(key)) kept.set(key, anything());
      return kept.get(key);
    },
    set(_, key, value) { kept.set(key, value); return true; },
    has: () => true,
    apply: () => anything(),
    construct: () => anything(),
  });
  return proxy;
}

/* One page's world. `window` is a plain object, so a name no script set is
   undefined, which is the point; the browser's own names are stand-ins. */
function world(page, html) {
  const ids = new Set([...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(m => m[1]));
  const has = sel => {
    const first = String(sel).trim().split(/[\s>+~,]/)[0];
    const id = /#([\w-]+)/.exec(first)?.[1];
    if (id) return ids.has(id);
    const cls = /\.([\w-]+)/.exec(first)?.[1];
    if (cls) return new RegExp(`class\\s*=\\s*"[^"]*\\b${cls}\\b`).test(html);
    const attrName = /\[([\w-]+)/.exec(first)?.[1];
    if (attrName) return new RegExp(`\\s${attrName}(\\s|=|>)`).test(html);
    const tag = /^[a-z][\w-]*/i.exec(first)?.[0];
    return tag ? new RegExp(`<${tag}[\\s>]`, 'i').test(html) : false;
  };
  const store = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear(), key: () => null, get length() { return m.size; } }; };
  const listen = { addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true };
  class Watcher { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  class Happening { constructor(type, init) { this.type = type; Object.assign(this, init); } preventDefault() {} stopPropagation() {} }
  const body = anything();
  const root = anything();
  const document = {
    ...listen, body, documentElement: root, head: anything(), readyState: 'complete', visibilityState: 'visible', hidden: false,
    title: '', cookie: '', currentScript: null, activeElement: null, fonts: { ready: new Promise(() => {}) },
    getElementById: id => (ids.has(String(id)) ? anything() : null),
    querySelector: sel => (has(sel) ? anything() : null),
    querySelectorAll: () => [], getElementsByClassName: () => [], getElementsByTagName: () => [], getElementsByName: () => [],
    createElement: () => anything(), createElementNS: () => anything(), createTextNode: () => anything(),
    createDocumentFragment: () => anything(), createRange: () => anything(), createTreeWalker: () => anything(),
    hasFocus: () => false, getSelection: () => anything(), elementFromPoint: () => null, execCommand: () => false,
  };
  const url = new URL(`http://localhost/${page}`);
  const window = {
    ...listen, document,
    location: { href: url.href, origin: url.origin, protocol: url.protocol, host: url.host, hostname: url.hostname, pathname: url.pathname, search: '', hash: '', assign() {}, replace() {}, reload() {} },
    history: { state: null, length: 1, pushState() {}, replaceState() {}, back() {}, go() {} },
    navigator: { userAgent: '', language: 'en-US', languages: ['en-US'], onLine: true, maxTouchPoints: 0, platform: '', clipboard: anything(), serviceWorker: undefined, standalone: false },
    localStorage: store(), sessionStorage: store(),
    matchMedia: () => ({ matches: false, media: '', ...listen, addListener() {}, removeListener() {} }),
    getComputedStyle: () => anything(), getSelection: () => anything(),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, requestIdleCallback: () => 0,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, queueMicrotask() {},
    fetch: () => new Promise(() => {}), alert() {}, confirm: () => false, open: () => null, print() {}, scrollTo() {}, focus() {},
    MutationObserver: Watcher, ResizeObserver: Watcher, IntersectionObserver: Watcher,
    Event: Happening, CustomEvent: Happening, KeyboardEvent: Happening, PointerEvent: Happening,
    HTMLElement: class {}, Element: class {}, Node: class {}, DocumentFragment: class {}, Image: class {},
    customElements: { define() {}, get: () => undefined, whenDefined: () => new Promise(() => {}) },
    CSS: { escape: s => String(s), supports: () => false },
    screen: { width: 1280, height: 800 }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, scrollX: 0, scrollY: 0,
    performance: { now: () => 0, getEntriesByType: () => [] },
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    URL, URLSearchParams, Intl, crypto: globalThis.crypto, TextEncoder, TextDecoder, AbortController,
    Blob: globalThis.Blob, FormData: globalThis.FormData, Headers: globalThis.Headers, structuredClone, atob, btoa,
    DOMParser: class { parseFromString() { return anything(); } }, FileReader: class {}, Notification: undefined,
  };
  window.window = window.self = window.top = window.parent = window.globalThis = window;
  return vm.createContext(window);
}

/* The page's scripts in tag order: [name, code]. A script from another site
   is left out, and a tag whose file is missing is a failure of its own. */
function scriptsOf(page, html, root) {
  const out = [];
  let n = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, body] = m;
    const type = /\btype\s*=\s*"([^"]*)"/.exec(attrs)?.[1] ?? '';
    const src = /\bsrc\s*=\s*"([^"]*)"/.exec(attrs)?.[1];
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    if (src) {
      if (/^[a-z]+:|^\/\//i.test(src)) continue;
      const file = normalize(src.startsWith('/') ? src.slice(1) : join(dirname(page), src)).split('?')[0];
      out.push([file, existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : null]);
    } else if (body.trim()) {
      out.push([`${page} (script ${++n})`, body]);
    }
  }
  return out;
}

/* Loads one page's scripts and answers with what threw, or null. */
function load(page, html, root) {
  const ctx = world(page, html);
  for (const [name, code] of scriptsOf(page, html, root)) {
    if (code == null) return `${name} is not in the repository`;
    try { new vm.Script(code, { filename: name }).runInContext(ctx, { timeout: 5000 }); }
    catch (e) { return `${name} threw as it loaded: ${e?.message ?? e}`; }
  }
  return null;
}

// The rule proves itself first: a page whose second script reads what no
// first script set must fail, or a passing run would mean nothing.
{
  const html = '<script>window.First = { on: true };</script><script>window.Missing.on;</script>';
  const works = load('self-test.html', '<script>window.First = { on: true };</script><script>window.First.on;</script>', ROOT);
  if (works || !load('self-test.html', html, ROOT)) {
    console.log('  FAIL  the rule passed a page that reads a script it never loaded, so it proves nothing');
    process.exit(1);
  }
}

const tracked = (spawnSync('git', ['ls-files', '-z', 'scheduler'], { cwd: HERE, encoding: 'utf8' }).stdout ?? '').split('\0');
const pages = tracked.filter(p => p.endsWith('.html') && existsSync(join(ROOT, p)));
let failed = 0;
let loads = 0;
for (const page of pages) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  loads += scriptsOf(page, html, ROOT).length;
  const why = load(page, html, ROOT);
  if (why) { failed++; console.log(`   FAIL  ${page}: ${why}`); }
}
console.log(failed ? `\n  load: ${failed} of ${pages.length} pages have a script that throws as it loads`
  : `   ok    ${pages.length} pages, ${loads} script loads, none throws as it loads\n\n  load: every page's scripts load`);
process.exit(failed ? 1 : 0);
