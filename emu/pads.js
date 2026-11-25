/* ==========================================================================
   pads.js — a controller's buttons, as each emulator sets them
   --------------------------------------------------------------------------
   `R.pads.of(gamepad)` says what a controller is, from the id Chrome's
   Gamepad API gives it: its maker's and product's numbers and its family,
   Nintendo, Xbox or PlayStation, whose buttons are printed differently.
   `R.pads.read(system, helper)` reads the chosen console's emulator's own
   controller settings through Rux Emu Helper's /mac/setting and returns which
   controller its player 1 is bound to and what each physical control does on
   that console. Each emulator numbers buttons its own way, which
   emu/docs/controller-settings.md lists; here every one is turned into the
   physical controls by position: south, east, west and north for the face
   buttons, then the shoulders, triggers, sticks and D-pad.
   `R.pads.draw(family, map)` draws the controller with each control labelled
   as printed and what it does beside it.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;

  // A controller's family from its maker: Nintendo's 057e, Microsoft's 045e,
  // Sony's 054c; any other is drawn and labelled as an Xbox pad, the layout
  // most makers copy.
  const FAMILY = { '057e': 'nintendo', '045e': 'xbox', '054c': 'ps' };
  function of(gamepad) {
    const id = gamepad?.id ?? '';
    const m = id.match(/Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i) ?? id.match(/^([0-9a-f]{4})-([0-9a-f]{4})-/i);
    const vendor = m?.[1].toLowerCase() ?? null, product = m?.[2].toLowerCase() ?? null;
    const name = id.replace(/\s*\(.*\)\s*$/, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim() || 'Controller';
    return { id: vendor && product ? `${vendor}:${product}` : null, vendor, product, name, family: FAMILY[vendor] ?? 'xbox' };
  }

  // Each physical control as printed on each family.
  const PRINTED = {
    nintendo: { south: 'B', east: 'A', west: 'Y', north: 'X', l: 'L', r: 'R', zl: 'ZL', zr: 'ZR', minus: '−', plus: '+' },
    xbox: { south: 'A', east: 'B', west: 'X', north: 'Y', l: 'LB', r: 'RB', zl: 'LT', zr: 'RT', minus: 'View', plus: 'Menu' },
    ps: { south: '✕', east: '○', west: '□', north: '△', l: 'L1', r: 'R1', zl: 'L2', zr: 'R2', minus: 'Create', plus: 'Options' },
  };

  // SDL's button order, which SDL 3 and SDL 2's controller drivers share: by
  // position, except that SDL 2 numbers a Nintendo pad's face buttons by
  // their labels, A first.
  const SDL = ['south', 'east', 'west', 'north', 'minus', 'home', 'plus', 'l3', 'r3', 'l', 'r', 'up', 'down', 'left', 'right'];
  const LABELLED = { south: 'east', east: 'south', west: 'north', north: 'west' };
  const sdl3 = i => SDL[i] ?? null;
  const sdl2 = (i, family) => { const c = SDL[i] ?? null; return family === 'nintendo' ? LABELLED[c] ?? c : c; };
  // SDL's axes: the left stick, the right stick, then the two triggers.
  const AXIS = ['ls', 'ls', 'rs', 'rs', 'zl', 'zr'];
  // A hat's directions, as SDL numbers them.
  const HAT = { 1: 'up', 2: 'right', 4: 'down', 8: 'left' };
  // SDL's names for its controls, as PCSX2, DuckStation and Dolphin write
  // them: positional, A being the bottom button.
  const NAMED = {
    facesouth: 'south', faceeast: 'east', facewest: 'west', facenorth: 'north', a: 'south', b: 'east', x: 'west', y: 'north',
    back: 'minus', start: 'plus', guide: 'home', leftstick: 'l3', rightstick: 'r3', leftshoulder: 'l', rightshoulder: 'r',
    dpadup: 'up', dpaddown: 'down', dpadleft: 'left', dpadright: 'right', lefttrigger: 'zl', righttrigger: 'zr',
    leftx: 'ls', lefty: 'ls', rightx: 'rs', righty: 'rs',
  };
  const named = s => NAMED[String(s).replace(/^[+-]/, '').toLowerCase()] ?? null;

  // An SDL GUID's maker and product, which it holds little-endian at bytes 4
  // and 8.
  const fromGuid = guid => {
    const g = String(guid).toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(g)) return null;
    return { vendor: g.slice(10, 12) + g.slice(8, 10), product: g.slice(18, 20) + g.slice(16, 18) };
  };

  // `key = value` files, by section, values unquoted.
  function ini(text) {
    const out = {};
    let section = out[''] = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line[0] === ';' || line[0] === '#') continue;
      const head = line.match(/^\[(.+)\]$/);
      if (head) { section = out[head[1]] ??= {}; continue; }
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      section[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    }
    return out;
  }
  const text = bytes => new TextDecoder().decode(bytes).replace(/^﻿/, '');

  // A map is each physical control and what it does on the console. Several
  // directions that do one thing, such as the four of the D-pad, are kept as
  // one control.
  function mapOf(pairs) {
    const map = {};
    for (const [control, does] of pairs) {
      if (!control || !does) continue;
      const at = ['up', 'down', 'left', 'right'].includes(control) ? 'dpad' : control;
      (map[at] ??= new Set()).add(does);
    }
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v].join(' · ')]));
  }

  // Each emulator's reader: its files by their path in its folder, what
  // player 1 is bound to, and its map for one console.
  const READERS = {
    'Mesen 2': {
      files: ['settings.json'],
      read(f, system) {
        const s = JSON.parse(f['settings.json']);
        const port = s[system === 'nes' ? 'Nes' : 'Snes']?.Port1;
        // Apple's GameController, by position, numbered from 0x1000 for the
        // first controller; 16 to 23 are the sticks' directions.
        const APPLE = ['south', 'east', 'west', 'north', 'l', 'r', 'plus', 'minus', 'up', 'down', 'left', 'right', 'zl', 'zr', 'l3', 'r3',
          'ls', 'ls', 'ls', 'ls', 'rs', 'rs', 'rs', 'rs'];
        const pairs = [];
        for (const k of ['Mapping1', 'Mapping2', 'Mapping3', 'Mapping4']) {
          for (const [button, code] of Object.entries(port?.[k] ?? {})) {
            if (typeof code !== 'number' || code < 0x1000 || code > 0x10ff) continue;
            const does = { Up: 'D-pad', Down: 'D-pad', Left: 'D-pad', Right: 'D-pad' }[button] ?? button;
            if (['A', 'B', 'X', 'Y', 'L', 'R', 'Start', 'Select', 'Up', 'Down', 'Left', 'Right'].includes(button)) pairs.push([APPLE[code - 0x1000], does]);
          }
        }
        return { bound: pairs.length ? { first: true } : null, map: mapOf(pairs) };
      },
    },
    mGBA: {
      files: ['config.ini'],
      read(f, system, family) {
        const s = ini(f['config.ini'])['gba.input.SDLB'] ?? {};
        const pairs = [];
        for (const [key, does] of [['keyA', 'A'], ['keyB', 'B'], ['keyL', 'L'], ['keyR', 'R'], ['keyStart', 'Start'], ['keySelect', 'Select'],
          ['keyUp', 'D-pad'], ['keyDown', 'D-pad'], ['keyLeft', 'D-pad'], ['keyRight', 'D-pad']]) {
          if (s[key] != null && s[key] !== '-1') pairs.push([sdl2(Number(s[key]), family), does]);
        }
        if (s.axisLeftAxis || s.axisUpAxis) pairs.push(['ls', 'D-pad']);
        return { bound: s.device0 ? fromGuid(s.device0) : null, map: mapOf(pairs) };
      },
    },
    melonDS: {
      files: ['melonDS.toml'],
      read(f, system, family) {
        const s = ini(f['melonDS.toml'])['Instance0.Joystick'] ?? {};
        const pairs = [];
        for (const key of ['A', 'B', 'X', 'Y', 'L', 'R', 'Select', 'Start', 'Up', 'Down', 'Left', 'Right']) {
          const v = Number(s[key]);
          if (!(v >= 0)) continue;
          const does = ['Up', 'Down', 'Left', 'Right'].includes(key) ? 'D-pad' : key;
          // A button is its number; a hat direction has 0x100 set, the
          // direction in its low four bits; an axis has 0x10000 set, its
          // number in bits 24 to 27.
          if (v & 0x10000) pairs.push([AXIS[(v >> 24) & 0xf], does]);
          else if (v & 0x100) pairs.push([HAT[v & 0xf], does]);
          else pairs.push([sdl2(v, family), does]);
        }
        return { bound: pairs.length ? { first: true } : null, map: mapOf(pairs) };
      },
    },
    Azahar: {
      files: ['config/qt-config.ini'],
      read(f, system, family) {
        const c = ini(f['config/qt-config.ini']).Controls ?? {};
        const n = Number(c.profile ?? 0) + 1;
        const at = key => c[`profiles\\${n}\\${key}`] ?? '';
        const parts = v => Object.fromEntries(v.split(',').map(p => p.split(':')).filter(p => p.length === 2));
        let bound = null;
        const pairs = [];
        for (const [key, does] of [['button_a', 'A'], ['button_b', 'B'], ['button_x', 'X'], ['button_y', 'Y'], ['button_l', 'L'], ['button_r', 'R'],
          ['button_zl', 'ZL'], ['button_zr', 'ZR'], ['button_start', 'Start'], ['button_select', 'Select'], ['button_home', 'Home'],
          ['button_up', 'D-pad'], ['button_down', 'D-pad'], ['button_left', 'D-pad'], ['button_right', 'D-pad'], ['circle_pad', 'Circle Pad'], ['c_stick', 'C-Stick']]) {
          const p = parts(at(key).replace(/\$0/g, ':').replace(/\$1/g, ','));
          if (p.engine !== 'sdl') continue;
          bound ??= p.guid ? fromGuid(p.guid) : null;
          if (p.axis_x != null) pairs.push([AXIS[Number(p.axis_x)], does]);
          else if (p.axis != null) pairs.push([AXIS[Number(p.axis)], does]);
          else if (p.hat != null) pairs.push([{ up: 'up', down: 'down', left: 'left', right: 'right' }[p.direction], does]);
          else if (p.button != null) pairs.push([sdl2(Number(p.button), family), does]);
        }
        return { bound, map: mapOf(pairs) };
      },
    },
    Gopher64: {
      files: ['config.json'],
      read(f) {
        const input = JSON.parse(f['config.json']).input ?? {};
        const profile = input.input_profiles?.[input.input_profile_binding?.[0]];
        if (!input.controller_enabled?.[0] || !profile || !input.controller_assignment?.[0]) return { bound: null, map: {} };
        // Its slots in order, as its input_profile.rs numbers them.
        const SLOTS = ['D-pad', 'D-pad', 'D-pad', 'D-pad', 'Start', 'Z', 'B', 'A', 'C buttons', 'C buttons', 'C buttons', 'C buttons',
          'R', 'L', 'Stick', 'Stick', 'Stick', 'Stick', 'Gopher64 menu'];
        const pairs = (profile.inputs ?? []).map(([input], i) => {
          if (!input) return null;
          const [kind, v] = Object.entries(input)[0] ?? [];
          if (kind === 'JoystickButton' || kind === 'ControllerButton') return [sdl3(v.id), SLOTS[i]];
          if (kind === 'JoystickHat') return [HAT[v.direction], SLOTS[i]];
          if (kind === 'JoystickAxis' || kind === 'ControllerAxis') return [AXIS[v.id], SLOTS[i]];
          return null;
        }).filter(Boolean);
        return { bound: { first: true }, map: mapOf(pairs) };
      },
    },
    DuckStation: { files: ['settings.ini'], read: (f, system) => sdlPad(ini(f['settings.ini']).Pad1) },
    PCSX2: { files: ['inis/PCSX2.ini'], read: (f, system) => sdlPad(ini(f['inis/PCSX2.ini']).Pad1) },
    Dolphin: {
      files: ['Config/Dolphin.ini', 'Config/GCPadNew.ini', 'Config/WiimoteNew.ini'],
      read(f, system) {
        if (system === 'gc') {
          const port = ini(f['Config/Dolphin.ini']).Core?.SIDevice0;
          const pad = ini(f['Config/GCPadNew.ini']).GCPad1 ?? {};
          const problem = port != null && port !== '6' ? 'Port 1 is not set to a GameCube controller in Dolphin.' : null;
          return { ...dolphin(pad, { 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/X': 'X', 'Buttons/Y': 'Y', 'Buttons/Z': 'Z', 'Buttons/Start': 'Start',
            'Triggers/L': 'L', 'Triggers/R': 'R', 'Main Stick/Up': 'Stick', 'C-Stick/Up': 'C-Stick',
            'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad' }), problem };
        }
        const mote = ini(f['Config/WiimoteNew.ini']).Wiimote1 ?? {};
        const nunchuk = mote.Extension === 'Nunchuk';
        return dolphin(mote, { 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/1': '1', 'Buttons/2': '2', 'Buttons/-': '−', 'Buttons/+': '+', 'Buttons/Home': 'Home',
          'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad', 'IR/Up': 'Pointer', 'Shake/X': 'Shake',
          ...(nunchuk ? { 'Nunchuk/Buttons/C': 'Nunchuk C', 'Nunchuk/Buttons/Z': 'Nunchuk Z', 'Nunchuk/Stick/Up': 'Nunchuk stick' } : {}) });
      },
    },
    Cemu: {
      files: ['controllerProfiles/controller0.xml'],
      read(f) {
        const doc = new DOMParser().parseFromString(f['controllerProfiles/controller0.xml'], 'application/xml');
        const type = doc.querySelector('emulated_controller > type')?.textContent;
        const uuid = doc.querySelector('controller > uuid')?.textContent ?? '';
        const api = doc.querySelector('controller > api')?.textContent;
        if (api !== 'SDLController') return { bound: null, map: {} };
        // What each of the GamePad's buttons is, by Cemu's numbers.
        const GAMEPAD = [null, 'A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '+', '−', 'D-pad', 'D-pad', 'D-pad', 'D-pad', 'Press', 'Press',
          'Left stick', 'Left stick', 'Left stick', 'Left stick', 'Right stick', 'Right stick', 'Right stick', 'Right stick', 'Blow mic', 'Show screen', 'Home'];
        // Cemu's controls: SDL 3's buttons, then its D-pad again, then each
        // axis's two directions.
        const control = b => b < 15 ? sdl3(b) : b >= 34 && b <= 37 ? ['up', 'down', 'left', 'right'][b - 34]
          : b >= 38 ? ['ls', 'ls', 'rs', 'rs', 'zl', 'zr'][(b - 38) % 6] : null;
        const pairs = [...doc.querySelectorAll('mappings > entry')].map(e => [control(Number(e.querySelector('button')?.textContent)),
          GAMEPAD[Number(e.querySelector('mapping')?.textContent)]]);
        return { bound: fromGuid(uuid.split('_')[1] ?? ''), map: mapOf(pairs), problem: type && type !== 'Wii U GamePad' ? `Controller 1 is set as a ${type} in Cemu.` : null };
      },
    },
    Ryujinx: {
      files: ['Config.json'],
      read(f, system, family) {
        const config = JSON.parse(f['Config.json']).input_config?.find(c => c.player_index === 'Player1');
        if (!config || !String(config.backend).startsWith('Gamepad')) return { bound: null, map: {} };
        // Its id is an SDL GUID written as a .NET Guid; SDL 2's keeps the
        // maker's and product's bytes as SDL holds them, SDL 3's swaps the
        // maker's.
        const g = String(config.id).split('-').slice(1);
        const swap = s => s.slice(2, 4) + s.slice(0, 2);
        const sdl2nd = config.backend === 'GamepadSDL2';
        const bound = g.length === 5 ? { vendor: sdl2nd ? g[1] : swap(g[1]), product: swap(g[3]) } : null;
        const button = id => {
          // It writes − and + as Back and Start, the names it gives them too.
          const n = { A: 0, B: 1, X: 2, Y: 3, Minus: 4, Back: 4, Guide: 5, Plus: 6, Start: 6, LeftStick: 7, RightStick: 8, LeftShoulder: 9, RightShoulder: 10,
            DpadUp: 11, DpadDown: 12, DpadLeft: 13, DpadRight: 14 }[id];
          if (n != null) return sdl2nd ? sdl2(n, family) : sdl3(n);
          return { LeftTrigger: 'zl', RightTrigger: 'zr' }[id] ?? null;
        };
        const l = config.left_joycon ?? {}, r = config.right_joycon ?? {};
        const pairs = [[button(r.button_a), 'A'], [button(r.button_b), 'B'], [button(r.button_x), 'X'], [button(r.button_y), 'Y'],
          [button(l.button_l), 'L'], [button(r.button_r), 'R'], [button(l.button_zl), 'ZL'], [button(r.button_zr), 'ZR'],
          [button(l.button_minus), '−'], [button(r.button_plus), '+'], [button(l.dpad_up), 'D-pad'], [button(l.dpad_down), 'D-pad'],
          [button(l.dpad_left), 'D-pad'], [button(l.dpad_right), 'D-pad'],
          [{ Left: 'ls', Right: 'rs' }[config.left_joycon_stick?.joystick], 'Left stick'], [{ Left: 'ls', Right: 'rs' }[config.right_joycon_stick?.joystick], 'Right stick'],
          [button(config.left_joycon_stick?.stick_button), 'Press'], [button(config.right_joycon_stick?.stick_button), 'Press']];
        return { bound, map: mapOf(pairs) };
      },
    },
    xemu: {
      files: ['xemu.toml'],
      read(f) {
        const guid = f['xemu.toml'].match(/^\s*port1\s*=\s*['"]([0-9a-f]{32})['"]/m)?.[1];
        // xemu's own layout, by position: White on LB, Black on RB.
        const map = { south: 'A', east: 'B', west: 'X', north: 'Y', l: 'White', r: 'Black', zl: 'Left trigger', zr: 'Right trigger',
          minus: 'Back', plus: 'Start', dpad: 'D-pad', ls: 'Left stick', rs: 'Right stick', l3: 'Press', r3: 'Press' };
        return { bound: guid ? fromGuid(guid) : null, map: guid ? map : {} };
      },
    },
  };

  // PCSX2's and DuckStation's player 1, each button an SDL name on the first
  // controller, `SDL-0/FaceSouth` or `SDL-0/A`.
  function sdlPad(pad = {}) {
    const PS = { Cross: '✕', Circle: '○', Square: '□', Triangle: '△', L1: 'L1', R1: 'R1', L2: 'L2', R2: 'R2', L3: 'L3', R3: 'R3', Select: 'Select', Start: 'Start',
      Up: 'D-pad', Down: 'D-pad', Left: 'D-pad', Right: 'D-pad', LUp: 'Left stick', RUp: 'Right stick', Analog: 'Analog' };
    const pairs = [];
    let first = false;
    for (const [key, does] of Object.entries(PS)) {
      const m = String(pad[key] ?? '').match(/^SDL-(\d+)\/(.+)$/);
      if (!m) continue;
      first ||= m[1] === '0';
      pairs.push([named(m[2]), does]);
    }
    return { bound: first ? { first: true } : null, map: mapOf(pairs) };
  }

  // Dolphin's player 1: its device by name, and each input an SDL name in
  // backticks, `Button S`, `Shoulder L`, `Left Y+`, or a bare one, Start.
  function dolphin(section, wanted) {
    const DOLPHIN = { 'button s': 'south', 'button e': 'east', 'button w': 'west', 'button n': 'north', 'shoulder l': 'l', 'shoulder r': 'r',
      'trigger l': 'zl', 'trigger r': 'zr', back: 'minus', start: 'plus', guide: 'home', 'thumb l': 'l3', 'thumb r': 'r3',
      'pad n': 'up', 'pad s': 'down', 'pad w': 'left', 'pad e': 'right' };
    const control = v => {
      const name = (String(v).match(/`([^`]+)`/)?.[1] ?? String(v).split(/[|&]/)[0]).trim().toLowerCase();
      if (/^left [xy]/.test(name)) return 'ls';
      if (/^right [xy]/.test(name)) return 'rs';
      return DOLPHIN[name] ?? null;
    };
    const pairs = Object.entries(wanted).map(([key, does]) => [section[key] ? control(section[key]) : null, does]);
    const device = String(section.Device ?? '');
    const sdl = device.startsWith('SDL/');
    const name = device.split('/').slice(2).join('/');
    const vendor = /nintendo|pro controller/i.test(name) ? '057e' : /xbox/i.test(name) ? '045e' : /dualsense|dualshock|playstation/i.test(name) ? '054c' : null;
    return { bound: sdl ? { name, vendor } : null, map: sdl ? mapOf(pairs) : {} };
  }

  // The chosen console's emulator's player 1, read now: { emulator, bound,
  // map, problem }, or null where its emulator is not one this reads.
  async function read(system, helper, family) {
    const emulator = (await R.emulators?.())?.systems?.[system]?.emulator;
    const reader = READERS[emulator];
    if (!reader || !helper) return null;
    const f = {};
    for (const rel of reader.files) {
      try { f[rel] = text(await helper.setting(emulator, rel)); } catch { return { emulator, bound: null, map: {}, problem: `${emulator} has no controller settings on this Mac yet.` }; }
    }
    try { return { emulator, problem: null, ...reader.read(f, system, family) }; } catch (error) {
      console.error(error);
      return { emulator, bound: null, map: {}, problem: `Emu could not read ${emulator}'s controller settings.` };
    }
  }

  // Whether an emulator's player 1 is the connected controller: bound to the
  // first controller, or to this one's maker and product.
  const matches = (bound, pad) => Boolean(bound && Object.keys(bound).length && (bound.first
    || (bound.vendor && bound.vendor === pad.vendor && (!bound.product || bound.product === pad.product))));

  // THE DRAWING. A Pro or Xbox pad has its left stick high and its D-pad
  // low; a PlayStation pad its sticks low and level. Labels go on the side
  // of their control.
  const PLACES = {
    offset: { ls: [248, 140], dpad: [280, 204], rs: [370, 212], face: [404, 144] },
    level: { ls: [262, 206], dpad: [250, 140], rs: [378, 206], face: [404, 140] },
  };
  function draw(family, map) {
    const at = PLACES[family === 'ps' ? 'level' : 'offset'];
    const printed = PRINTED[family];
    const [fx, fy] = at.face;
    const controls = [
      { k: 'zl', p: printed.zl, x: 214, y: 30, side: 'L', ly: 28, shape: 'trig' },
      { k: 'l', p: printed.l, x: 214, y: 52, side: 'L', ly: 58, shape: 'bump' },
      { k: 'minus', p: printed.minus, x: 284, y: 108, side: 'L', ly: 98, shape: 'small' },
      { k: 'ls', p: 'Left stick', x: at.ls[0], y: at.ls[1], side: 'L', ly: family === 'ps' ? 214 : 140, shape: 'stick' },
      { k: 'dpad', p: 'D-pad', x: at.dpad[0], y: at.dpad[1], side: 'L', ly: family === 'ps' ? 140 : 214, shape: 'dpad' },
      { k: 'zr', p: printed.zr, x: 426, y: 30, side: 'R', ly: 28, shape: 'trig' },
      { k: 'r', p: printed.r, x: 426, y: 52, side: 'R', ly: 58, shape: 'bump' },
      { k: 'plus', p: printed.plus, x: 356, y: 108, side: 'R', ly: 98, shape: 'small' },
      { k: 'north', p: printed.north, x: fx, y: fy - 24, side: 'R', ly: 128, shape: 'face' },
      { k: 'east', p: printed.east, x: fx + 24, y: fy, side: 'R', ly: 158, shape: 'face' },
      { k: 'west', p: printed.west, x: fx - 24, y: fy, side: 'R', ly: 188, shape: 'face' },
      { k: 'south', p: printed.south, x: fx, y: fy + 24, side: 'R', ly: 218, shape: 'face' },
      { k: 'rs', p: 'Right stick', x: at.rs[0], y: at.rs[1], side: 'R', ly: 248, shape: 'stick' },
    ];
    // A stick's press is said with the stick.
    const does = c => [map[c.k], c.k === 'ls' ? map.l3 : c.k === 'rs' ? map.r3 : null].filter(Boolean).join(' · ');
    const part = (c, used) => {
      const cls = `emu-padmap__part${used ? '' : ' emu-padmap__part--unused'}`;
      switch (c.shape) {
        case 'trig': return `<rect class="${cls}" x="${c.x - 34}" y="${c.y - 10}" width="68" height="20" rx="10"/>`;
        case 'bump': return `<rect class="${cls}" x="${c.x - 40}" y="${c.y - 7}" width="80" height="14" rx="7"/>`;
        case 'small': return `<circle class="${cls}" cx="${c.x}" cy="${c.y}" r="10"/>${symbol(c)}`;
        case 'stick': return `<circle class="${cls}" cx="${c.x}" cy="${c.y}" r="22"/><circle class="${cls}" cx="${c.x}" cy="${c.y}" r="13"/>`;
        case 'dpad': return `<path class="${cls}" d="M${c.x - 8} ${c.y - 26} h16 v18 h18 v16 h-18 v18 h-16 v-18 h-18 v-16 h18 z"/>`;
        default: return `<circle class="${cls}" cx="${c.x}" cy="${c.y}" r="12"/><text class="emu-padmap__glyph" x="${c.x}" y="${c.y}">${c.p}</text>`;
      }
    };
    // The small middle buttons' symbols, as each family prints them: Nintendo's
    // minus and plus, Xbox's View and Menu, PlayStation's Create and Options.
    const symbol = c => {
      const [x, y] = [c.x, c.y], line = d => `<path class="emu-padmap__symbol" d="${d}"/>`;
      const bars = line(`M${x - 4} ${y - 3} h8 M${x - 4} ${y} h8 M${x - 4} ${y + 3} h8`);
      if (family === 'nintendo') return line(c.k === 'minus' ? `M${x - 4} ${y} h8` : `M${x - 4} ${y} h8 M${x} ${y - 4} v8`);
      if (family === 'xbox') return c.k === 'minus' ? line(`M${x - 4} ${y - 1} h5 v5 h-5 z M${x - 1} ${y - 4} h5 v5`) : bars;
      return c.k === 'minus' ? line(`M${x - 3} ${y - 4} v8 M${x} ${y - 4} v8 M${x + 3} ${y - 4} v8`) : bars;
    };
    const reach = { bump: 40, trig: 34, stick: 22, dpad: 26, small: 10, face: 12 };
    const label = c => {
      const left = c.side === 'L', said = does(c);
      const chipW = c.p.length > 2 ? 18 + c.p.length * 6 : 26;
      const chipX = left ? 112 : 528;
      const from = c.x + (left ? -1 : 1) * reach[c.shape];
      const textX = left ? chipX - chipW / 2 - 8 : chipX + chipW / 2 + 8;
      return `<path class="emu-padmap__lead" d="M${from} ${c.y} L${left ? 150 : 490} ${c.ly} L${left ? chipX + chipW / 2 : chipX - chipW / 2} ${c.ly}"/>`
        + `<rect class="emu-padmap__chip" x="${chipX - chipW / 2}" y="${c.ly - 10}" width="${chipW}" height="20" rx="4"/>`
        + `<text class="emu-padmap__chip-text" x="${chipX}" y="${c.ly}">${c.p}</text>`
        + `<text class="${said ? 'emu-padmap__does' : 'emu-padmap__none'}" x="${textX}" y="${c.ly}" text-anchor="${left ? 'end' : 'start'}">${escape(said || 'not used')}</text>`;
    };
    const body = '<path class="emu-padmap__body" d="M228 62 H412 C470 62 500 110 506 170 C512 236 494 300 462 304 C440 306 424 290 410 266 L392 240 H248 L230 266 C216 290 200 306 178 304 C146 300 128 236 134 170 C140 110 170 62 228 62 Z"/>';
    return `<svg class="emu-padmap" viewBox="0 0 800 330" role="img" aria-label="Each button and what it does"><g transform="translate(80 0)">${body}`
      + `${controls.map(c => part(c, Boolean(does(c)))).join('')}${controls.map(label).join('')}</g></svg>`;
  }
  const escape = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  R.pads = { of, read, matches, draw, PRINTED, _readers: READERS };
})();
