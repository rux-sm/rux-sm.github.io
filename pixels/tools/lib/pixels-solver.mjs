// The game's own rules on the Mac: pixels/app.js run as the browser runs it,
// so a puzzle is checked, graded and ordered by the same code the Pixelator
// and the board use, with no second copy of them.
//
// app.js expects a page, so it runs against a stand-in that answers every
// question with something harmless and lists nothing, and its browser work
// comes to nothing. What it leaves on `window.Pixels` is returned: `grid`,
// `unreached`, `rounds`, `firstLook`, `grade`, `order` and the rest.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app.js');

export const pixels = () => {
  const nothing = new Proxy(function () {}, {
    get: (_, key) => (key === Symbol.iterator ? function* () {} : key === Symbol.toPrimitive ? () => '' : key === 'length' ? 0 : key === 'then' ? undefined : nothing),
    apply: () => nothing,
    construct: () => nothing,
    set: () => true,
    has: () => true,
  });
  const window = { Pixels: {} };
  window.window = window;
  const known = { window, console, Math, JSON, Date, Map, Set, Array, Object, String, Number, Boolean, Promise, Symbol, RegExp, Error, Intl, encodeURIComponent, setTimeout() {}, clearTimeout() {} };
  const context = vm.createContext(new Proxy(known, { get: (all, key) => (key in all ? all[key] : nothing), has: () => true }));
  vm.runInContext(readFileSync(APP, 'utf8'), context, { filename: APP });
  return window.Pixels;
};
