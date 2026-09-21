# Icons drawn here

Every `<name>.svg` in this folder becomes `r-<name>` in the sprite, and the
name must be a row in `tools/lib/icon-map.mjs` — the sheet is what says which
idea a drawing is of, so an app can be moved between families without deciding
78 times.

Draw on a **32 by 32** grid with `viewBox="0 0 32 32"`, ink only (`fill`, no
`stroke`), and no `width` or `height`: the sprite rewrites the wrapper and a
page sizes the symbol itself. Carbon fills 81 to 89 per cent of its box on a
wide glyph, which is the room to aim for.

`npm run icons` picks up whatever is here. Nothing checks a drawing against a
publisher, because there is none — these are ours.
