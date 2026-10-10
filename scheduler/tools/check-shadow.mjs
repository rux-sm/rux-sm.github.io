// The shadow rule. A scheduler script is one scope: its helpers are declared
// once, at the top of the file's wrapper, and called from everywhere under
// it. A local that takes a helper's name hides it for the rest of its block,
// so a call written for the helper reaches the local instead, and fails as
// "is not a function" or, worse, runs something else. Nothing else in the
// check runs that line, so it reaches the site.
//
// The rule: in any scheduler script, a call must not reach a local that has
// the name of a function declared at the file's own level. A finding is
// fixed by renaming the local. There is no list of excused names.
//
// It reads the scripts itself, with no parser to install: a tokenizer, the
// brackets matched, and the scopes a brace, a parameter list, a loop's head
// or an arrow's body opens. It fails when it cannot follow a file, and it
// first runs a sample that must fail and one that must pass, so a change
// that blinds it is caught here and not by a quiet pass.
//
//   node scheduler/tools/check-shadow.mjs [file ...]
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEDULER = resolve(HERE, '..');
const ROOT = resolve(SCHEDULER, '..');

class Lost extends Error {}
const lost = (line, why) => { throw new Lost(`line ${line}: ${why}`); };

// ── tokens ──────────────────────────────────────────────────────────────────
// The words that are never a name. `async`, `of`, `get`, `set` and `static` are names wherever they are not doing their job.
const KEYWORDS = new Set(['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'null', 'true', 'false']);
// After one of these a slash starts a regular expression; after anything else it divides.
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do',
  'instanceof', 'yield', 'await']);
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=',
  '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**',
  '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '?', ':', '=', '.', '@', '#'];

function tokenize(src) {
  const tokens = [];
  // What each open brace is: a block of code, or the code inside a template's ${ }.
  const braces = [];
  let i = 0, line = 1;
  const push = (type, value) => tokens.push({ type, value, line });
  const template = () => {
    // From just past a backtick, or just past the } that closes a ${ }, to the next ${ or the closing backtick.
    for (;;) {
      if (i >= src.length) lost(line, 'a template that never ends');
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') line++;
      if (c === '`') { i++; return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; braces.push('template'); return; }
      i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === ' ' || c === '﻿') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) lost(line, 'a comment that never ends');
      for (let k = i; k < end; k++) if (src[k] === '\n') line++;
      i = end + 2;
      continue;
    }
    if (c === '\'' || c === '"') {
      const startLine = line;
      let k = i + 1;
      while (k < src.length && src[k] !== c) {
        if (src[k] === '\\') k++;
        else if (src[k] === '\n') lost(startLine, 'a string that runs past its line');
        k++;
      }
      if (k >= src.length) lost(startLine, 'a string that never ends');
      push('string', src.slice(i, k + 1));
      i = k + 1;
      continue;
    }
    if (c === '`') { i++; push('string', '`'); template(); continue; }
    if (c === '}' && braces.at(-1) === 'template') { braces.pop(); i++; template(); continue; }
    if (c === '/') {
      const prev = tokens.at(-1);
      const divides = prev && (prev.type === 'number' || prev.type === 'string'
        || (prev.type === 'name' && !BEFORE_REGEX.has(prev.value))
        || (prev.type === 'punct' && [')', ']', '}', '++', '--'].includes(prev.value)));
      if (!divides) {
        const startLine = line;
        let k = i + 1, inClass = false;
        for (;; k++) {
          if (k >= src.length || src[k] === '\n') lost(startLine, 'a regular expression that never ends');
          if (src[k] === '\\') { k++; continue; }
          if (src[k] === '[') inClass = true;
          else if (src[k] === ']') inClass = false;
          else if (src[k] === '/' && !inClass) break;
        }
        k++;
        while (/[a-z]/i.test(src[k] ?? '')) k++;
        push('string', src.slice(i, k));
        i = k;
        continue;
      }
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(0[xXbBoO][0-9a-fA-F_]+n?|[0-9][0-9_]*(\.[0-9_]*)?([eE][+-]?[0-9]+)?n?|\.[0-9][0-9_]*([eE][+-]?[0-9]+)?)/.exec(src.slice(i, i + 80));
      push('number', m[0]);
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i, i + 200));
      push('name', m[0]);
      i += m[0].length;
      continue;
    }
    const p = PUNCT.find(x => src.startsWith(x, i));
    if (!p) lost(line, `a character it does not know, ${JSON.stringify(c)}`);
    if (p === '{') braces.push('block');
    if (p === '}') { if (braces.pop() !== 'block') lost(line, 'a brace that closes nothing'); }
    push('punct', p);
    i += p.length;
  }
  if (braces.length) lost(line, 'a brace that is never closed');
  return tokens;
}

