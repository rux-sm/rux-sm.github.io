---
type: plan
---

# Plan: the scheduler's logo on a dark bar

## Goal

Every mark in the top bar reads against the bar behind it. rux's own mark does
now — it ships as two drawings, gray 10 and gray 100, and `design/js/theme.js`
takes whichever has the higher contrast against the bar it is sitting on. The
scheduler's is the client's own picture file, one file, and its second line
does not read.

## Decisions

- **The client's artwork is not redrawn or recoloured on disk.** Whatever is
  done is a CSS filter over the one file they gave us, so the file stays
  theirs. The file has a clean alpha channel, so a filter flattens the ink
  without touching the shape.
- **The blue is kept where it works.** At 3.9 to 4.5 it is much the same on
  every bar; it is the second line that fails. A fix that flattens the whole
  mark to one colour trades the brand's blue for one line of text.

## Questions

Contrast, measured against the bars the scheduler actually uses:

| ink | g100 `#161616` | geist `#0a0a0a` | ant `#141414` | spotify `#181818` | a light bar |
| :--- | ---: | ---: | ---: | ---: | ---: |
| ESCAMILLA, blue `#367da7` | 4.01 | 4.38 | 4.08 | 3.93 | 4.2–4.5 |
| TOUR BUSES, grey `#5c5c5e` | 2.71 | 2.97 | 2.76 | 2.66 | 6.2–6.7 |
| the whole mark, solid white | 18.10 | 19.80 | 18.42 | 17.76 | 1.00 |
| the whole mark, solid black | 1.16 | 1.06 | 1.14 | 1.18 | 19.5–21.0 |

- **Which of three?** Leave it, and the second line stays at 2.7 on a dark bar
  as it is today. Or flatten it — `brightness(0) invert(1)` for a dark bar and
  `brightness(0)` for a light one — which takes every line past 17 and loses
  the blue. Or ask the client for a drawing made for a dark background, the
  only answer that keeps both the blue and the line.

## Tasks

- [ ] rux answers the question above.
- [ ] rux checks the bar on Home, Design, Notes and the scheduler in every
      theme, including a light one built in the Theme Creator.
