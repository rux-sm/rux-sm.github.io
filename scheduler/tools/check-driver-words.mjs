// Holds the driver's words to one shape in both languages: every key the
// English table has, the Spanish has, of the same kind, a line that takes
// something from the trip taking as much in both, and every word driver.js
// asks for is in them. The page's words are share/driver-words.js and the
// texts' are driver-text.js. A line added in English and not in Spanish would
// reach a Spanish driver as nothing, so it fails here first.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../share/driver-words.js', import.meta.url), 'utf8'), { window });
runInNewContext(readFileSync(new URL('../driver-text.js', import.meta.url), 'utf8'), { window });
const { en, es, LOCALE } = window.SchedulerDriverWords;
const texts = window.SchedulerDriverText.WORDS;

let failed = 0;
const fail = text => { failed++; console.log(`   FAIL  ${text}`); };

// The same keys, of the same kind, all the way down.
function compare(a, b, path) {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const at = path ? `${path}.${key}` : key;
    if (!(key in a)) { fail(`${at} is in Spanish and not in English`); continue; }
    if (!(key in b)) { fail(`${at} is in English and not in Spanish`); continue; }
    const x = a[key], y = b[key];
    if (typeof x !== typeof y) { fail(`${at} is a ${typeof x} in English and a ${typeof y} in Spanish`); continue; }
    if (typeof x === 'function' && x.length !== y.length) fail(`${at} takes ${x.length} in English and ${y.length} in Spanish`);
    if (typeof x === 'string' && (!x.trim() || !y.trim())) fail(`${at} is empty in one language`);
    if (x && typeof x === 'object') compare(x, y, at);
  }
}
compare(en, es, '');
compare(texts.en, texts.es, 'texts');
if (!LOCALE?.en || !LOCALE?.es) fail('LOCALE does not name a locale for both languages');

// Every word driver.js asks for, by name, is there.
const page = readFileSync(new URL('../share/driver.js', import.meta.url), 'utf8');
const asked = new Set([...page.matchAll(/\bw\.([a-zA-Z]+)/g)].map(m => m[1]));
// Lines named by a value rather than written out: a card's problem and a place the office left blank.
for (const key of ['notYours', 'notLoaded', 'yard', 'destination']) asked.add(key);
for (const key of asked) if (!(key in en)) fail(`driver.js asks for w.${key}, which is not in the words`);

console.log(`   ${failed ? 'FAIL' : 'ok  '}  words  ${Object.keys(en).length} lines on the page and ${Object.keys(texts.en).length} in the texts, in English and Spanish, ${asked.size} asked for by driver.js`);
process.exit(failed ? 1 : 0);