// ── the scopes, and the calls in them ───────────────────────────────────────
function analyse(src) {
  const t = tokenize(src);
  const is = (k, v) => t[k]?.type === 'punct' && t[k].value === v;
  const word = (k, v) => t[k]?.type === 'name' && (v === undefined || t[k].value === v);
  const ident = k => t[k]?.type === 'name' && !KEYWORDS.has(t[k].value);

  // Every bracket's partner.
  const match = new Array(t.length).fill(-1);
  {
    const open = [];
    const pair = { ')': '(', ']': '[', '}': '{' };
    t.forEach((tok, k) => {
      if (tok.type !== 'punct') return;
      if ('([{'.includes(tok.value)) open.push(k);
      else if (pair[tok.value]) {
        const o = open.pop();
        if (o === undefined || t[o].value !== pair[tok.value]) lost(tok.line, `a ${tok.value} with no partner`);
        match[o] = k;
        match[k] = o;
      }
    });
    if (open.length) lost(t[open.at(-1)].line, 'a bracket that is never closed');
  }

  /* The names a binding makes, from a pattern between two tokens: a list of
     targets parted by commas, each a name, an object pattern or an array
     pattern, with a default after `=` and a rest after `...`. */
  function names(from, to, out = []) {
    let k = from;
    const skipDefault = () => {
      while (k < to && !is(k, ',')) k = match[k] > k ? match[k] + 1 : k + 1;
    };
    const target = () => {
      if (is(k, '...')) k++;
      if (is(k, '{')) { objectNames(k + 1, match[k], out); k = match[k] + 1; }
      else if (is(k, '[')) { names(k + 1, match[k], out); k = match[k] + 1; }
      else if (ident(k) || word(k)) { out.push({ name: t[k].value, line: t[k].line }); k++; }
      else lost(t[k]?.line ?? 0, 'a binding it cannot read');
    };
    while (k < to) {
      if (is(k, ',')) { k++; continue; }
      target();
      if (is(k, '=')) { k++; skipDefault(); }
      if (k < to && !is(k, ',')) lost(t[k].line, 'a binding list it cannot read');
    }
    return out;
  }
  function objectNames(from, to, out) {
    let k = from;
    while (k < to) {
      if (is(k, ',')) { k++; continue; }
      if (is(k, '...')) { k++; out.push({ name: t[k].value, line: t[k].line }); k++; continue; }
      // A key, then either `: target` or, shorthand, the key as the name.
      let keyEnd = k + 1;
      if (is(k, '[')) keyEnd = match[k] + 1;
      if (is(keyEnd, ':')) {
        k = keyEnd + 1;
        if (is(k, '{')) { objectNames(k + 1, match[k], out); k = match[k] + 1; }
        else if (is(k, '[')) { names(k + 1, match[k], out); k = match[k] + 1; }
        else { out.push({ name: t[k].value, line: t[k].line }); k++; }
      } else { out.push({ name: t[k].value, line: t[k].line }); k = keyEnd; }
      if (is(k, '=')) { k++; while (k < to && !is(k, ',')) k = match[k] > k ? match[k] + 1 : k + 1; }
    }
  }

  // Where the statement that starts at `k` ends: the index just past it.
  function statementEnd(k) {
    if (is(k, '{')) return match[k] + 1;
    if (word(k, 'if')) {
      let e = statementEnd(match[k + 1] + 1);
      if (word(e, 'else')) e = statementEnd(e + 1);
      return e;
    }
    if (word(k, 'for') || word(k, 'while') || word(k, 'with') || word(k, 'switch')) {
      const open = word(k + 1, 'await') ? k + 2 : k + 1;
      return statementEnd(match[open] + 1);
    }
    if (word(k, 'do')) {
      const e = statementEnd(k + 1);
      return is(match[e + 1] + 1, ';') ? match[e + 1] + 2 : match[e + 1] + 1;
    }
    if (word(k, 'try')) {
      let e = match[k + 1] + 1;
      if (word(e, 'catch')) e = is(e + 1, '(') ? match[match[e + 1] + 1] + 1 : match[e + 1] + 1;
      if (word(e, 'finally')) e = match[e + 1] + 1;
      return e;
    }
    // An expression, to its semicolon, or to the brace that closes the block it is in.
    let e = k;
    while (e < t.length && !is(e, ';')) {
      if (is(e, '}') || is(e, ')') || is(e, ']')) return e;
      e = match[e] > e ? match[e] + 1 : e + 1;
    }
    return e + 1;
  }
  // Where an arrow's body with no braces ends: the index of what closes it.
  function expressionEnd(k) {
    let e = k;
    while (e < t.length && !is(e, ';') && !is(e, ',') && !is(e, ')') && !is(e, ']') && !is(e, '}')) {
      e = match[e] > e ? match[e] + 1 : e + 1;
    }
    return e;
  }

  const root = { parent: null, level: true, decls: new Map(), kind: 'file' };
  const stack = [root];
  // Scopes waiting for a brace: the names a parameter list or a loop's head gives the block that follows.
  const waiting = new Map();
  const declare = (scope, list, fn = false) => {
    for (const d of list) if (!scope.decls.has(d.name)) scope.decls.set(d.name, { line: d.line, fn });
  };
  const open = (kind, list = [], until = null) => {
    const parent = stack.at(-1);
    /* The file's own level is the file and the one wrapper around it, the
       function a script is written inside and calls at once. */
    const level = parent === root && kind === 'function' && root.wrapper === undefined;
    const scope = { parent, level, decls: new Map(), kind, until };
    if (level) root.wrapper = scope;
    declare(scope, list);
    stack.push(scope);
    return scope;
  };
  const calls = [];

  for (let k = 0; k < t.length; k++) {
    // A scope with no brace of its own ends where its statement or expression does.
    while (stack.at(-1).until !== null && stack.at(-1).until !== undefined && k >= stack.at(-1).until) stack.pop();
    const tok = t[k];

    if (tok.type === 'punct' && tok.value === '{') {
      if (waiting.has(k)) { const w = waiting.get(k); open(w.kind, w.list); continue; }
      const prev = t[k - 1];
      const afterParen = prev?.type === 'punct' && prev.value === ')';
      const head = afterParen ? t[match[k - 1] - 1] : null;
      if (afterParen && head?.type === 'name' && !['if', 'while', 'switch', 'with', 'for', 'catch'].includes(head.value)
        && !word(match[k - 1] - 2, 'extends')) {
        // A method: a name, its parameters, its body.
        open('function', names(match[k - 1] + 1, k - 1));
      } else if (afterParen && head?.type === 'punct' && head.value === ']') {
        open('function', names(match[k - 1] + 1, k - 1));
      } else open('block');
      continue;
    }
    if (tok.type === 'punct' && tok.value === '}') {
      // Whatever ended without a brace inside this block ended with it.
      while (stack.at(-1).until !== null && stack.at(-1).until !== undefined) stack.pop();
      if (stack.length < 2) lost(tok.line, 'a block that closes the file');
      stack.pop();
      continue;
    }

    if (tok.type === 'punct' && tok.value === '=>') {
      const list = is(k - 1, ')') ? names(match[k - 1] + 1, k - 1) : [{ name: t[k - 1].value, line: t[k - 1].line }];
      if (is(k + 1, '{')) waiting.set(k + 1, { kind: 'function', list });
      else open('function', list, expressionEnd(k + 1));
      continue;
    }

    if (tok.type !== 'name') continue;

    if (tok.value === 'function') {
      let p = k + 1;
      if (is(p, '*')) p++;
      const named = t[p]?.type === 'name' ? p : -1;
      if (named >= 0) p++;
      if (!is(p, '(')) lost(tok.line, 'a function with no parameter list');
      const body = match[p] + 1;
      if (!is(body, '{')) lost(tok.line, 'a function with no body');
      // A declaration names itself in the block it stands in; an expression's name is its own.
      const prev = t[k - 1];
      const declared = named >= 0 && (!prev || (prev.type === 'punct' && [';', '{', '}', ')'].includes(prev.value))
        || (prev.type === 'name' && ['async', 'export', 'default', 'else', 'do'].includes(prev.value)
          && !(prev.value === 'async' && is(k - 2, '='))));
      if (declared) declare(stack.at(-1), [{ name: t[named].value, line: t[named].line }], true);
      waiting.set(body, { kind: 'function', list: names(p + 1, match[p]) });
      k = p;   // on to the parameter list, whose defaults may call
      continue;
    }

    if (tok.value === 'catch' && is(k + 1, '(') && !is(k - 1, '.') && !is(k - 1, '?.') && is(match[k + 1] + 1, '{')) {
      waiting.set(match[k + 1] + 1, { kind: 'block', list: names(k + 2, match[k + 1]) });
      continue;
    }

    if (tok.value === 'const' || tok.value === 'let' || tok.value === 'var') {
      // One declarator at a time: its target, then its value, skipped to the comma that starts the next.
      const list = [];
      let fn = false;
      let p = k + 1;
      for (;;) {
        const startOf = p;
        if (is(p, '{') || is(p, '[')) { names(p, match[p] + 1, list); p = match[p] + 1; }
        else if (t[p]?.type === 'name') { list.push({ name: t[p].value, line: t[p].line }); p++; }
        else lost(tok.line, 'a declaration it cannot read');
        if (is(p, '=')) {
          // A name given a function is a function, for the file's own level.
          if (list.length === 1 && startOf === k + 1) {
            const v = p + 1;
            const arrowAfterParen = is(v, '(') && is(match[v] + 1, '=>');
            fn = arrowAfterParen || (t[v]?.type === 'name' && is(v + 1, '=>')) || word(v, 'function')
              || (word(v, 'async') && (word(v + 1, 'function') || is(v + 1, '(') || t[v + 1]?.type === 'name'));
          }
          p++;
          while (p < t.length && !is(p, ',') && !is(p, ';') && !is(p, ')') && !is(p, '}') && !word(p, 'of') && !word(p, 'in')) {
            p = match[p] > p ? match[p] + 1 : p + 1;
          }
        }
        if (is(p, ',')) { p++; continue; }
        break;
      }
      // A loop's own declaration belongs to the loop's body.
      const inFor = is(k - 1, '(') && (word(k - 2, 'for') || (word(k - 2, 'await') && word(k - 3, 'for')));
      if (inFor) {
        const after = match[k - 1] + 1;
        if (is(after, '{')) waiting.set(after, { kind: 'block', list });
        else {
          // Opened once the head is passed, so the head's own calls are still the block's around it.
          waiting.set(`for:${after}`, { list, until: statementEnd(after) });
        }
      } else declare(stack.at(-1), list, list.length === 1 && fn);
      continue;
    }

    // The body of a loop with no braces, reached: its head's names are its own.
    if (waiting.has(`for:${k}`)) {
      const w = waiting.get(`for:${k}`);
      waiting.delete(`for:${k}`);
      open('block', w.list, w.until);
    }

    // A call: a name, then its arguments, and not a method being written or a property being read.
    if (!KEYWORDS.has(tok.value) && (is(k + 1, '(') || (is(k + 1, '?.') && is(k + 2, '(')))) {
      const prev = t[k - 1];
      if (prev?.type === 'punct' && (prev.value === '.' || prev.value === '?.')) continue;
      if (prev?.type === 'name' && ['function', 'class'].includes(prev.value)) continue;
      const args = is(k + 1, '(') ? k + 1 : k + 2;
      if (is(match[args] + 1, '{') && !(prev?.type === 'name' && ['if', 'while', 'for', 'switch', 'return'].includes(prev.value))) {
        // A method being written, which the brace above takes as one, unless the brace is plainly a block after a statement.
        const before = prev?.type === 'punct' ? prev.value : prev?.value;
        if (![')', ';', 'else'].includes(before) || is(k - 1, '{') || is(k - 1, ',')) continue;
      }
      calls.push({ name: tok.value, line: tok.line, scope: stack.at(-1) });
    }
  }
  while (stack.length > 1 && stack.at(-1).until !== null && stack.at(-1).until !== undefined) stack.pop();
  if (stack.length !== 1) lost(t.at(-1)?.line ?? 0, 'a block that is never closed');

  // The functions of the file's own level, and each call that reaches a nearer name instead.
  const levels = [root, root.wrapper].filter(Boolean);
  const helpers = new Map();
  for (const s of levels) for (const [name, d] of s.decls) if (d.fn) helpers.set(name, d.line);
  const found = [];
  for (const c of calls) {
    if (!helpers.has(c.name)) continue;
    for (let s = c.scope; s && !levels.includes(s); s = s.parent) {
      const local = s.decls.get(c.name);
      if (local) { found.push({ name: c.name, line: c.line, local: local.line, helper: helpers.get(c.name) }); break; }
    }
  }
  return { found, helpers: helpers.size, calls: calls.length };
}

