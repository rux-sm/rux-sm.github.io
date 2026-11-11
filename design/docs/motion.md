---
type: reference
---

# Motion

Anything on these sites that moves follows Carbon's motion guidance: its
curves, its durations, and its rule that a larger move takes longer. The source
is Carbon's motion overview, on carbondesignsystem.com under Elements, and in
the gitignored quarry at `carbon-website/src/pages/elements/motion/`.

## Two styles

- **Productive** is for frequent working moves the person is busy around:
  moving through weeks, opening a row, a menu, a side panel, a hover. Most
  motion here is productive, Carbon's side panel among it: it slides its
  320px in and fades over 150ms on the productive entrance curve, and leaves
  on the exit curve.
- **Expressive** is for rare moments that should be noticed: a page
  arriving, an alert, the primary action.

## Curves

| Curve | Productive | Expressive |
| :--- | :--- | :--- |
| Standard, moving on screen | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `cubic-bezier(0.4, 0.14, 0.3, 1)` |
| Entrance, arriving | `cubic-bezier(0, 0, 0.38, 0.9)` | `cubic-bezier(0, 0, 0.3, 1)` |
| Exit, leaving | `cubic-bezier(0.2, 0, 1, 0.9)` | `cubic-bezier(0.4, 0.14, 1, 1)` |

## Durations

| Token | Duration | For |
| :--- | :--- | :--- |
| `fast-01` | 70ms | a button or toggle |
| `fast-02` | 110ms | a fade |
| `moderate-01` | 150ms | a small expansion, a short move |
| `moderate-02` | 240ms | an expansion, a toast |
| `slow-01` | 400ms | a large expansion or move |
| `slow-02` | 700ms | dimming the background |

A move picks its duration by how far it goes, the larger the longer, within
this scale; productive motion sits toward the short end of it.

## Where Carbon has no answer

A motion Carbon does not cover says so in a comment beside it, with what it
uses instead. Three exist now:

- **A scroll.** The scheduler's board is scrolled by the browser, a
  trackpad's gesture with its own momentum and an arrow's press by the
  browser's own smooth scroll, which carries on to a new end when pressed
  again, so the board moves as every other scrolled thing on the computer
  does; `scheduler/app.css` and `scheduler/data.js` say so beside it.

- **A light that loops.** The scheduler's lights that run while something
  waits or is out, such as the steering wheel of a bus on the road, a live
  pin's ring and an open seat, have no end, and Carbon gives a duration and
  a curve only for a move that ends. Each keeps a slow, even beat of its
  own, and stops under Calm and Off.
- **A shake.** A bar coming on the road shudders as its engine starts, the
  steps its keyframes' own, played at a steady rate over `slow-02`.

Where the computer asks for reduced motion, a move happens at once.
