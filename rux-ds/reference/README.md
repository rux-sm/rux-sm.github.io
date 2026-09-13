# reference/ — material this repository was audited against

Three files, all from 2026-08-31, all **read-only quarry**: none is a rule
here, and nothing in `npm run verify` reads them. A `README` because
`adoption-audit-prompt.md` was referenced from nowhere and read as abandoned.

| File | Is |
|---|---|
| `agent-self-correction-loop.md` | the architecture `docs/adoption-audit.md` at the repository root measures this repository against |
| `adoption-audit-prompt.md` | the reusable instrument that produces such an audit — hand it to an agent pointed at any repository; it writes a gap report, never a patch |
| `tier-rules-block.md` | the tier vocabulary both of the above use |

**Conforming to the reference was never the goal**, and the prompt says so
itself: a system can be adequate, or better, while diverging from it. The root
audit is one dated reading, not a standing obligation.
