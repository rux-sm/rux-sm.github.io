//
// THE ICON SHEET: every symbol, and how each family draws it.
//
// THREE FAMILIES, one row per idea. Carbon's name is the row's key, because
// Carbon is where this system started and its names are what pages reference
// today. Material fills the second column and rux's own drawings the third,
// which is null until one is drawn.
//
//   carbon    i-<name>    @carbon/icons, quarried by build-icons.mjs
//   material  m-<name>    @material-symbols/svg-400/sharp, quarried the same way
//   rux       r-<name>    design/assets/icons-rux/<name>.svg, drawn here
//
// AN APP DRAWS FROM ONE FAMILY. Moving it across -- or back -- is reading this
// sheet rather than deciding 78 times, and a page never mixes them.
//
// ONE FILE PER ROW PER FAMILY, and no two rows share one, so the sheet runs
// every direction exactly.
//
// FILL IS PART OF THE NAME. Carbon splits several icons into an outline and a
// filled twin -- `information` and `information--filled`, `checkmark--outline`
// and `checkmark--filled`, `caution` and `warning--alt--filled` -- and Material
// ships the same split as `info` and `info-fill`. Pairing outline with outline
// keeps the two apart and keeps the round trip honest. Which fill a SURFACE
// draws is a separate decision: a trip bar takes the solid of everything,
// because at 12px an outline loses its strokes.
//
// AND NO TWO IDEAS COLLAPSE. Carbon's shape-indicator and icon-indicator sets
// give each status its own SHAPE so colour is never the only signal, and a
// sheet that put two of those on one drawing would quietly undo it. The first
// pass collapsed nine such pairs and every one was given a distinct
// counterpart; the comments below say which name was already taken.
//
// ONE SETTING OF MATERIAL, AND SIZE IS THE ONLY THING THAT VARIES.
// Material Symbols is a variable font with four axes -- fill, weight, grade and
// optical size -- but the SVG package exposes only two of them: weight is fixed
// by which package is installed, and style and fill are the folder and the
// `-fill` suffix. Grade and optical size are not in the files at all; Google
// bakes one drawing per style, weight and fill. So the whole rule is:
//
//   style   sharp     flat terminals, which is how Carbon's geometry reads
//   weight  400       @material-symbols/svg-400
//   fill    the sheet Carbon's own fill, which a small surface may override
//
// and nothing else is left to pin. A row may name `style: 'outlined'` where
// sharp draws the idea as a different shape, and says why beside it. An icon is that one drawing at whatever size
// it is asked for.
//
// SCALING ONE DRAWING IS FINE HERE, measured rather than assumed. Carbon draws
// 16, 20 and 32 separately and this sprite carries a mix of all three, so
// `search` comes from a 16 grid and `close` from a 32. Material has one drawing
// for every icon. Rasterised at 12, 16 and 20px and compared by how much of the
// box each inks, Material at 400 sharp sits within about two points of Carbon
// at every size -- heavier on `close`, lighter on `search`, with no drift one
// way. So no second weight for small sizes is needed, and the family is in fact
// steadier across sizes than the Carbon set it replaces.
//
// A pairing is a judgement about meaning, not a lookup. Where a family draws
// the same idea under an unobvious name, the reason is written beside it.
//
export const FAMILIES = ['carbon', 'material', 'rux'];
export const PREFIX = { carbon: 'i-', material: 'm-', rux: 'r-' };

