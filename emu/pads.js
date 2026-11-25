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
   `R.pads.draw(family, map, model)` draws the controller's front with each
   control labelled as printed and what it does beside it, and
   `R.pads.drawBack(model, copies, map)` the back buttons of a model that has
   them, each with the button it copies, learnt by pressing it.
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
    return { id: vendor && product ? `${vendor}:${product}` : null, index: gamepad?.index ?? 0, vendor, product, name, family: FAMILY[vendor] ?? 'xbox' };
  }

  // Each physical control as printed on each family.
  const PRINTED = {
    nintendo: { south: 'B', east: 'A', west: 'Y', north: 'X', l: 'L', r: 'R', zl: 'ZL', zr: 'ZR', minus: '−', plus: '+', home: 'Home', capture: 'Capture', l3: 'L stick press', r3: 'R stick press' },
    xbox: { south: 'A', east: 'B', west: 'X', north: 'Y', l: 'LB', r: 'RB', zl: 'LT', zr: 'RT', minus: 'View', plus: 'Menu', home: 'Xbox', capture: 'Share', l3: 'LS press', r3: 'RS press' },
    ps: { south: '✕', east: '○', west: '□', north: '△', l: 'L1', r: 'R1', zl: 'L2', zr: 'R2', minus: 'Create', plus: 'Options', home: 'PS', l3: 'L3', r3: 'R3' },
  };
  // Controllers drawn as themselves, chosen in the map: their own labels, the
  // back buttons that copy another button, which only a press can tell, and
  // the buttons the controller keeps for itself. The Ultimate 2 Bluetooth's
  // are its manual's.
  const MODELS = {
    ultimate2: {
      name: '8BitDo Ultimate 2 Bluetooth', family: 'nintendo',
      printed: { l: 'L1', r: 'R1', zl: 'L2', zr: 'R2', capture: 'Square', l3: 'LSB', r3: 'RSB' },
      back: { l4: 'L4', r4: 'R4', pl: 'PL', pr: 'PR' },
      own: { star: ['Star', 'turbo and lights'], profile: ['Profile', 'its profiles'] },
    },
  };
  // A press as Chrome's standard layout numbers it, by position.
  const CHROME = ['south', 'east', 'west', 'north', 'l', 'r', 'zl', 'zr', 'minus', 'plus', 'l3', 'r3', 'up', 'down', 'left', 'right', 'home', 'capture'];

  // SDL's button order, which SDL 3 and SDL 2's controller drivers share,
  // 15 being Capture: by position, except that SDL 2 numbers a Nintendo pad's face buttons by
  // their labels, A first.
  const SDL = ['south', 'east', 'west', 'north', 'minus', 'home', 'plus', 'l3', 'r3', 'l', 'r', 'up', 'down', 'left', 'right', 'capture'];
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
  const text = bytes => new TextDecoder().decode(bytes).replace(/^\uFEFF/, '');

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
      files: ['settings.json'], players: 2,
      read(f, system, family, player) {
        const s = JSON.parse(f['settings.json']);
        const port = s[system === 'nes' ? 'Nes' : 'Snes']?.[`Port${player}`];
        // Apple's GameController, by position, numbered from 0x1000 for the
        // first controller and 0x100 on for each next; 16 to 23 are the
        // sticks' directions.
        const base = 0x1000 + (player - 1) * 0x100;
        const APPLE = ['south', 'east', 'west', 'north', 'l', 'r', 'plus', 'minus', 'up', 'down', 'left', 'right', 'zl', 'zr', 'l3', 'r3',
          'ls', 'ls', 'ls', 'ls', 'rs', 'rs', 'rs', 'rs'];
        const pairs = [];
        for (const k of ['Mapping1', 'Mapping2', 'Mapping3', 'Mapping4']) {
          for (const [button, code] of Object.entries(port?.[k] ?? {})) {
            if (typeof code !== 'number' || code < base || code > base + 0xff) continue;
            const does = { Up: 'D-pad', Down: 'D-pad', Left: 'D-pad', Right: 'D-pad' }[button] ?? button;
            if (['A', 'B', 'X', 'Y', 'L', 'R', 'Start', 'Select', 'Up', 'Down', 'Left', 'Right'].includes(button)) pairs.push([APPLE[code - base], does]);
          }
        }
        return { bound: pairs.length ? { index: player - 1 } : null, map: mapOf(pairs) };
      },
    },
    mGBA: {
      files: ['config.ini'], players: 1,
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
      files: ['melonDS.toml'], players: 1,
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
        return { bound: pairs.length ? { index: Number(ini(f['melonDS.toml']).Instance0?.JoystickID ?? 0) } : null, map: mapOf(pairs) };
      },
    },
    Azahar: {
      files: ['config/qt-config.ini'], players: 1,
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
        const motion = /engine(\$0|:)sdl/.test(at('motion_device'));
        return { bound, map: mapOf(pairs), motion };
      },
    },
    Gopher64: {
      files: ['config.json'], players: 4,
      read(f, system, family, player) {
        const input = JSON.parse(f['config.json']).input ?? {};
        const at = player - 1;
        const profile = input.input_profiles?.[input.input_profile_binding?.[at]];
        if (!input.controller_enabled?.[at] || !profile || !input.controller_assignment?.[at]) return { bound: null, map: {} };
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
        return { bound: { index: at }, map: mapOf(pairs) };
      },
    },
    DuckStation: { files: ['settings.ini'], players: 2, read: (f, system, family, player) => sdlPad(ini(f['settings.ini'])[`Pad${player}`]) },
    PCSX2: { files: ['inis/PCSX2.ini'], players: 2, read: (f, system, family, player) => sdlPad(ini(f['inis/PCSX2.ini'])[`Pad${player}`]) },
    Dolphin: {
      files: ['Config/Dolphin.ini', 'Config/GCPadNew.ini', 'Config/WiimoteNew.ini'], players: 4,
      read(f, system, family, player) {
        if (system === 'gc') {
          const port = ini(f['Config/Dolphin.ini']).Core?.[`SIDevice${player - 1}`];
          if (port == null || port === '0') return { bound: null, map: {} };
          const pad = ini(f['Config/GCPadNew.ini'])[`GCPad${player}`] ?? {};
          const problem = port !== '6' ? `Port ${player} is not set to a GameCube controller in Dolphin.` : null;
          return { ...dolphin(pad, { 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/X': 'X', 'Buttons/Y': 'Y', 'Buttons/Z': 'Z', 'Buttons/Start': 'Start',
            'Triggers/L': 'L', 'Triggers/R': 'R', 'Main Stick/Up': 'Stick', 'C-Stick/Up': 'C-Stick',
            'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad' }), problem };
        }
        // Wii Remote 1 is emulated unless said otherwise, the others off.
        const mote = ini(f['Config/WiimoteNew.ini'])[`Wiimote${player}`] ?? {};
        if ((mote.Source ?? (player === 1 ? '1' : '0')) !== '1') return { bound: null, map: {} };
        const nunchuk = mote.Extension === 'Nunchuk';
        const motion = Object.keys(mote).some(k => /^IMU(Gyroscope|Accelerometer)\//.test(k) && mote[k]);
        return { ...dolphin(mote, { 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/1': '1', 'Buttons/2': '2', 'Buttons/-': '−', 'Buttons/+': '+', 'Buttons/Home': 'Home',
          'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad', 'IR/Up': 'Pointer', 'Shake/X': 'Shake',
          ...(nunchuk ? { 'Nunchuk/Buttons/C': 'Nunchuk C', 'Nunchuk/Buttons/Z': 'Nunchuk Z', 'Nunchuk/Stick/Up': 'Nunchuk stick' } : {}) }), motion };
      },
    },
    Cemu: {
      files: [0, 1, 2, 3].map(n => `controllerProfiles/controller${n}.xml`), players: 4,
      read(f, system, family, player) {
        const xml = f[`controllerProfiles/controller${player - 1}.xml`];
        if (!xml) return { bound: null, map: {} };
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const type = doc.querySelector('emulated_controller > type')?.textContent;
        const uuid = doc.querySelector('controller > uuid')?.textContent ?? '';
        const api = doc.querySelector('controller > api')?.textContent;
        if (api !== 'SDLController') return { bound: null, map: {} };
        // What each of the GamePad's buttons is, by Cemu's numbers.
        const STICKS = ['Left stick', 'Left stick', 'Left stick', 'Left stick', 'Right stick', 'Right stick', 'Right stick', 'Right stick'];
        const GAMEPAD = [null, 'A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '+', '−', 'D-pad', 'D-pad', 'D-pad', 'D-pad', 'Press', 'Press',
          ...STICKS, 'Blow mic', 'Show screen', 'Home'];
        // A Pro Controller, Cemu's players 2 to 4, numbers its buttons another way.
        const PRO = [null, 'A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '+', '−', 'Home', 'D-pad', 'D-pad', 'D-pad', 'D-pad', 'Press', 'Press', ...STICKS];
        const names = type === 'Wii U Pro Controller' ? PRO : GAMEPAD;
        // Cemu's controls: SDL 3's buttons, then its D-pad again, then each
        // axis's two directions.
        const control = b => b < 15 ? sdl3(b) : b >= 34 && b <= 37 ? ['up', 'down', 'left', 'right'][b - 34]
          : b >= 38 ? ['ls', 'ls', 'rs', 'rs', 'zl', 'zr'][(b - 38) % 6] : null;
        const pairs = [...doc.querySelectorAll('mappings > entry')].map(e => [control(Number(e.querySelector('button')?.textContent)),
          names[Number(e.querySelector('mapping')?.textContent)]]);
        const motion = doc.querySelector('controller > motion')?.textContent === 'true';
        return { bound: fromGuid(uuid.split('_')[1] ?? ''), map: mapOf(pairs), motion, problem: type && !['Wii U GamePad', 'Wii U Pro Controller'].includes(type) ? `Controller ${player} is set as a ${type} in Cemu.` : null };
      },
    },
    Ryujinx: {
      files: ['Config.json'], players: 4,
      read(f, system, family, player) {
        const config = JSON.parse(f['Config.json']).input_config?.find(c => c.player_index === `Player${player}`);
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
        return { bound, map: mapOf(pairs), motion: Boolean(config.motion?.enable_motion) };
      },
    },
    xemu: {
      files: ['xemu.toml'], players: 4,
      read(f, system, family, player) {
        const guid = f['xemu.toml'].match(new RegExp(`^\\s*port${player}\\s*=\\s*['"]([0-9a-f]{32})['"]`, 'm'))?.[1];
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
    let index = null;
    for (const [key, does] of Object.entries(PS)) {
      const m = String(pad[key] ?? '').match(/^SDL-(\d+)\/(.+)$/);
      if (!m) continue;
      index ??= Number(m[1]);
      pairs.push([named(m[2]), does]);
    }
    return { bound: index == null ? null : { index }, map: mapOf(pairs) };
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

  // The chosen console's emulator's players, read now: { emulator, problem,
  // players, most }, `most` being how many players it can have, each player { player, bound, map, motion, problem } where the
  // emulator sets one; or null where its emulator is not one this reads. A
  // file it has not written yet, such as Cemu's for a second controller, is
  // left out.
  async function read(system, helper, family) {
    const emulator = (await R.emulators?.())?.systems?.[system]?.emulator;
    const reader = READERS[emulator];
    if (!reader || !helper) return null;
    const f = {};
    for (const rel of reader.files) {
      try { f[rel] = text(await helper.setting(emulator, rel)); } catch { /* not written yet */ }
    }
    if (!Object.keys(f).length) return { emulator, players: [], problem: `${emulator} has no controller settings on this Mac yet.` };
    try {
      const players = [];
      for (let player = 1; player <= (reader.players ?? 1); player++) {
        const one = reader.read(f, system, family, player);
        if (one?.bound && Object.keys(one.map ?? {}).length) players.push({ player, problem: null, ...one });
        else if (player === 1) players.push({ player, problem: null, ...one });
      }
      return { emulator, problem: null, players, most: reader.players ?? 1 };
    } catch (error) {
      console.error(error);
      return { emulator, players: [], problem: `Emu could not read ${emulator}'s controller settings.` };
    }
  }

  // Which player a connected controller is: the player bound to its maker
  // and product, else the one bound to its place among the connected
  // controllers, counted from 0 as the emulator counts them. Null where none.
  const bindsTo = (bound, pad, place) => Boolean(bound && ((bound.vendor && bound.vendor === pad.vendor && (!bound.product || bound.product === pad.product))
    || (bound.index != null && bound.index === place)));
  const playerOf = (read, pad, place) => read?.players.find(p => p.bound?.vendor && bindsTo(p.bound, pad, place))
    ?? read?.players.find(p => bindsTo(p.bound, pad, place)) ?? null;

  // THE DRAWING. The front: a Pro or Xbox pad has its left stick high and
  // its D-pad low, a PlayStation pad its sticks low and level; each control's
  // label goes on its side, spread evenly down it. The back, for a model with
  // back buttons: each one and the button it copies, and what that does.
  const W = 800, H = 360;
  const BODY = '<path class="emu-padmap__body" d="M228 72 H412 C470 72 500 120 506 180 C512 246 494 310 462 314 C440 316 424 300 410 276 L392 250 H248 L230 276 C216 300 200 316 178 314 C146 310 128 246 134 180 C140 120 170 72 228 72 Z"/>';
  const SHAPES = { trig: 34, bump: 40, stick: 22, press: 9, dpad: 26, small: 10, face: 12, pill: 10 };
  function front(family, model) {
    const level = family === 'ps';
    const ls = level ? [262, 216] : [248, 150], dp = level ? [250, 150] : [280, 214], rs = level ? [378, 216] : [370, 222], f = [404, 152];
    const own = model?.own ?? {};
    const left = [
      { k: 'zl', x: 214, y: 40, shape: 'trig' }, { k: 'l', x: 214, y: 62, shape: 'bump' },
      { k: 'minus', x: 284, y: 112, shape: 'small' }, { k: 'home', x: 320, y: 100, shape: 'small' },
      ...(family === 'nintendo' ? [{ k: 'capture', x: 296, y: 134, shape: 'small' }] : []),
      { k: 'ls', x: ls[0], y: ls[1], shape: 'stick' }, { k: 'l3', x: ls[0], y: ls[1], shape: 'press' },
      { k: 'dpad', x: dp[0], y: dp[1], shape: 'dpad' },
    ];
    const right = [
      { k: 'zr', x: 426, y: 40, shape: 'trig' }, { k: 'r', x: 426, y: 62, shape: 'bump' },
      { k: 'plus', x: 356, y: 112, shape: 'small' },
      ...(own.star ? [{ k: 'star', x: 344, y: 134, shape: 'small' }] : []),
      ...(own.profile ? [{ k: 'profile', x: 320, y: 156, shape: 'pill' }] : []),
      { k: 'north', x: f[0], y: f[1] - 24, shape: 'face' }, { k: 'east', x: f[0] + 24, y: f[1], shape: 'face' },
      { k: 'west', x: f[0] - 24, y: f[1], shape: 'face' }, { k: 'south', x: f[0], y: f[1] + 24, shape: 'face' },
      { k: 'rs', x: rs[0], y: rs[1], shape: 'stick' }, { k: 'r3', x: rs[0], y: rs[1], shape: 'press' },
    ];
    // Labels go in the order their controls sit, top to bottom, so few lines cross.
    const spread = (list, side) => [...list].sort((a, b) => a.y - b.y).map((c, i) => ({ ...c, side, ly: 30 + i * ((H - 60) / (list.length - 1)) }));
    return [...spread(left, 'L'), ...spread(right, 'R')];
  }
  function part(c, used, family) {
    const cls = `emu-padmap__part${used ? '' : ' emu-padmap__part--unused'}`;
    const { x, y } = c;
    switch (c.shape) {
      case 'trig': return `<rect class="${cls}" x="${x - 34}" y="${y - 10}" width="68" height="20" rx="10"/>`;
      case 'bump': return `<rect class="${cls}" x="${x - 40}" y="${y - 7}" width="80" height="14" rx="7"/>`;
      case 'stick': return `<circle class="${cls}" cx="${x}" cy="${y}" r="22"/>`;
      case 'press': return `<circle class="${cls}" cx="${x}" cy="${y}" r="9"/>`;
      case 'dpad': return `<path class="${cls}" d="M${x - 8} ${y - 26} h16 v18 h18 v16 h-18 v18 h-16 v-18 h-18 v-16 h18 z"/>`;
      case 'pill': return `<rect class="${cls}" x="${x - 10}" y="${y - 6}" width="20" height="12" rx="6"/>`;
      case 'small': return `<circle class="${cls}" cx="${x}" cy="${y}" r="10"/>${symbol(c, family)}`;
      default: return `<circle class="${cls}" cx="${x}" cy="${y}" r="12"/><text class="emu-padmap__glyph" x="${x}" y="${y}">${c.p}</text>`;
    }
  }
  // The small buttons' symbols, as each family prints them.
  function symbol(c, family) {
    const { x, y } = c, line = d => `<path class="emu-padmap__symbol" d="${d}"/>`;
    const bars = line(`M${x - 4} ${y - 3} h8 M${x - 4} ${y} h8 M${x - 4} ${y + 3} h8`);
    if (c.k === 'home') return `<circle class="emu-padmap__symbol" cx="${x}" cy="${y}" r="4"/>`;
    if (c.k === 'capture') return line(`M${x - 4} ${y - 4} h8 v8 h-8 z`);
    if (c.k === 'star') return line(`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y - 1.5} L${x + 2} ${y + 1} L${x + 3} ${y + 5} L${x} ${y + 2.5} L${x - 3} ${y + 5} L${x - 2} ${y + 1} L${x - 5} ${y - 1.5} L${x - 1.5} ${y - 1.5} Z`);
    if (family === 'nintendo') return line(c.k === 'minus' ? `M${x - 4} ${y} h8` : `M${x - 4} ${y} h8 M${x} ${y - 4} v8`);
    if (family === 'xbox') return c.k === 'minus' ? line(`M${x - 4} ${y - 1} h5 v5 h-5 z M${x - 1} ${y - 4} h5 v5`) : bars;
    return c.k === 'minus' ? line(`M${x - 3} ${y - 4} v8 M${x} ${y - 4} v8 M${x + 3} ${y - 4} v8`) : bars;
  }
  // One control's leader line, its printed name in a chip, and what it does.
  function label(c, said, kind) {
    const left = c.side === 'L';
    const chipW = c.p.length > 2 ? 18 + c.p.length * 6 : 26;
    const chipX = left ? 112 : 528;
    const from = c.x + (left ? -1 : 1) * SHAPES[c.shape];
    const textX = left ? chipX - chipW / 2 - 8 : chipX + chipW / 2 + 8;
    return `<path class="emu-padmap__lead" d="M${from} ${c.y} L${left ? 150 : 490} ${c.ly} L${left ? chipX + chipW / 2 : chipX - chipW / 2} ${c.ly}"/>`
      + `<rect class="emu-padmap__chip" x="${chipX - chipW / 2}" y="${c.ly - 10}" width="${chipW}" height="20" rx="4"/>`
      + `<text class="emu-padmap__chip-text" x="${chipX}" y="${c.ly}">${escape(c.p)}</text>`
      + `<text class="emu-padmap__${kind}" x="${textX}" y="${c.ly}" text-anchor="${left ? 'end' : 'start'}">${escape(said)}</text>`;
  }
  // The front of a controller, each control labelled with what it does on
  // the console; `model` draws one as itself.
  function draw(family, map, modelKey) {
    const model = MODELS[modelKey] ?? null;
    const printed = { ...PRINTED[family], ...(model?.printed ?? {}), dpad: 'D-pad', ls: 'Left stick', rs: 'Right stick' };
    const controls = front(family, model).map(c => ({ ...c, p: model?.own?.[c.k]?.[0] ?? printed[c.k] ?? c.k }));
    const parts = controls.map(c => part(c, Boolean(map[c.k] || model?.own?.[c.k]), family)).join('');
    const labels = controls.map(c => model?.own?.[c.k] ? label(c, model.own[c.k][1], 'own')
      : label(c, map[c.k] || 'not used', map[c.k] ? 'does' : 'none')).join('');
    return `<svg class="emu-padmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Each button on the front and what it does"><g transform="translate(80 0)">${BODY}${parts}${labels}</g></svg>`;
  }
  // The back of a model with back buttons: each one, the button it copies,
  // and what that does on the console, or that it copies nothing yet.
  function drawBack(modelKey, copies, map) {
    const model = MODELS[modelKey];
    if (!model?.back) return '';
    const printed = { ...PRINTED[model.family], ...model.printed };
    // Seen from behind, the right-hand buttons are on the left.
    const controls = [
      { k: 'r4', x: 228, y: 48, shape: 'bump', side: 'L', ly: 60 }, { k: 'pr', x: 262, y: 210, shape: 'stick', side: 'L', ly: 210 },
      { k: 'l4', x: 412, y: 48, shape: 'bump', side: 'R', ly: 60 }, { k: 'pl', x: 378, y: 210, shape: 'stick', side: 'R', ly: 210 },
    ].map(c => ({ ...c, p: model.back[c.k] }));
    const said = k => copies?.[k] ? `copies ${printed[copies[k]] ?? copies[k]} · ${map[copies[k]] || 'not used'}` : copies && k in copies ? 'copies nothing' : 'press it to learn';
    const parts = controls.map(c => part(c, Boolean(copies?.[c.k]), model.family)).join('');
    const labels = controls.map(c => label(c, said(c.k), copies?.[c.k] ? 'does' : 'none')).join('');
    return `<svg class="emu-padmap" viewBox="0 0 ${W} 300" role="img" aria-label="Each back button and what it copies"><g transform="translate(80 -10)">${BODY}${parts}${labels}</g></svg>`;
  }
  const escape = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // SETTING UP. Emu's layout for each console: which physical control, by
  // position, does each of its buttons. A Nintendo pad's labels and an Xbox
  // pad's positions land on the same places, so one layout serves both.
  const NINTENDO = { A: 'east', B: 'south', X: 'north', Y: 'west', L: 'l', R: 'r', ZL: 'zl', ZR: 'zr', Start: 'plus', Select: 'minus', Home: 'home' };
  const PS_LAYOUT = { Cross: 'south', Circle: 'east', Square: 'west', Triangle: 'north', L1: 'l', R1: 'r', L2: 'zl', R2: 'zr', L3: 'l3', R3: 'r3', Select: 'minus', Start: 'plus' };
  const DIRS = ['up', 'down', 'left', 'right'];
  const APPLE_AT = { south: 0, east: 1, west: 2, north: 3, l: 4, r: 5, plus: 6, minus: 7, up: 8, down: 9, left: 10, right: 11, zl: 12, zr: 13, l3: 14, r3: 15 };
  // SDL's number for a control: SDL 3 by position, SDL 2 a Nintendo pad's
  // face buttons by label.
  const sdl3At = c => SDL.indexOf(c);
  const sdl2At = (c, family) => SDL.indexOf(family === 'nintendo' ? LABELLED[c] ?? c : c);
  // SDL's names, as PCSX2 and Dolphin write them.
  const FACE_NAME = { south: 'FaceSouth', east: 'FaceEast', west: 'FaceWest', north: 'FaceNorth' };
  const SDL_NAME = { minus: 'Back', plus: 'Start', home: 'Guide', l3: 'LeftStick', r3: 'RightStick', l: 'LeftShoulder', r: 'RightShoulder',
    zl: '+LeftTrigger', zr: '+RightTrigger', up: 'DPadUp', down: 'DPadDown', left: 'DPadLeft', right: 'DPadRight' };
  const DUCK_FACE = { south: 'A', east: 'B', west: 'X', north: 'Y' };
  const DOLPHIN_NAME = { south: '`Button S`', east: '`Button E`', west: '`Button W`', north: '`Button N`', l: '`Shoulder L`', r: '`Shoulder R`',
    zl: '`Trigger L`', zr: '`Trigger R`', minus: 'Back', plus: 'Start', home: 'Guide', l3: '`Thumb L`', r3: '`Thumb R`',
    up: '`Pad N`', down: '`Pad S`', left: '`Pad W`', right: '`Pad E`' };

  // A section of a `key = value` file set: `keys` replaced or added in it,
  // every other line kept; with `whole`, its lines replaced. A missing
  // section goes at the end.
  function setSection(text, name, keys, { whole = false, sep = ' = ' } = {}) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let start = lines.findIndex(l => l.trim() === `[${name}]`);
    if (start < 0) { while (lines.length && lines[lines.length - 1] === '') lines.pop(); lines.push('', `[${name}]`); start = lines.length - 1; lines.push(''); }
    let end = lines.findIndex((l, i) => i > start && /^\[.+\]\s*$/.test(l));
    if (end < 0) end = lines.length;
    let body = lines.slice(start + 1, end);
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    if (whole) body = [];
    for (const [k, v] of Object.entries(keys)) {
      const i = body.findIndex(l => l.slice(0, l.indexOf('=')).trim() === k);
      const line = `${k}${sep}${v}`;
      if (i >= 0) body[i] = line; else body.push(line);
    }
    lines.splice(start + 1, end - start - 1, ...body, '');
    return lines.join('\n');
  }

  // Each emulator's writer: the files it changes for one player on one
  // console, from Emu's layout and the controller the helper reports, `pad`
  // { family, name, sdl2, sdl3, sdl2Index, sdl3Index }. Gopher64 is opened
  // instead, since only it can choose a controller.
  const WRITERS = {
    'Mesen 2': (f, system, player, pad) => {
      const raw = f['settings.json'];
      const indent = raw.match(/\{\s*\n( *)/)?.[1].length ?? 2;
      const s = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const console_ = s[system === 'nes' ? 'Nes' : 'Snes'];
      const port = console_[`Port${player}`] ??= JSON.parse(JSON.stringify(console_.Port1));
      port.Type = system === 'nes' ? 'NesController' : 'SnesController';
      const base = 0x1000 + (pad.sdl3Index ?? player - 1) * 0x100;
      const wanted = system === 'nes' ? ['A', 'B', 'Start', 'Select'] : ['A', 'B', 'X', 'Y', 'L', 'R', 'Start', 'Select'];
      const m = port.Mapping1 ??= {};
      for (const k of Object.keys(m)) if (typeof m[k] === 'number' && m[k] >= base && m[k] <= base + 0xff) m[k] = 0;
      for (const k of wanted) m[k] = base + APPLE_AT[NINTENDO[k]];
      for (const d of DIRS) m[d[0].toUpperCase() + d.slice(1)] = base + APPLE_AT[d];
      // The helper hands the file over without its byte-order mark, and Mesen reads it either way.
      return { 'settings.json': JSON.stringify(s, null, indent) };
    },
    mGBA: (f, system, player, pad) => {
      const keys = { keyA: 'east', keyB: 'south', keyL: 'l', keyR: 'r', keyStart: 'plus', keySelect: 'minus', keyUp: 'up', keyDown: 'down', keyLeft: 'left', keyRight: 'right' };
      const values = Object.fromEntries(Object.entries(keys).map(([k, c]) => [k, sdl2At(c, pad.family)]));
      const sticks = { axisLeftAxis: '-0', axisRightAxis: '+0', axisUpAxis: '-1', axisDownAxis: '+1' };
      let text = setSection(f['config.ini'], 'gba.input.SDLB', { ...values, ...sticks, device0: pad.sdl2 }, { sep: '=' });
      // mGBA loads the profile named for a controller when it connects, over its own lines.
      if (pad.name) text = setSection(text, `gba.input-profile.${pad.name}`, { ...values, ...sticks }, { sep: '=' });
      return { 'config.ini': text };
    },
    melonDS: (f, system, player, pad) => {
      const keys = { A: 'east', B: 'south', X: 'north', Y: 'west', L: 'l', R: 'r', Select: 'minus', Start: 'plus', Up: 'up', Down: 'down', Left: 'left', Right: 'right' };
      let text = setSection(f['melonDS.toml'], 'Instance0.Joystick', Object.fromEntries(Object.entries(keys).map(([k, c]) => [k, sdl2At(c, pad.family)])));
      text = setSection(text, 'Instance0', { JoystickID: pad.sdl2Index ?? 0 });
      return { 'melonDS.toml': text };
    },
    Azahar: (f, system, player, pad) => {
      const text = f['config/qt-config.ini'];
      const n = Number(ini(text).Controls?.profile ?? 0) + 1;
      const at = `guid:${pad.sdl2},port:0`;
      const button = c => `"button:${sdl2At(c, pad.family)},engine:sdl,${at}"`;
      const axis = a => `"axis:${a},direction:+,engine:sdl,${at},threshold:0.5"`;
      const keys = {};
      for (const [k, c] of Object.entries({ a: 'east', b: 'south', x: 'north', y: 'west', l: 'l', r: 'r', start: 'plus', select: 'minus', home: 'home',
        up: 'up', down: 'down', left: 'left', right: 'right' })) keys[`profiles\\${n}\\button_${k}`] = button(c);
      keys[`profiles\\${n}\\button_zl`] = axis(4);
      keys[`profiles\\${n}\\button_zr`] = axis(5);
      keys[`profiles\\${n}\\circle_pad`] = `"axis_x:0,axis_y:1,deadzone:0.100000,engine:sdl,${at},range:1.000000"`;
      keys[`profiles\\${n}\\c_stick`] = `"axis_x:2,axis_y:3,deadzone:0.100000,engine:sdl,${at},range:1.000000"`;
      keys[`profiles\\${n}\\motion_device`] = `"engine:sdl,${at}"`;
      return { 'config/qt-config.ini': setSection(text, 'Controls', keys, { sep: '=' }) };
    },
    Gopher64: () => ({ open: true }),
    DuckStation: (f, system, player, pad) => {
      const at = `SDL-${pad.sdl3Index ?? player - 1}/`;
      const keys = { Type: 'AnalogController' };
      for (const [k, c] of Object.entries(PS_LAYOUT)) keys[k] = at + (DUCK_FACE[c] ?? SDL_NAME[c]);
      for (const d of DIRS) keys[d[0].toUpperCase() + d.slice(1)] = at + SDL_NAME[d];
      Object.assign(keys, { LLeft: `${at}-LeftX`, LRight: `${at}+LeftX`, LUp: `${at}-LeftY`, LDown: `${at}+LeftY`,
        RLeft: `${at}-RightX`, RRight: `${at}+RightX`, RUp: `${at}-RightY`, RDown: `${at}+RightY`, ForceAnalogOnReset: 'true', AnalogDPadInDigitalMode: 'true' });
      return { 'settings.ini': setSection(f['settings.ini'], `Pad${player}`, keys, { whole: true }) };
    },
    PCSX2: (f, system, player, pad) => {
      const at = `SDL-${pad.sdl3Index ?? player - 1}/`;
      const keys = { Type: 'DualShock2', InvertL: 0, InvertR: 0, Deadzone: 0, AxisScale: 1.33, LargeMotorScale: 1, SmallMotorScale: 1, ButtonDeadzone: 0, PressureModifier: 0.5 };
      for (const d of DIRS) keys[d[0].toUpperCase() + d.slice(1)] = at + SDL_NAME[d];
      for (const [k, c] of Object.entries(PS_LAYOUT)) keys[k] = at + (FACE_NAME[c] ?? SDL_NAME[c]);
      Object.assign(keys, { LUp: `${at}-LeftY`, LRight: `${at}+LeftX`, LDown: `${at}+LeftY`, LLeft: `${at}-LeftX`,
        RUp: `${at}-RightY`, RRight: `${at}+RightX`, RDown: `${at}+RightY`, RLeft: `${at}-RightX` });
      return { 'inis/PCSX2.ini': setSection(f['inis/PCSX2.ini'], `Pad${player}`, keys, { whole: true }) };
    },
    Dolphin: (f, system, player, pad) => {
      const device = `SDL/0/${pad.name}`;
      const stick = (prefix, side) => ({ [`${prefix}/Up`]: `\`${side} Y+\``, [`${prefix}/Down`]: `\`${side} Y-\``, [`${prefix}/Left`]: `\`${side} X-\``, [`${prefix}/Right`]: `\`${side} X+\`` });
      const dpad = Object.fromEntries(DIRS.map(d => [`D-Pad/${d[0].toUpperCase() + d.slice(1)}`, DOLPHIN_NAME[d]]));
      if (system === 'gc') {
        const keys = { Device: device, 'Buttons/A': DOLPHIN_NAME.south, 'Buttons/B': DOLPHIN_NAME.west, 'Buttons/X': DOLPHIN_NAME.north, 'Buttons/Y': DOLPHIN_NAME.east,
          'Buttons/Z': DOLPHIN_NAME.r, 'Buttons/Start': DOLPHIN_NAME.plus, ...stick('Main Stick', 'Left'), ...stick('C-Stick', 'Right'),
          'Triggers/L': DOLPHIN_NAME.zl, 'Triggers/R': DOLPHIN_NAME.zr, 'Triggers/L-Analog': DOLPHIN_NAME.zl, 'Triggers/R-Analog': DOLPHIN_NAME.zr, ...dpad };
        return { 'Config/GCPadNew.ini': setSection(f['Config/GCPadNew.ini'], `GCPad${player}`, keys),
          'Config/Dolphin.ini': setSection(f['Config/Dolphin.ini'], 'Core', { [`SIDevice${player - 1}`]: 6 }) };
      }
      const keys = { Source: 1, Device: device, 'Buttons/A': DOLPHIN_NAME.east, 'Buttons/B': DOLPHIN_NAME.south, 'Buttons/1': DOLPHIN_NAME.r, 'Buttons/2': DOLPHIN_NAME.zr,
        'Buttons/-': DOLPHIN_NAME.minus, 'Buttons/+': DOLPHIN_NAME.plus, 'Buttons/Home': DOLPHIN_NAME.home, ...dpad,
        'IR/Up': '`Right Y+`', 'IR/Down': '`Right Y-`', 'IR/Left': '`Right X-`', 'IR/Right': '`Right X+`',
        'Shake/X': DOLPHIN_NAME.west, 'Shake/Y': DOLPHIN_NAME.west, 'Shake/Z': DOLPHIN_NAME.west, Extension: 'Nunchuk',
        'Nunchuk/Buttons/C': DOLPHIN_NAME.l, 'Nunchuk/Buttons/Z': DOLPHIN_NAME.zl, ...stick('Nunchuk/Stick', 'Left') };
      return { 'Config/WiimoteNew.ini': setSection(f['Config/WiimoteNew.ini'], `Wiimote${player}`, keys) };
    },
    Cemu: (f, system, player, pad) => {
      const pro = player > 1;
      // Cemu's numbers for each of its buttons, and its controls': SDL 3's
      // buttons, 38 on its axes' directions, 42 and 43 the triggers.
      const AXES = { lsUp: 45, lsDown: 39, lsLeft: 44, lsRight: 38, rsUp: 47, rsDown: 41, rsLeft: 46, rsRight: 40 };
      const order = pro ? ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', 'Plus', 'Minus', 'Home', 'up', 'down', 'left', 'right', 'l3', 'r3', 'lsUp', 'lsDown', 'lsLeft', 'lsRight', 'rsUp', 'rsDown', 'rsLeft', 'rsRight']
        : ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', 'Plus', 'Minus', 'up', 'down', 'left', 'right', 'l3', 'r3', 'lsUp', 'lsDown', 'lsLeft', 'lsRight', 'rsUp', 'rsDown', 'rsLeft', 'rsRight', null, null, 'Home'];
      const code = k => AXES[k] ?? (k === 'ZL' ? 42 : k === 'ZR' ? 43 : sdl3At(NINTENDO[k === 'Plus' ? 'Start' : k === 'Minus' ? 'Select' : k] ?? k));
      const entries = order.map((k, i) => k && `\t\t\t<entry>\n\t\t\t\t<mapping>${i + 1}</mapping>\n\t\t\t\t<button>${code(k)}</button>\n\t\t\t</entry>`).filter(Boolean).join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<emulated_controller>\n\t<type>${pro ? 'Wii U Pro Controller' : 'Wii U GamePad'}</type>\n\t<controller>\n`
        + `\t\t<api>SDLController</api>\n\t\t<uuid>0_${pad.sdl3}</uuid>\n\t\t<display_name>${escape(pad.name ?? 'Controller')}</display_name>\n\t\t<motion>true</motion>\n\t\t<rumble>0</rumble>\n`
        + `\t\t<axis>\n\t\t\t<deadzone>0.15</deadzone>\n\t\t\t<range>1</range>\n\t\t</axis>\n\t\t<rotation>\n\t\t\t<deadzone>0.15</deadzone>\n\t\t\t<range>1</range>\n\t\t</rotation>\n`
        + `\t\t<trigger>\n\t\t\t<deadzone>0.25</deadzone>\n\t\t\t<range>1</range>\n\t\t</trigger>\n\t\t<mappings>\n${entries}\n\t\t</mappings>\n\t</controller>\n</emulated_controller>\n`;
      return { [`controllerProfiles/controller${player - 1}.xml`]: xml };
    },
    Ryujinx: (f, system, player, pad) => {
      const c = JSON.parse(f['Config.json']);
      // Its id: the SDL 2 GUID as a .NET Guid, its first four characters zeroed.
      const g = pad.sdl2;
      const swap = h => h.match(/../g).reverse().join('');
      const id = `0-0000${swap(g.slice(0, 8)).slice(4)}-${swap(g.slice(8, 12))}-${swap(g.slice(12, 16))}-${g.slice(16, 20)}-${g.slice(20)}`;
      // Ryujinx names SDL 2's buttons, which on a Nintendo pad are its labels.
      const label = pad.family === 'nintendo' ? { A: 'A', B: 'B', X: 'X', Y: 'Y' } : { A: 'B', B: 'A', X: 'Y', Y: 'X' };
      const entry = {
        left_joycon_stick: { joystick: 'Left', invert_stick_x: false, invert_stick_y: false, rotate90_cw: false, stick_button: 'LeftStick' },
        right_joycon_stick: { joystick: 'Right', invert_stick_x: false, invert_stick_y: false, rotate90_cw: false, stick_button: 'RightStick' },
        deadzone_left: 0.1, deadzone_right: 0.1, range_left: 1, range_right: 1, trigger_threshold: 0.5,
        motion: { motion_backend: 'GamepadDriver', sensitivity: 100, gyro_deadzone: 1, enable_motion: true },
        rumble: { strong_rumble: 1, weak_rumble: 1, enable_rumble: false },
        left_joycon: { button_minus: 'Minus', button_l: 'LeftShoulder', button_zl: 'LeftTrigger', button_sl: 'SingleLeftTrigger0', button_sr: 'SingleRightTrigger0',
          dpad_up: 'DpadUp', dpad_down: 'DpadDown', dpad_left: 'DpadLeft', dpad_right: 'DpadRight' },
        right_joycon: { button_plus: 'Plus', button_r: 'RightShoulder', button_zr: 'RightTrigger', button_sl: 'SingleLeftTrigger1', button_sr: 'SingleRightTrigger1',
          button_x: label.X, button_b: label.B, button_y: label.Y, button_a: label.A },
        version: 1, backend: 'GamepadSDL2', id, name: pad.name ?? 'Controller', controller_type: 'ProController', player_index: `Player${player}`,
      };
      c.input_config = [...(c.input_config ?? []).filter(x => x.player_index !== `Player${player}`), entry];
      return { 'Config.json': JSON.stringify(c, null, 2) };
    },
    xemu: (f, system, player, pad) => {
      let text = f['xemu.toml'].replace(new RegExp(`^port${player}(_driver)?\\s*=.*\\n`, 'gm'), '');
      const lines = `port${player}_driver = 'usb-xbox-gamepad'\nport${player} = '${pad.sdl3}'\n`;
      text = /^\[input\.bindings\]\s*$/m.test(text) ? text.replace(/^\[input\.bindings\]\s*\n/m, m => m + lines) : `${text.trimEnd()}\n\n[input.bindings]\n${lines}`;
      return { 'xemu.toml': text };
    },
  };
  // Which IDs a writer needs from the helper, so Set up says when one is missing.
  const NEEDS = { mGBA: 'sdl2', Azahar: 'sdl2', Ryujinx: 'sdl2', Cemu: 'sdl3', xemu: 'sdl3' };

  // The files Set up writes for one player of the chosen console, read now
  // and changed: { emulator, open } for an emulator Emu opens instead, or
  // { emulator, files: { rel: [bytes before, text after] } }, or { problem }.
  async function setUp(system, helper, player, pad) {
    const emulator = (await R.emulators?.())?.systems?.[system]?.emulator;
    const writer = WRITERS[emulator], reader = READERS[emulator];
    if (!writer) return { problem: `Emu cannot set up ${emulator ?? 'this console'} yet.` };
    if (player > (reader.players ?? 1)) return { problem: `${emulator} plays ${reader.players ?? 1} player${(reader.players ?? 1) > 1 ? 's' : ''}.` };
    if (NEEDS[emulator] && !pad[NEEDS[emulator]]) return { problem: `Rux Emu Helper could not read this controller's ID, which ${emulator} needs.` };
    const f = {}, raw = {};
    for (const rel of reader.files) {
      try { raw[rel] = await helper.setting(emulator, rel); f[rel] = text(raw[rel]); } catch { /* not written yet */ }
    }
    const out = writer(f, system, player, pad);
    if (out.open) return { emulator, open: true };
    // Each file as its bytes were, for Undo, and as it will be.
    return { emulator, files: Object.fromEntries(Object.entries(out).map(([rel, after]) => [rel, [raw[rel] ?? null, after]])) };
  }

  R.pads = { of, read, playerOf, draw, drawBack, MODELS, CHROME, PRINTED, setUp, _readers: READERS, _writers: WRITERS };
})();
