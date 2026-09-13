//
// STATIC MARKUP vs THE LIVE DOM — paste into the kitchen sink's devtools console.
//
// A browser tool for the same reason as check-a11y.js and check-rendered.js: the
// question needs a page that has RUN, and automating it means a headless-browser
// dependency this project does not have (roadmap §4.8, README "Gates").
//
// WHAT IT ANSWERS. check-coverage reads files. It parses kitchen-sink.html and
// counts the `rux--*` classes it finds, which is the only thing a Node tool can
// do — and it is not the same set the reader sees. Modules run. A class in the
// file may be gone by the time the page settles, and a class the page shows may
// never have been in the file at all.
//
// THE TWO DIRECTIONS ARE NOT SYMMETRIC, and only one is a defect.
//
//   STRIPPED  in the file, absent from the live DOM. check-coverage counts it as
//             exercised; nobody can see it. This is the dangerous one — a green
//             number over a state that does not render. It found dropdown.html's
//             two expanded specimens, which had rendered closed for as long as
//             the sink shipped an open side nav: overlay.register() dismissed
//             them during another module's adoption pass, at rest, with nothing
//             pressed (js/ui-shell.js, 2026-08-28).
//
//   ADDED     in the live DOM, absent from the file. check-coverage does not
//             count it, and the page shows it anyway. Harmless: the ratchet
//             understates rather than overstates. Three today —
//             data-table--selected, table-sort--active, side-nav__overlay-active
//             — all applied by modules from state the markup already implies.
//             Do NOT fix these by hardcoding the class: it duplicates state a
//             module derives, and the copy goes stale the moment the real state
//             changes.
//
// WHAT IT CANNOT SEE. Anything that needs an interaction. This is a LOAD-TIME
// comparison: it says what the page settles to, not what a click produces. A
// class applied only while a menu is open is invisible here and invisible to
// check-coverage too, which is why the sink demos open specimens statically.
// It also cannot tell you whether a class that survived is doing anything —
// check-rendered.js and looking are still the answer to that.
//
(() => {
  const url = location.pathname + '?raw=' + Date.now();
  const request = new XMLHttpRequest();
  request.open('GET', url, false);
  request.send();
  // DOMParser RUNS NO SCRIPTS, which is the whole trick: it yields the document
  // as authored, next to the one the modules have finished with.
  const authored = new DOMParser().parseFromString(request.responseText, 'text/html');

  const classesIn = root => {
    const found = new Map();
    for (const el of root.querySelectorAll('[class]'))
      for (const name of el.className.toString().split(/\s+/))
        if (name.startsWith('rux--') && !found.has(name)) found.set(name, el);
    return found;
  };
  const inFile = classesIn(authored), inPage = classesIn(document);

  const place = el => ({
    where: el?.closest?.('.ks-sec')?.id ?? '(page)',
    on: el?.tagName.toLowerCase() ?? '?',
  });
  const stripped = [...inFile.keys()].filter(c => !inPage.has(c)).sort()
    .map(c => ({ class: c, ...place(inFile.get(c)) }));
  const added = [...inPage.keys()].filter(c => !inFile.has(c)).sort()
    .map(c => ({ class: c, ...place(inPage.get(c)) }));

  console.log(`\n  check-runtime-classes — ${inFile.size} in the file, ${inPage.size} in the page`);
  console.log(`  ${stripped.length} stripped at load, ${added.length} added at load\n`);
  if (stripped.length) {
    console.log('  STRIPPED — check-coverage counts these and the reader never sees them:');
    console.table(stripped);
  }
  if (added.length) {
    console.log('  ADDED — the page shows these and check-coverage does not count them:');
    console.table(added);
  }
  console.log('\n  NOT CHECKED: anything behind an interaction. This is load-time only,'
    + '\n  and a class that survived may still render nothing — that is check-rendered.\n');
  return { inFile: inFile.size, inPage: inPage.size, stripped, added };
})();
