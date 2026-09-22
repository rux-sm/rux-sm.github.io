---
type: reference
---

# Where IBM's own guidance fits

`carbon-website/` is gitignored and on disk: *read from, never shipped.* Its
pattern pages under `carbon-website/src/pages/patterns/` cover empty states, forms, dialogs,
notifications, filtering, global header, login, loading, search, and disabled and
read-only states. They are good on anatomy and when-to-use, which the component
reference cannot answer. `templates/empty-state.html` follows its empty-states
pattern.

**Two limits.**

**It assumes all of Carbon.** Read every pattern against `docs/inventory.md`
before following it; a pattern built on `page-header` describes something that
is not here.

**Take facts and decisions, not prose.** This repository is **public**, and its
`NOTICE` covers Carbon's Apache-2.0 *code*: the compiled CSS and the icon path
data. Website guidance is under a different licence. Record what it establishes
and cite it; do not paste paragraphs.

**It does not replace the captures.** For *markup*, `data/carbon-*.json` is the
reference, matching the compiled version and needing no network;
`node tools/diff-fragment.mjs <name>` compares against it. The website says what
a pattern should do; the captures say what the markup is.

## What has not been read

`carbon-website/src/pages/guidelines/content` exists and has not been read, so
there is no content or writing guidance anywhere here.
