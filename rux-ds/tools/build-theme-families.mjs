// Writes theme-creator/families.json: for every Carbon hue family (the
// neutral grays excluded — nothing about an accent theme wants gray-60 in
// place of blue-60), the seven shade keys Phase 14's spike found actually
// back the twenty --rux-* tokens: 20, 30, 40, 60, 70, 70Hover, 80. Roadmap
// §4.14.
//
// @carbon/colors is a direct devDependency (promoted from transitive,
// tools/lib/gates.mjs CONTROL_FILES and package.json both record why) so
// this script has something to import rather than a compiled CSS file with
// only the four Carbon themes' semantic tokens in it — the raw ramp isn't
// in css/rux.css at all.
import { writeFileSync } from 'node:fs';
import { colors, hoverColors } from '@carbon/colors';

// gray/coolGray/warmGray: neutral, never an accent. black/white: single-shade,
// no ramp to substitute with.
const EXCLUDED = new Set(['black', 'white', 'gray', 'coolGray', 'warmGray']);

const SHADES = [20, 30, 40, 60, 70, 80];

const families = {};
for (const [name, ramp] of Object.entries(colors)) {
  if (EXCLUDED.has(name)) continue;
  const hover = hoverColors[`${name}Hover`];
  const shades = {};
  for (const grade of SHADES) {
    const value = ramp[grade];
    if (typeof value !== 'string') {
      throw new Error(`@carbon/colors' ${name} family has no shade ${grade} — families.json cannot be built`);
    }
    shades[grade] = value;
  }
  const hover70 = hover?.[70];
  if (typeof hover70 !== 'string') {
    throw new Error(`@carbon/colors' ${name}Hover has no shade 70 — families.json cannot be built`);
  }
  shades['70Hover'] = hover70;
  families[name] = shades;
}

writeFileSync(
  'theme-creator/families.json',
  JSON.stringify({ _meta: { shades: [...SHADES, '70Hover'], source: '@carbon/colors' }, families }, null, 2) + '\n',
);

console.log(`theme-creator/families.json: ${Object.keys(families).length} families × 7 shades`);