// ── its own two samples ─────────────────────────────────────────────────────
const SAMPLE_BAD = `(() => {
  'use strict';
  const tell = words => console.log(words);
  function draw(list) { for (const row of list) tell(row); }
  const sum = (a, b) => a + b;
  function one() { const tell = 'a word'; tell(\`not \${tell}\`); }
  function two(draw) { draw([1]); }
  function three({ sum }) { return sum(1, 2); }
  function four(list) { for (const draw of list) draw(); }
  function five() { try { tell('x'); } catch (tell) { tell(1); } }
  function six() { function sum() { return 0; } return sum(); }
  const seven = list => list.map(tell => tell('y'));
  function eight(list) { for (const [tell] of list) if (tell) tell(2); else draw(list); }
})();`;
const SAMPLE_GOOD = `(() => {
  'use strict';
  const tell = words => console.log(words);
  function draw(list) { for (const row of list) tell(row); }
  const price = /\\d+\\/\\d+/.test('1/2') ? 4 / 2 : 0;
  function one(told) { const note = \`\${tell('in a template')} and \${told}\`; return note.length / price; }
  const two = { tell: 1, draw(list) { return draw(list); }, sum: (a, b) => a + b };
  function three(list) { for (const row of list) if (row) tell(row); else draw([]); return two.tell; }
  const four = async rows => { for await (const r of rows) tell(r); };
  function five(o) { const { tell: said } = o; return said ? draw([said]) : tell('none'); }
})();`;

