// The name a captured class has in @carbon/styles.
//
// Two origins are harvested and they prefix differently: @carbon/react renders
// `cds--`, @carbon/ibm-products renders `c4p--`. The names behind the prefix
// are the same, so every check compares them with the prefix off.
//
// ibm-products also names a rewritten component with a `__next` segment while
// the generation before it still ships: `c4p--tearsheet__next__header`,
// `c4p--coachmark__next--content-header`. @carbon/styles ships the rewrite
// alone, under the plain name: `tearsheet__header`, `coachmark--content-header`.
// The capture files keep what was rendered; the segment is dropped here.
const PREFIX = /^(?:cds|c4p)--/;
const GENERATION = /^(tearsheet|coachmark)__next/;

export const captureName = c => c.replace(PREFIX, '').replace(GENERATION, '$1');
