// THE INKS: the one table every picture is painted from, and the rule that
// draws each shade. tools/build-inks.mjs writes it into theme.css, app.css,
// app.js and art/source/pixels.gpl, and the other tools read it here.
//
// SEVENTEEN COLOURS AND THE GREYS, seven shades each: palest, pale, light,
// the base, deep, dark and darkest. A base that came from Ant Design keeps
// its exact colour, so the game's bright look stays; the six bases given as
// three numbers are OKLCH, lightness, chroma and hue.
//
// THE RULE draws the other six from the base. Lightness steps evenly up to
// 0.955 and down toward 0.17; the colour stays strong, at the shares of the
// base's chroma in SHARE; and the hue turns, lights toward yellow and
// shadows toward blue-purple, each the short way round the wheel, so a
// shadow is never muddy. Yellow and gold turn further in their shadows,
// toward ochre. A colour outside what a screen shows loses chroma until it
// fits.
//
// A SQUARE IS ONE CHARACTER. Each ramp's string names its seven shades in
// order. The sixty characters pictures were saved in before there were 126
// inks keep their place, each on the new shade nearest it in its own colour;
// the new shades take Y, Z and the 64 letters in EXTRA, letters no Unicode
// normalisation or case change alters, so a stored picture never changes.
// A character is never moved to another shade once a picture may hold it.

export const SHADES = ['Palest', 'Pale', 'Light', '', 'Deep', 'Dark', 'Darkest'];
export const GREYS = ['White', 'Pale grey', 'Light grey', 'Grey', 'Deep grey', 'Dark grey', 'Black'];
const SHARE = [.38, .62, .84, 1, .95, .8, .62];
const TURN = [12, 8, 4, 0, -8, -16, -24];
const TURN_WARM = [4, 3, 2, 0, -14, -26, -36];

// [name, slug, base, the seven characters]
export const RAMPS = [
  ['Red', 'red', '#f5222d', 'YAc2KZm'],
  ['Orange', 'orange', '#fa8c16', 'BdĀ3Lnā'],
  ['Gold', 'gold', [.80, .17, 80], 'ĂăĄąĆćĈ'],
  ['Yellow', 'yellow', '#fadb14', 'ĉCe4ĊMo'],
  ['Lime', 'lime', [.80, .20, 125], 'ċČčĎďĐđ'],
  ['Green', 'green', '#52c41a', 'DĒf5Nēp'],
  ['Sea green', 'sea-green', [.68, .15, 165], 'ĔĕĖėĘęĚ'],
  ['Teal', 'teal', '#13c2c2', 'IěkaĜSu'],
  ['Sky blue', 'sky-blue', '#1bbdfb', 'JlĝbTĞv'],
  ['Blue', 'blue', '#1677ff', 'Eğg6OĠq'],
  ['Indigo', 'indigo', [.50, .22, 277], 'ġĢģĤĥĦħ'],
  ['Purple', 'purple', '#7615e0', 'FĨj9ĩPt'],
  ['Pink', 'pink', '#f11b97', 'GĪi8Qīs'],
  ['Brown', 'brown', '#ae6626', 'HĬh7Rrĭ'],
  ['Skin', 'skin', '#c8906b', 'xUĮVWXį'],
  ['Olive', 'olive', [.60, .10, 110], 'ĴĵĶķĸĹĺ'],
  ['Slate', 'slate', [.58, .05, 255], 'ĻļĽľŁłŃ'],
  ['Grey', 'grey', null, '1wńyŅz0'],
];
// The greys, white to black, a touch cool; five of them are the greys the
// game had before.
const GREY = ['#ffffff', '#dbdee6', '#b3b6c2', '#888b99', '#66697a', '#444658', '#151423'];

// The characters in the order of their numbers: the sixty-two a picture
// first had, then the new letters.
export const EXTRA = 'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįĴĵĶķĸĹĺĻļĽľŁłŃńŅ';
export const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' + EXTRA;

// sRGB and OKLCH, as Björn Ottosson gives them.
const lin = v => ((v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const unlin = v => Math.max(0, Math.min(255, Math.round((v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055) * 255)));
export const oklch = hex => {
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const L = .2104542553 * l + .793617785 * m - .0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, B = .0259040371 * l + .7827717662 * m - .808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180 / Math.PI) + 360) % 360];
};
const hexOf = (L, C, H) => {
  for (;;) {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
    if (rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4) || C < 1e-3) return '#' + rgb.map(v => unlin(v).toString(16).padStart(2, '0')).join('');
    C *= .97;
  }
};
// A hue turned by `by` degrees toward `goal`, never past it.
const toward = (h, goal, by) => {
  const d = ((goal - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(by, Math.abs(d));
};
const shades = (name, base) => {
  if (!base) return GREY;
  const [L0, C0, H0] = typeof base === 'string' ? oklch(base) : base;
  const warm = name === 'Yellow' || name === 'Gold';
  const up = name === 'Yellow' ? [.975, .955, .925] : [1, .62, .3].map(f => (.955 - L0) * f + L0);
  const down = name === 'Yellow' ? [.76, .58, .40] : [.3, .58, .82].map(f => L0 - (L0 - .17) * f);
  const Ls = [...up, L0, ...down];
  return Ls.map((L, i) => {
    if (i === 3) return typeof base === 'string' ? base : hexOf(...base);
    const t = (warm ? TURN_WARM : TURN)[i];
    const h = t > 0 ? toward(H0, 95, t) : toward(H0, 285, -t);
    return hexOf(L, C0 * SHARE[i], (h + 360) % 360);
  });
};

// Every ink: its character, its name, its CSS variable and its colour, ramp
// by ramp, palest first, which is the order the Pixelator and Aseprite show.
export const INKS = RAMPS.flatMap(([name, slug, base, chars]) => {
  const hexes = shades(name, base);
  return [...chars].map((c, i) => ({
    c, ramp: name, shade: i, hex: hexes[i],
    name: base ? [SHADES[i], SHADES[i] ? name.toLowerCase() : name].filter(Boolean).join(' ') : GREYS[i],
    variable: `--pixels-ink-${slug}-${i + 1}`,
  }));
});

// THE PALETTE IN ASEPRITE, as the Lua the art tools run there: the inks in
// INKS's order, then CLEAR, a see-through colour that is no ink, so a pixel
// of an indexed drawing is its ink's place here. `ids[n]` is the character
// at place n and `ink(c)` the place of a character, '.' being CLEAR;
// `chars(s)` is the characters of a string in order, since an ink past the
// first sixty-two is more than one byte.
export const luaPalette = () => `local CLEAR = ${INKS.length}
local pal = Palette(CLEAR + 1)
local ids = { ${INKS.map((k, n) => `[${n}] = ${JSON.stringify(k.c)}`).join(', ')} }
local at = {}
for n = 0, CLEAR - 1 do at[ids[n]] = n end
${INKS.map((k, n) => `pal:setColor(${n}, Color{ r = ${parseInt(k.hex.slice(1, 3), 16)}, g = ${parseInt(k.hex.slice(3, 5), 16)}, b = ${parseInt(k.hex.slice(5, 7), 16)} })`).join('\n')}
pal:setColor(CLEAR, Color{ r = 0, g = 0, b = 0, a = 0 })
local function ink(id) if id == '.' then return CLEAR end return at[id] end
local function chars(s) local out = {} for _, c in utf8.codes(s) do out[#out + 1] = utf8.char(c) end return out end`;
