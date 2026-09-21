//
// EVERY CARBON SYMBOL AND ITS MATERIAL COUNTERPART, one to one.
//
// This table is what makes the two families swappable. An app draws from one
// of them, and moving it from Carbon to Material -- or back -- is reading this
// map rather than deciding 78 times. A page therefore never mixes them: which
// family it uses is an app's decision, taken once.
//
// ONE MATERIAL FILE PER CARBON SYMBOL, and no two share one, so the map runs
// both ways exactly and an app can be moved back as easily as forward.
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
// give each status its own SHAPE so colour is never the only signal, and a map
// that put two of those on one drawing would quietly undo it. The first pass
// collapsed nine such pairs and every one was given a distinct counterpart; the
// comments below say which name was already taken.
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
//   fill    the map   Carbon's own fill, which a small surface may override
//
// and nothing else is left to pin. An icon is that one drawing at whatever size
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
// EVERY COUNTERPART EXISTS AS A SOLID, checked against the same package. A trip
// bar draws its marks at 12px, where an outline glyph loses its strokes and a
// solid one keeps its silhouette, so the solid set is the one that surface
// takes whatever the map says about fill.
//
// A pairing is a judgement about meaning, not a lookup. Where Material draws
// the same idea under an unobvious name, the reason is written beside it.
//
export const TO_MATERIAL = {
  'accessibility': 'accessible',
  'add': 'add',
  'arrow--down': 'arrow_downward',
  'arrow--right': 'arrow_forward',
  'arrow--up': 'arrow_upward',
  'arrows--vertical': 'swap_vert',
  'attachment': 'attachment',
  'building': 'apartment',
  'bus': 'directions_bus',
  'calculator': 'calculate',
  'calendar': 'calendar_month',
  'caret--down': 'arrow_drop_down',
  'caret--left': 'arrow_left',
  'caret--right': 'arrow_right',
  'caret--up': 'arrow_drop_up',
  'caution': 'warning',
  'channels': 'swap_horiz',
  'checkmark': 'check',
  'checkmark--filled': 'check_circle-fill',
  'checkmark--outline': 'check_circle',
  'chevron--down': 'keyboard_arrow_down',
  'chevron--left': 'keyboard_arrow_left',
  'chevron--right': 'keyboard_arrow_right',
  'chevron--up': 'keyboard_arrow_up',
  'circle-dash': 'motion_photos_on',  // A broken ring, which is what not-started means here.
  'circle-fill': 'circle-fill',
  'circle-stroke': 'trip_origin',  // A plain ring; `radio_button_unchecked` is taken by radio-button.
  'close': 'close',
  'close--filled': 'cancel-fill',
  'color-palette': 'palette',
  'copy': 'content_copy',
  'critical': 'dangerous',  // `error` is taken by error--filled.
  'critical-severity': 'change_history',
  'currency--dollar': 'attach_money',
  'diamond-fill': 'diamond-fill',  // Material draws the diamond; `square` is low-severity's.
  'document': 'description',
  'download': 'download',
  'edit': 'edit',
  'error--filled': 'error-fill',
  'fit-to-width': 'fit_screen',
  'folder': 'folder',
  'grid': 'grid_view',
  'hotel': 'airline_seat_flat',  // Carbon's hotel is a bed, which is what a sleeper coach is.
  'in-progress': 'progress_activity',  // `pending` is taken by pending--filled.
  'incomplete': 'incomplete_circle',
  'information': 'info',
  'information--filled': 'info-fill',
  'launch': 'open_in_new',
  'list': 'list',
  'location': 'location_on',
  'low-severity': 'square',
  'menu': 'menu',
  'notification': 'notifications',
  'overflow-menu--horizontal': 'more_horiz',
  'overflow-menu--vertical': 'more_vert',
  'pending--filled': 'pending-fill',
  'phone': 'call',
  'printer': 'print',
  'purchase': 'credit_card',  // Carbon's purchase is a credit card.
  'radio-button': 'radio_button_unchecked',
  'search': 'search',
  'subtract': 'remove',
  'time': 'schedule',
  'trash-can': 'delete',
  'undefined--filled': 'quiz-fill',  // `help` is taken by unknown--filled.
  'unknown--filled': 'help-fill',
  'upload': 'upload',
  'user': 'person',
  'user--avatar': 'account_circle',
  'user--multiple': 'groups',
  'view': 'visibility',
  'view--off': 'visibility_off',
  'warning--alt--filled': 'warning-fill',
  'warning--alt-inverted--filled': 'do_not_disturb_on-fill',  // The inverted triangle, kept distinct from the upright.
  'warning--filled': 'report-fill',  // The filled octagon; `error` is taken.
  'warning-square--filled': 'gpp_maybe-fill',  // The filled square badge; `report` is taken.
  'zoom--in': 'zoom_in',
  'zoom--out': 'zoom_out',
};

// The other direction, for moving an app back.
export const TO_CARBON = Object.fromEntries(
  Object.entries(TO_MATERIAL).map(([carbon, material]) => [material, carbon]));