function selfTest() {
  const bad = analyse(SAMPLE_BAD).found.map(f => `${f.name}:${f.line}`);
  const want = ['tell:6', 'draw:7', 'sum:8', 'draw:9', 'tell:10', 'sum:11', 'tell:12', 'tell:13'];
  const good = analyse(SAMPLE_GOOD).found;
  const missed = want.filter(w => !bad.includes(w));
  const extra = bad.filter(b => !want.includes(b));
  if (missed.length || extra.length || good.length) {
    console.log('  FAIL  the rule\'s own samples');
    if (missed.length) console.log(`        it no longer sees: ${missed.join(', ')}`);
    if (extra.length) console.log(`        it sees what is not there: ${extra.join(', ')}`);
    if (good.length) console.log(`        it faults the clean sample: ${good.map(f => `${f.name}:${f.line}`).join(', ')}`);
    return false;
  }
  return true;
}

// ── the run ─────────────────────────────────────────────────────────────────
const scripts = dir => readdirSync(dir, { withFileTypes: true })
  .filter(e => e.isFile() && e.name.endsWith('.js')).map(e => join(dir, e.name));
const files = process.argv.length > 2 ? process.argv.slice(2).map(f => resolve(f))
  : [...scripts(SCHEDULER), ...scripts(join(SCHEDULER, 'share'))];

let failed = !selfTest();
let helpers = 0, calls = 0;
for (const file of files) {
  const name = relative(ROOT, file);
  try {
    const r = analyse(readFileSync(file, 'utf8'));
    helpers += r.helpers;
    calls += r.calls;
    for (const f of r.found) {
      failed = true;
      console.log(`  FAIL  ${name}:${f.line}  ${f.name}() reaches the local on line ${f.local}, not the function on line ${f.helper}`);
    }
  } catch (e) {
    if (!(e instanceof Lost)) throw e;
    failed = true;
    console.log(`  FAIL  ${name}  could not be followed: ${e.message}`);
  }
}
console.log(failed ? '\n  shadow: rename each local above, or mend the rule where it lost its way'
  : `   ok   shadow  ${files.length} scripts, ${calls} calls, none reaching a local that hides one of ${helpers} functions`);
process.exit(failed ? 1 : 0);