export const ICONS = {
  'accessibility': { material: 'accessible', rux: null },
  'add': { material: 'add', rux: null },
  'arrow--down': { material: 'arrow_downward', rux: null },
  'arrow--left': { material: 'arrow_back', rux: null },
  'arrow--right': { material: 'arrow_forward', rux: null },
  'arrow--up': { material: 'arrow_upward', rux: null },
  'arrows--vertical': { material: 'swap_vert', rux: null },
  'attachment': { material: 'attachment', rux: null },
  'building': { material: 'apartment', rux: null },
  'bus': { material: 'directions_bus', rux: null },
  'calculator': { material: 'calculate', rux: null },
  'car': { material: 'directions_car', rux: null },
  'calendar': { material: 'calendar_month', rux: null },
  'caret--down': { material: 'arrow_drop_down', rux: null },
  'caret--left': { material: 'arrow_left', rux: null },
  'caret--right': { material: 'arrow_right', rux: null },
  'caret--up': { material: 'arrow_drop_up', rux: null },
  'caution': { material: 'warning', rux: null },
  'channels': { material: 'swap_horiz', rux: null },
  'chat': { material: 'chat', rux: null },
  'checkmark': { material: 'check', rux: null },
  'checkmark--filled': { material: 'check_circle-fill', rux: null },
  'checkmark--outline': { material: 'check_circle', rux: null },
  'chevron--down': { material: 'keyboard_arrow_down', rux: null },
  'chevron--left': { material: 'keyboard_arrow_left', rux: null },
  'chevron--right': { material: 'keyboard_arrow_right', rux: null },
  'chevron--up': { material: 'keyboard_arrow_up', rux: null },
  'circle-dash': { material: 'motion_photos_on', rux: null },  // A broken ring, which is what not-started means here.
  'circle-fill': { material: 'circle-fill', rux: null },
  'circle-stroke': { material: 'trip_origin', rux: null },  // A plain ring; `radio_button_unchecked` is taken by radio-button.
  'close': { material: 'close', rux: null },
  'close--filled': { material: 'cancel-fill', rux: null },
  'color-palette': { material: 'palette', rux: null },
  'copy': { material: 'content_copy', rux: null },
  'critical': { material: 'dangerous', rux: null },  // `error` is taken by error--filled.
  'critical-severity': { material: 'change_history', rux: null },
  'currency': { material: 'paid', rux: null },  // A dollar inside a ring, in both families; `currency--dollar` is the bare sign.
  'currency--dollar': { material: 'attach_money', rux: null },
  'delivery-truck': { material: 'local_shipping', rux: null },
  'diamond-fill': { material: 'diamond-fill', rux: null },  // Material draws the diamond; `square` is low-severity's.
  'document': { material: 'description', rux: null },
  'download': { material: 'download', rux: null },
  'edit': { material: 'edit', rux: null },
  'email': { material: 'mail', rux: null },
  'error--filled': { material: 'error-fill', rux: null },
  'fit-to-width': { material: 'fit_screen', rux: null },
  'folder': { material: 'folder', rux: null },
  'grid': { material: 'grid_view', rux: null },
  'hotel': { material: 'airline_seat_flat', rux: null },  // Carbon's hotel is a bed, which is what a sleeper coach is.
  'in-progress': { material: 'progress_activity', rux: null },  // `pending` is taken by pending--filled.
  'incomplete': { material: 'incomplete_circle', rux: null },
  'information': { material: 'info', rux: null },
  'information--filled': { material: 'info-fill', rux: null },
  'launch': { material: 'open_in_new', rux: null },
  'list': { material: 'list', rux: null },
  'location': { material: 'location_on', rux: null },
  'low-severity': { material: 'square', rux: null },
  'maximize': { material: 'open_in_full', rux: null },
  'menu': { material: 'menu', rux: null },
  'minimize': { material: 'close_fullscreen', rux: null },
  'notification': { material: 'notifications', rux: null },
  'overflow-menu--horizontal': { material: 'more_horiz', rux: null },
  'overflow-menu--vertical': { material: 'more_vert', rux: null },
  'pending--filled': { material: 'pending-fill', rux: null },
  'phone': { material: 'call', rux: null },
  'printer': { material: 'print', rux: null },
  'purchase': { material: 'credit_card', rux: null },  // Carbon's purchase is a credit card.
  'radio-button': { material: 'radio_button_unchecked', rux: null },
  'request-quote': { material: 'request_quote', rux: null },
  'route': { material: 'route', rux: null },  // Carbon draws no route; Material's is a path between two pins.
  'search': { material: 'search', rux: null },
  'shuttle': { material: 'airport_shuttle', rux: null },
  'subtract': { material: 'remove', rux: null },
  'time': { material: 'schedule', rux: null },
  'trash-can': { material: 'delete', rux: null },
  'undefined--filled': { material: 'quiz-fill', rux: null },  // `help` is taken by unknown--filled.
  'unknown--filled': { material: 'help-fill', rux: null },
  'upload': { material: 'upload', rux: null },
  'user': { material: 'person', rux: null },
  'user--avatar': { material: 'account_circle', rux: null },
  'user--multiple': { material: 'groups', rux: null },
  'view': { material: 'visibility', rux: null },
  'view--off': { material: 'visibility_off', rux: null },
  'warning--alt--filled': { material: 'warning-fill', rux: null },
  'warning--alt-inverted--filled': { material: 'do_not_disturb_on-fill', rux: null },  // The inverted triangle, kept distinct from the upright.
  'warning--filled': { material: 'report-fill', rux: null },  // The filled octagon; `error` is taken.
  'warning-square--filled': { material: 'gpp_maybe-fill', rux: null },  // The filled square badge; `report` is taken.
  'wifi': { material: 'wifi', style: 'outlined', rux: null },  // Sharp draws Wi-Fi as a fan ending in a wedge; outlined keeps the arcs and the dot everyone knows.
  'zoom--in': { material: 'zoom_in', rux: null },
  'zoom--out': { material: 'zoom_out', rux: null },
};

// A family's name for a row, or null where it has none yet.
export const nameIn = (family, carbon) =>
  family === 'carbon' ? carbon : (ICONS[carbon]?.[family] ?? null);

// The row a family's name belongs to, for reading the sheet the other way.
export const rowOf = (family, name) => family === 'carbon' ? name
  : Object.keys(ICONS).find(c => ICONS[c][family] === name) ?? null;
