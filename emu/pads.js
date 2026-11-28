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
   `R.pads.drawOriginal(system)` shows a photo of the console's own
   controller with a spot on each button, and `R.pads.lit(system, map,
   control)` names the spots a press on the controller lights.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;

  // A game played with another of its console's controllers, the type kept
  // in its notes, is a console of its own here, named for the console and
  // the type: 'gc-gba', Dolphin's integrated GBA, whose buttons are in
  // Config/GBA.ini; 'wii-remote', the Wii Remote alone held sideways, and
  // 'wii-classic', the Classic Controller, each a profile Emu writes in
  // Config/Profiles/Wiimote/ for each player; and 'wii-gc', the GameCube
  // controller in a Wii game, with the GameCube's buttons. Dolphin's file for
  // the game says which, before Play.
  const GBA_MODE = 'gc-gba';
  const baseOf = mode => String(mode).split('-')[0];
  const modeOf = (system, game) => {
    const type = game?.notes?.controller;
    return type && baseOf(type) === system && LAYOUTS[type] ? type : system;
  };
  const emulatorFor = async system => (await R.emulators?.())?.systems?.[baseOf(system)]?.emulator;
  const profileOf = (mode, player) => `Config/Profiles/Wiimote/emu-${mode.slice(4)}-${player}.ini`;

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
        // first controller to connect and 0x100 on for each next; 16 to 23
        // are the sticks' directions. A port is bound to the controller its
        // codes name.
        const APPLE = ['south', 'east', 'west', 'north', 'l', 'r', 'plus', 'minus', 'up', 'down', 'left', 'right', 'zl', 'zr', 'l3', 'r3',
          'ls', 'ls', 'ls', 'ls', 'rs', 'rs', 'rs', 'rs'];
        const pairs = [];
        let index = null;
        for (const k of ['Mapping1', 'Mapping2', 'Mapping3', 'Mapping4']) {
          for (const [button, code] of Object.entries(port?.[k] ?? {})) {
            if (typeof code !== 'number' || code < 0x1000 || code >= 0x1000 + MESEN_PADS * 0x100) continue;
            const does = { Up: 'D-pad', Down: 'D-pad', Left: 'D-pad', Right: 'D-pad' }[button] ?? button;
            if (!['A', 'B', 'X', 'Y', 'L', 'R', 'Start', 'Select', 'Up', 'Down', 'Left', 'Right'].includes(button)) continue;
            index ??= (code - 0x1000) >> 8;
            pairs.push([APPLE[(code - 0x1000) & 0xff], does]);
          }
        }
        return { bound: pairs.length ? { index } : null, map: mapOf(pairs) };
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
        // A profile Emu wrote is named for its controller's maker and product.
        const named = /^Emu ([0-9a-f]{4}):([0-9a-f]{4})$/.exec(input.input_profile_binding[at] ?? '');
        return { bound: named ? { vendor: named[1], product: named[2] } : { index: at }, map: mapOf(pairs) };
      },
    },
    DuckStation: { files: ['settings.ini'], players: 2, read: (f, system, family, player) => sdlPad(ini(f['settings.ini'])[`Pad${player}`]) },
    PCSX2: { files: ['inis/PCSX2.ini'], players: 2, read: (f, system, family, player) => sdlPad(ini(f['inis/PCSX2.ini'])[`Pad${player}`]) },
    Dolphin: {
      files: ['Config/Dolphin.ini', 'Config/GCPadNew.ini', 'Config/WiimoteNew.ini', 'Config/GBA.ini',
        ...[1, 2, 3, 4].flatMap(n => ['wii-remote', 'wii-classic'].map(mode => profileOf(mode, n)))], players: 4,
      read(f, system, family, player) {
        if (system === GBA_MODE) {
          return dolphin(ini(f['Config/GBA.ini'] ?? '')[`GBA${player}`] ?? {}, { 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/L': 'L', 'Buttons/R': 'R',
            'Buttons/SELECT': 'Select', 'Buttons/START': 'Start', 'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad' });
        }
        if (system === 'wii-remote' || system === 'wii-classic') {
          const profile = ini(f[profileOf(system, player)] ?? '').Profile;
          if (!profile) return { bound: null, map: {} };
          const dpad = { 'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad' };
          if (system === 'wii-remote') {
            return dolphin(profile, { 'Buttons/1': '1', 'Buttons/2': '2', 'Buttons/A': 'A', 'Buttons/B': 'B', 'Buttons/-': '−', 'Buttons/+': '+',
              'Buttons/Home': 'Home', ...dpad, 'Shake/X': 'Shake' });
          }
          return dolphin(profile, { 'Classic/Buttons/A': 'A', 'Classic/Buttons/B': 'B', 'Classic/Buttons/X': 'X', 'Classic/Buttons/Y': 'Y',
            'Classic/Triggers/L': 'L', 'Classic/Triggers/R': 'R', 'Classic/Buttons/ZL': 'ZL', 'Classic/Buttons/ZR': 'ZR', 'Classic/Buttons/-': '−',
            'Classic/Buttons/+': '+', 'Classic/Buttons/Home': 'Home', ...Object.fromEntries(Object.entries(dpad).map(([k, v]) => [`Classic/${k}`, v])),
            'Classic/Left Stick/Up': 'Left stick', 'Classic/Right Stick/Up': 'Right stick' });
        }
        if (system === 'gc' || system === 'wii-gc') {
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
          'D-Pad/Up': 'D-pad', 'D-Pad/Down': 'D-pad', 'D-Pad/Left': 'D-pad', 'D-Pad/Right': 'D-pad', 'IR/Up': 'Pointer', 'IR/Recenter': 'Recenter', 'Shake/X': 'Shake',
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

  // PCSX2's and DuckStation's player, each button an SDL name on a
  // controller by its place, `SDL-0/FaceSouth`, or in DuckStation by its own
  // name, `SDL-<GUID>-<serial>/A`.
  function sdlPad(pad = {}) {
    const PS = { Cross: '✕', Circle: '○', Square: '□', Triangle: '△', L1: 'L1', R1: 'R1', L2: 'L2', R2: 'R2', L3: 'L3', R3: 'R3', Select: 'Select', Start: 'Start',
      Up: 'D-pad', Down: 'D-pad', Left: 'D-pad', Right: 'D-pad', LUp: 'Left stick', RUp: 'Right stick', Analog: 'Analog' };
    const pairs = [];
    let index = null;
    for (const [key, does] of Object.entries(PS)) {
      const m = String(pad[key] ?? '').match(/^SDL-([^/]+)\/(.+)$/);
      if (!m) continue;
      index ??= m[1];
      pairs.push([named(m[2]), does]);
    }
    const bound = index == null ? null : /^\d+$/.test(index) ? { index: Number(index) } : { sdl: index };
    return { bound, map: mapOf(pairs) };
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
    const emulator = await emulatorFor(system);
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
  // and product, or its maker alone where its product is unknown, else the
  // one bound to its place among the connected controllers, counted from 0
  // as the emulator counts them. Null where none.
  const bindsTo = (bound, pad, place) => Boolean(bound && ((bound.vendor && bound.vendor === pad.vendor && (!bound.product || !pad.product || bound.product === pad.product))
    || (bound.sdl && bound.sdl === duckId(pad.found ?? pad))
    || (bound.index != null && bound.index === place)));
  // DuckStation's name for a controller, its SDL 3 GUID and serial, where
  // the serial is plain letters, digits and hyphens, as DuckStation writes
  // it; null where it has none, and DuckStation counts it by place.
  const duckId = c => (c?.sdl3 && /^[A-Za-z0-9-]+$/.test(c.serial ?? '') ? `${c.sdl3}-${c.serial}` : null);
  // Chrome's controllers matched to the ones Rux Emu Helper reports, which
  // it lists in the order the emulators count them. Chrome names some
  // controllers without their maker and product, an Xbox one on a Mac
  // among them, so one is matched by its maker guessed from its name. Each
  // gets the helper's entry as `found` and its `place` in that order; with
  // no report, its place among Chrome's.
  const MAKER = [[/xbox/i, '045e'], [/dualsense|dualshock|playstation/i, '054c'], [/pro controller|joy-con|switch/i, '057e']];
  function identify(pads, report) {
    const list = [...(report ?? [])].sort((a, b) => (a.sdl3Index ?? 0) - (b.sdl3Index ?? 0));
    const taken = new Set();
    const claim = test => { const c = list.find(c => !taken.has(c) && test(c)); if (c) taken.add(c); return c; };
    const found = new Map();
    for (const p of pads) if (p.vendor) found.set(p, claim(c => c.vendor === p.vendor && c.product === p.product));
    const makers = new Map();
    for (const p of pads) if (!p.vendor) {
      const maker = MAKER.find(([re]) => re.test(p.name))?.[1];
      makers.set(p, maker);
      found.set(p, maker ? claim(c => c.vendor === maker) : null);
    }
    return pads.map((p, i) => {
      const c = found.get(p);
      // Unmatched, a controller keeps the maker its name gives, so it still
      // finds a player bound to that maker.
      const maker = makers.get(p);
      if (!c) return maker ? { ...p, vendor: maker, family: FAMILY[maker] ?? p.family, place: i } : { ...p, place: i };
      return { ...p, vendor: c.vendor, product: c.product, id: `${c.vendor}:${c.product}`, family: FAMILY[c.vendor] ?? p.family, found: c, place: list.indexOf(c) };
    });
  }
  const playerOf = (read, pad, place) => read?.players.find(p => (p.bound?.vendor || p.bound?.sdl) && bindsTo(p.bound, pad, place))
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
    // Only the top of the body is drawn, where the back buttons are.
    return `<svg class="emu-padmap" viewBox="0 30 ${W} 200" role="img" aria-label="Each back button and what it copies"><g transform="translate(80 -10)">${BODY}${parts}${labels}</g></svg>`;
  }
  const escape = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // THE CONSOLE'S OWN CONTROLLER: a photo of the real one in
  // brand/originals/, from Wikimedia Commons, and each of its buttons a spot
  // on it, in the photo's pixels, named as the emulators' maps name it:
  // [x, y, r] a circle, [x, y, rx, ry, turn] an ellipse turned that many
  // degrees, or a list of either for a button in several places. A button the
  // photo cannot show, under or behind it, is in `hidden`, drawn as a tag
  // under the photo. `view` crops the photo to its buttons.
  const EVAN = 'Evan-Amos, public domain';
  const ORIGINALS = {
    nes: { photo: 'nes.jpg', size: [1280, 929], view: [60, 60, 1180, 820], file: 'Nintendo-Entertainment-System-NES-Controller-FL.jpg', by: EVAN,
      spots: { 'D-pad': [328, 312, 100], Select: [505, 437, 44, 24, 12], Start: [625, 487, 44, 24, 12], B: [790, 548, 52], A: [912, 600, 52] } },
    snes: { photo: 'snes.jpg', size: [1280, 625], file: 'SNES-Controller-Flat.jpg', by: EVAN,
      spots: { 'D-pad': [284, 342, 112], Select: [520, 378, 50, 18, -40], Start: [650, 378, 50, 18, -40],
        X: [987, 245, 52], A: [1098, 340, 52], B: [982, 430, 52], Y: [867, 340, 52], L: [292, 84, 128, 16], R: [976, 82, 128, 16] } },
    n64: { photo: 'n64.jpg', size: [1280, 1260], view: [0, 100, 1280, 800], file: 'Nintendo-64-Controller-Gray-Flat.jpg', by: EVAN,
      spots: { 'D-pad': [262, 418, 108], Start: [645, 447, 46], B: [877, 440, 50], A: [962, 530, 50], Stick: [650, 690, 78],
        'C buttons': [[1053, 300, 38], [982, 370, 38], [1128, 373, 38], [1056, 438, 38]], L: [268, 180, 120, 24, -12], R: [1012, 178, 120, 24, 10] },
      hidden: ['Z'] },
    gb: { photo: 'gb.jpg', size: [1280, 2048], view: [0, 1000, 1280, 1000], file: 'Game-Boy-Original.jpg', by: EVAN,
      spots: { 'D-pad': [272, 1390, 142], B: [818, 1445, 74], A: [998, 1372, 74], Select: [443, 1665, 66, 26, -20], Start: [628, 1665, 66, 26, -20] } },
    gba: { photo: 'gba.jpg', size: [1280, 884], view: [60, 60, 1170, 780], file: 'Nintendo-Game-Boy-Advance-Purple-FL.jpg', by: EVAN,
      spots: { 'D-pad': [290, 245, 72], Start: [288, 383, 22], Select: [258, 432, 22], B: [963, 500, 40], A: [1072, 500, 40] }, hidden: ['L', 'R'] },
    nds: { photo: 'nds.jpg', size: [1280, 1165], file: 'Nintendo-DS-Fat-Blue.jpg', by: EVAN,
      spots: { 'D-pad': [252, 700, 76], Select: [955, 720, 32, 13, 5], Start: [1022, 738, 32, 13, 5], X: [952, 795, 27], Y: [878, 826, 27], A: [975, 850, 27], B: [905, 878, 27] },
      hidden: ['L', 'R'] },
    n3ds: { photo: 'n3ds.jpg', size: [1280, 1158], file: 'Nintendo-3DS-AquaOpen.jpg', by: EVAN,
      spots: { 'Circle Pad': [270, 620, 62], 'D-pad': [195, 758, 66], X: [930, 742, 30], Y: [858, 773, 30], A: [962, 797, 30], B: [887, 828, 30],
        Select: [330, 887, 38, 15, 12], Home: [470, 925, 46, 15, 12], Start: [605, 962, 38, 15, 12] },
      hidden: ['L', 'R', 'ZL', 'ZR', 'C-Stick'] },
    gc: { photo: 'gc.jpg', size: [1280, 1103], view: [0, 0, 1280, 800], file: 'Gamecube-controller.jpg', by: EVAN,
      spots: { Stick: [432, 145, 82], 'D-pad': [418, 390, 78], Start: [720, 292, 32], B: [848, 368, 44], A: [987, 357, 66], X: [1105, 375, 40, 56, -8],
        Y: [1027, 258, 64, 36, 4], 'C-Stick': [718, 505, 82], Z: [1170, 290, 26, 62] },
      hidden: ['L', 'R'] },
    wii: { photo: 'wii.jpg', size: [1280, 1185], view: [100, 90, 1120, 820], file: 'Nintendo-Wii-Remote-wNunchuk.jpg', by: EVAN,
      spots: { 'D-pad': [1047, 232, 56], A: [1003, 335, 35], '−': [902, 438, 20], Home: [955, 457, 20], '+': [1010, 470, 20], 1: [880, 637, 26], 2: [855, 702, 26],
        'Nunchuk stick': [508, 155, 56, 36], 'Nunchuk C': [642, 232, 13, 22], 'Nunchuk Z': [622, 330, 22, 40] },
      hidden: ['B', 'Shake', 'Pointer', 'Recenter'] },
    'wii-remote': { photo: 'wii-remote.jpg', size: [1280, 974], view: [40, 20, 1240, 700], file: 'Wii Remote Image.jpg', by: 'Greyson Orlando, public domain',
      spots: { 'D-pad': [805, 100, 48], A: [710, 158, 34], '−': [540, 186, 14], Home: [585, 215, 16], '+': [640, 240, 14], 1: [377, 322, 26], 2: [295, 358, 26] },
      hidden: ['B', 'Shake'] },
    'wii-classic': { photo: 'wii-classic.jpg', size: [1280, 710], view: [40, 50, 1240, 640], file: 'Wii-Classic-Controller-White.jpg', by: EVAN,
      spots: { 'D-pad': [285, 270, 68], '−': [552, 270, 20], Home: [637, 270, 22], '+': [722, 270, 20], X: [990, 185, 38], Y: [877, 268, 38],
        A: [1100, 275, 38], B: [990, 357, 38], 'Left stick': [482, 445, 70], 'Right stick': [795, 445, 70] },
      hidden: ['L', 'R', 'ZL', 'ZR'] },
    wiiu: { photo: 'wiiu.png', size: [1280, 692], file: 'Wii U Gamepad schwarz transparent.png', by: 'Mariofan13, CC BY-SA 4.0',
      spots: { 'Left stick': [130, 155, 62], 'Right stick': [1150, 155, 62], 'D-pad': [180, 290, 66], X: [1105, 242, 27], Y: [1053, 293, 27], A: [1160, 293, 27], B: [1108, 341, 27],
        '+': [1057, 422, 22], '−': [1057, 488, 22], Home: [640, 600, 29], 'Show screen': [907, 602, 20], 'Blow mic': [568, 602, 14] },
      hidden: ['L', 'R', 'ZL', 'ZR'] },
    switch: { photo: 'switch.jpg', size: [1280, 996], view: [80, 60, 1140, 880], file: 'Nintendo-Switch-Pro-Controller-FL.jpg', by: EVAN,
      spots: { 'Left stick': [413, 213, 72], 'Right stick': [775, 400, 82], 'D-pad': [493, 358, 86], '−': [585, 185, 26], Capture: [615, 257, 22], Home: [752, 282, 30],
        '+': [825, 233, 26], Y: [868, 298, 39], X: [962, 260, 39], A: [1025, 333, 39], B: [928, 372, 39] },
      hidden: ['L', 'R', 'ZL', 'ZR'] },
    psx: { photo: 'psx.jpg', size: [1280, 1004], view: [0, 20, 1280, 760], file: 'PSX-DualShock-Controller.jpg', by: EVAN,
      spots: { 'D-pad': [380, 195, 116], Select: [605, 272, 34, 18, 15], Start: [800, 322, 36, 18, 15], Analog: [655, 378, 32, 18, 10],
        '□': [930, 345, 44], '△': [1060, 302, 44], '○': [1113, 393, 44], '✕': [982, 435, 44],
        'Left stick': [455, 335, 92], 'Right stick': [775, 410, 92], L3: [455, 335, 92], R3: [775, 410, 92] },
      hidden: ['L1', 'L2', 'R1', 'R2'] },
    ps2: { photo: 'ps2.jpg', size: [1280, 996], view: [100, 60, 1100, 740], file: 'PS2-DualShock2.jpg', by: EVAN,
      spots: { 'D-pad': [360, 300, 122], Select: [572, 345, 30, 18, 8], Start: [762, 380, 34, 16, 15], Analog: [650, 455, 32, 18],
        '□': [887, 402, 44], '△': [1000, 340, 44], '○': [1065, 440, 44], '✕': [952, 505, 44],
        'Left stick': [450, 490, 88], 'Right stick': [765, 520, 88], L3: [450, 490, 88], R3: [765, 520, 88] },
      hidden: ['L1', 'L2', 'R1', 'R2'] },
    xbox: { photo: 'xbox.jpg', size: [1280, 1161], view: [40, 60, 1220, 760], file: 'Xbox-Controller-S-FR.jpg', by: EVAN,
      spots: { 'Left stick': [222, 398, 116], 'D-pad': [450, 515, 116], 'Right stick': [775, 430, 112], Y: [840, 160, 42], B: [948, 227, 42], X: [785, 252, 42], A: [895, 318, 42],
        Black: [1015, 368, 37], White: [958, 447, 37], Back: [153, 550, 37], Start: [240, 595, 37] },
      hidden: ['Left trigger', 'Right trigger'] },
  };
  ORIGINALS.gbc = ORIGINALS.gb;
  ORIGINALS[GBA_MODE] = ORIGINALS.gba;
  ORIGINALS['wii-gc'] = ORIGINALS.gc;
  // A stick pressed in is named Press on the Wii U, Switch and Xbox, so its
  // spot is the stick's own, found from which stick was pressed.
  const PRESS = { l3: 'Left stick', r3: 'Right stick' };
  // The console's buttons a press lights: what `map` says the physical
  // control does there, each one that has a spot or a tag.
  function lit(system, map, control) {
    const o = ORIGINALS[system];
    if (!o) return [];
    const at = ['up', 'down', 'left', 'right'].includes(control) ? 'dpad' : control;
    return String(map[at] ?? '').split(' · ').filter(Boolean)
      .map(does => (does === 'Press' ? PRESS[control] : does))
      .filter(does => does && (does in o.spots || o.hidden?.includes(does)));
  }
  // The photo with a spot on each button, every spot named by `data-does`,
  // and a tag for each button the photo cannot show, also named.
  function drawOriginal(system) {
    const o = ORIGINALS[system];
    if (!o) return '';
    const [w, h] = o.size;
    const [vx, vy, vw, vh] = o.view ?? [0, 0, w, h];
    const shape = s => (s.length === 3 ? `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>`
      : `<ellipse cx="${s[0]}" cy="${s[1]}" rx="${s[2]}" ry="${s[3]}"${s[4] ? ` transform="rotate(${s[4]} ${s[0]} ${s[1]})"` : ''}/>`);
    const spots = Object.entries(o.spots).map(([does, s]) => `<g class="emu-original__spot" data-does="${escape(does)}">${(Array.isArray(s[0]) ? s : [s]).map(shape).join('')}</g>`).join('');
    const tags = (o.hidden ?? []).map(does => `<span class="rux--tag rux--tag--gray emu-original__tag" data-does="${escape(does)}"><span class="rux--tag__label">${escape(does)}</span></span>`).join('');
    const credit = `<a class="rux--link" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(o.file.replace(/ /g, '_'))}" target="_blank" rel="noopener">Photo: ${escape(o.by)}</a>`;
    return `<svg class="emu-original__photo" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="The console's own controller"><image href="brand/originals/${o.photo}" width="${w}" height="${h}"/>${spots}</svg>`
      + `<div class="emu-original__foot">${tags ? `<div class="emu-original__tags">${tags}</div>` : ''}<p class="emu-original__credit">${credit}</p></div>`;
  }

  // SETTING UP. Emu's layout for each console: which physical control, by
  // position, does each of its buttons, named as the map names them. A
  // Nintendo pad's labels and an Xbox pad's positions land on the same
  // places, so one layout serves both. A single button changed on the map
  // is the same layout with that button moved.
  const FACE4 = { A: 'east', B: 'south', X: 'north', Y: 'west' };
  const SNES = { ...FACE4, L: 'l', R: 'r', Start: 'plus', Select: 'minus' };
  const SWITCHLIKE = { ...FACE4, L: 'l', R: 'r', ZL: 'zl', ZR: 'zr', '+': 'plus', '−': 'minus', Home: 'home' };
  const PS = { '✕': 'south', '○': 'east', '□': 'west', '△': 'north', L1: 'l', R1: 'r', L2: 'zl', R2: 'zr', L3: 'l3', R3: 'r3', Select: 'minus', Start: 'plus' };
  const LAYOUTS = {
    nes: { A: 'east', B: 'south', Start: 'plus', Select: 'minus' },
    snes: SNES, nds: SNES,
    // mGBA keeps one set of buttons for all three Game Boys.
    gb: { A: 'east', B: 'south', L: 'l', R: 'r', Start: 'plus', Select: 'minus' },
    n3ds: { ...SNES, ZL: 'zl', ZR: 'zr', Home: 'home' },
    n64: { A: 'south', B: 'west', Z: 'zl', R: 'zr', L: 'l', Start: 'plus' },
    psx: PS, ps2: PS,
    gc: { A: 'south', B: 'west', X: 'north', Y: 'east', Z: 'r', Start: 'plus', L: 'zl', R: 'zr' },
    wii: { A: 'east', B: 'south', 1: 'r', 2: 'zr', '−': 'minus', '+': 'plus', Home: 'home', 'Nunchuk C': 'l', 'Nunchuk Z': 'zl', Shake: 'west' },
    wiiu: SWITCHLIKE, switch: SWITCHLIKE,
  };
  LAYOUTS.gbc = LAYOUTS.gba = LAYOUTS[GBA_MODE] = LAYOUTS.gb;
  // The Wii Remote held sideways is a NES pad: 2 on the right face button, 1
  // on the bottom, A and B above them, and a shake on a shoulder. The Classic
  // Controller is laid out as a Switch pad is, by its labels.
  LAYOUTS['wii-remote'] = { 2: 'east', 1: 'south', A: 'north', B: 'west', '−': 'minus', '+': 'plus', Home: 'home', Shake: 'r' };
  LAYOUTS['wii-classic'] = { ...SWITCHLIKE };
  LAYOUTS['wii-gc'] = LAYOUTS.gc;
  // The controls a layout may use on an emulator that reads buttons only by
  // their number, where the triggers are axes.
  const BUTTONS_ONLY = new Set(['mGBA', 'melonDS']);
  const usable = (emulator, control) => !(BUTTONS_ONLY.has(emulator) && (control === 'zl' || control === 'zr'));
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
  // console, from a layout `L` and the controller the helper reports, `pad`
  // { family, name, sdl2, sdl3, sdl2Index, path }. xemu keeps its own layout.
  const RYU_NAME = ['A', 'B', 'X', 'Y', 'Back', 'Guide', 'Start', 'LeftStick', 'RightStick', 'LeftShoulder', 'RightShoulder', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
  const WRITERS = {
    'Mesen 2': (f, system, player, pad, L) => {
      const raw = f['settings.json'];
      const indent = raw.match(/\{\s*\n( *)/)?.[1].length ?? 2;
      const s = JSON.parse(raw.replace(/^﻿/, ''));
      const console_ = s[system === 'nes' ? 'Nes' : 'Snes'];
      const port = console_[`Port${player}`] ??= JSON.parse(JSON.stringify(console_.Port1));
      port.Type = system === 'nes' ? 'NesController' : 'SnesController';
      // Mesen numbers controllers in the order they connect, so player N is the Nth.
      const base = 0x1000 + (player - 1) * 0x100;
      const m = port.Mapping1 ??= {};
      const set = Object.fromEntries([...Object.entries(L).map(([k, c]) => [k, base + APPLE_AT[c]]),
        ...DIRS.map(d => [d[0].toUpperCase() + d.slice(1), base + APPLE_AT[d]])]);
      // A press another button had is taken from it, so no two share one; the rest, such as turbo, stay.
      const taken = new Set(Object.values(set));
      for (const k of Object.keys(m)) if (!(k in set) && taken.has(m[k])) m[k] = 0;
      Object.assign(m, set);
      // The helper hands the file over without its byte-order mark, and Mesen reads it either way.
      return { 'settings.json': JSON.stringify(s, null, indent) };
    },
    mGBA: (f, system, player, pad, L) => {
      const key = { A: 'keyA', B: 'keyB', L: 'keyL', R: 'keyR', Start: 'keyStart', Select: 'keySelect' };
      const values = Object.fromEntries(Object.entries(L).map(([k, c]) => [key[k], sdl2At(c, pad.family)]));
      for (const d of DIRS) values[`key${d[0].toUpperCase() + d.slice(1)}`] = sdl2At(d, pad.family);
      const sticks = { axisLeftAxis: '-0', axisRightAxis: '+0', axisUpAxis: '-1', axisDownAxis: '+1' };
      let text = setSection(f['config.ini'], 'gba.input.SDLB', { ...values, ...sticks, device0: pad.sdl2 }, { sep: '=' });
      // mGBA loads the profile named for a controller when it connects, over its own lines.
      if (pad.name) text = setSection(text, `gba.input-profile.${pad.name}`, { ...values, ...sticks }, { sep: '=' });
      return { 'config.ini': text };
    },
    melonDS: (f, system, player, pad, L) => {
      const keys = Object.fromEntries(Object.entries(L).map(([k, c]) => [k, sdl2At(c, pad.family)]));
      for (const d of DIRS) keys[d[0].toUpperCase() + d.slice(1)] = sdl2At(d, pad.family);
      let text = setSection(f['melonDS.toml'], 'Instance0.Joystick', keys);
      text = setSection(text, 'Instance0', { JoystickID: pad.sdl2Index ?? 0 });
      return { 'melonDS.toml': text };
    },
    Azahar: (f, system, player, pad, L) => {
      const text = f['config/qt-config.ini'];
      const n = Number(ini(text).Controls?.profile ?? 0) + 1;
      // `api:controller` says the numbers are SDL's game controller ones, as Azahar writes them itself.
      const at = `guid:${pad.sdl2},port:0`, api = 'api:controller,';
      const value = c => c === 'zl' || c === 'zr' ? `"${api}axis:${c === 'zl' ? 4 : 5},direction:+,engine:sdl,${at},threshold:0.5"`
        : `"${api}button:${sdl2At(c, pad.family)},engine:sdl,${at}"`;
      const keys = {};
      for (const [k, c] of Object.entries(L)) keys[`profiles\\${n}\\button_${k.toLowerCase()}`] = value(c);
      for (const d of DIRS) keys[`profiles\\${n}\\button_${d}`] = value(d);
      keys[`profiles\\${n}\\circle_pad`] = `"${api}axis_x:0,axis_y:1,deadzone:0.100000,engine:sdl,${at},range:1.000000"`;
      keys[`profiles\\${n}\\c_stick`] = `"${api}axis_x:2,axis_y:3,deadzone:0.100000,engine:sdl,${at},range:1.000000"`;
      keys[`profiles\\${n}\\motion_device`] = `"engine:sdl,${at}"`;
      // A line that already binds the same is left as Azahar wrote it, with its own extras such as a button's name.
      const pack = v => Object.fromEntries(String(v ?? '').replace(/^"|"$/g, '').split(',').map(p => p.split(':')));
      const was = ini(text).Controls ?? {};
      for (const [k, v] of Object.entries(keys)) {
        const old = pack(was[k]);
        if (Object.entries(pack(v)).every(([p, x]) => old[p] === x)) delete keys[k];
      }
      return { 'config/qt-config.ini': setSection(text, 'Controls', keys, { sep: '=' }) };
    },
    // Gopher64 binds a player to its controller's SDL 3 path, which the
    // helper reports; where it cannot, Gopher64 is opened to choose one. Its
    // profile is Emu's own, by SDL 3's gamepad numbers so it fits any pad,
    // and named for the controller, so `beforePlay` can find it again.
    Gopher64: (f, system, player, pad, L) => {
      if (!pad.path) return { open: true };
      const c = JSON.parse(f['config.json']);
      const input = c.input;
      const button = control => control === 'zl' || control === 'zr' ? { ControllerAxis: { id: control === 'zl' ? 4 : 5, axis: 1, initial_state: 0 } }
        : { ControllerButton: { id: sdl3At(control) } };
      const axis = (id, sign) => ({ ControllerAxis: { id, axis: sign, initial_state: 0 } });
      // Its slots in order, as its input_profile.rs numbers them.
      const slots = [button('right'), button('left'), button('down'), button('up'), button(L.Start), button(L.Z), button(L.B), button(L.A),
        axis(2, 1), axis(2, -1), axis(3, 1), axis(3, -1), button(L.R), button(L.L), axis(0, 1), axis(0, -1), axis(1, 1), axis(1, -1), button('minus')];
      const name = `Emu ${pad.vendor}:${pad.product}`;
      input.input_profiles[name] = { inputs: slots.map(s => [s, null]), dinput: false, deadzone: 5 };
      const at = player - 1;
      input.input_profile_binding[at] = name;
      input.controller_assignment[at] = pad.path;
      input.controller_enabled[at] = true;
      return { 'config.json': JSON.stringify(c, null, 2) };
    },
    DuckStation: (f, system, player, pad, L) => {
      // The controller by its own name, else by place, numbered in the order controllers connect.
      const at = `SDL-${duckId(pad) ?? player - 1}/`;
      const keys = { Type: 'AnalogController' };
      for (const [k, c] of Object.entries(L)) keys[PS_KEY[k] ?? k] = at + (DUCK_FACE[c] ?? SDL_NAME[c]);
      for (const d of DIRS) keys[d[0].toUpperCase() + d.slice(1)] = at + SDL_NAME[d];
      Object.assign(keys, { LLeft: `${at}-LeftX`, LRight: `${at}+LeftX`, LUp: `${at}-LeftY`, LDown: `${at}+LeftY`,
        RLeft: `${at}-RightX`, RRight: `${at}+RightX`, RUp: `${at}-RightY`, RDown: `${at}+RightY`, ForceAnalogOnReset: 'true', AnalogDPadInDigitalMode: 'true' });
      return { 'settings.ini': setSection(f['settings.ini'], `Pad${player}`, keys, { whole: true }) };
    },
    PCSX2: (f, system, player, pad, L) => {
      const at = `SDL-${player - 1}/`; // numbered in the order controllers connect, so player N is the Nth
      const keys = { Type: 'DualShock2', InvertL: 0, InvertR: 0, Deadzone: 0, AxisScale: 1.33, LargeMotorScale: 1, SmallMotorScale: 1, ButtonDeadzone: 0, PressureModifier: 0.5 };
      for (const d of DIRS) keys[d[0].toUpperCase() + d.slice(1)] = at + SDL_NAME[d];
      for (const [k, c] of Object.entries(L)) keys[PS_KEY[k] ?? k] = at + (FACE_NAME[c] ?? SDL_NAME[c]);
      Object.assign(keys, { LUp: `${at}-LeftY`, LRight: `${at}+LeftX`, LDown: `${at}+LeftY`, LLeft: `${at}-LeftX`,
        RUp: `${at}-RightY`, RRight: `${at}+RightX`, RDown: `${at}+RightY`, RLeft: `${at}-RightX` });
      return { 'inis/PCSX2.ini': setSection(f['inis/PCSX2.ini'], `Pad${player}`, keys, { whole: true }) };
    },
    Dolphin: (f, system, player, pad, L) => {
      const device = `SDL/0/${pad.name}`;
      const stick = (prefix, side) => ({ [`${prefix}/Up`]: `\`${side} Y+\``, [`${prefix}/Down`]: `\`${side} Y-\``, [`${prefix}/Left`]: `\`${side} X-\``, [`${prefix}/Right`]: `\`${side} X+\`` });
      const dpad = Object.fromEntries(DIRS.map(d => [`D-Pad/${d[0].toUpperCase() + d.slice(1)}`, DOLPHIN_NAME[d]]));
      // The integrated GBA's buttons; its port is set in Dolphin's file for the game, before Play.
      if (system === GBA_MODE) {
        const GBA_KEY = { A: 'Buttons/A', B: 'Buttons/B', L: 'Buttons/L', R: 'Buttons/R', Select: 'Buttons/SELECT', Start: 'Buttons/START' };
        const keys = { Device: device, ...dpad };
        for (const [k, c] of Object.entries(L)) keys[GBA_KEY[k]] = DOLPHIN_NAME[c];
        return { 'Config/GBA.ini': setSection(f['Config/GBA.ini'] ?? '', `GBA${player}`, keys) };
      }
      // The Wii Remote alone or the Classic Controller, a profile for this
      // player that Dolphin's file for the game names.
      if (system === 'wii-remote' || system === 'wii-classic') {
        const keys = { Device: device };
        if (system === 'wii-remote') {
          const REMOTE_KEY = { 1: 'Buttons/1', 2: 'Buttons/2', A: 'Buttons/A', B: 'Buttons/B', '−': 'Buttons/-', '+': 'Buttons/+', Home: 'Buttons/Home' };
          Object.assign(keys, dpad, { 'Options/Sideways Wiimote': 'True', Extension: 'None' });
          for (const [k, c] of Object.entries(L)) {
            if (k === 'Shake') for (const axis of ['X', 'Y', 'Z']) keys[`Shake/${axis}`] = DOLPHIN_NAME[c];
            else keys[REMOTE_KEY[k]] = DOLPHIN_NAME[c];
          }
        } else {
          Object.assign(keys, { Extension: 'Classic', ...Object.fromEntries(Object.entries(dpad).map(([k, v]) => [`Classic/${k}`, v])),
            ...stick('Classic/Left Stick', 'Left'), ...stick('Classic/Right Stick', 'Right') });
          for (const [k, c] of Object.entries(L)) {
            if (k === 'L' || k === 'R') { keys[`Classic/Triggers/${k}`] = DOLPHIN_NAME[c]; keys[`Classic/Triggers/${k}-Analog`] = DOLPHIN_NAME[c]; } else keys[`Classic/Buttons/${k === '−' ? '-' : k}`] = DOLPHIN_NAME[c];
          }
        }
        return { [profileOf(system, player)]: setSection('', 'Profile', keys).replace(/^\n+/, '') };
      }
      if (system === 'gc' || system === 'wii-gc') {
        const keys = { Device: device, ...stick('Main Stick', 'Left'), ...stick('C-Stick', 'Right'), ...dpad };
        for (const [k, c] of Object.entries(L)) {
          if (k === 'L' || k === 'R') { keys[`Triggers/${k}`] = DOLPHIN_NAME[c]; keys[`Triggers/${k}-Analog`] = DOLPHIN_NAME[c]; } else keys[`Buttons/${k}`] = DOLPHIN_NAME[c];
        }
        return { 'Config/GCPadNew.ini': setSection(f['Config/GCPadNew.ini'], `GCPad${player}`, keys),
          'Config/Dolphin.ini': setSection(f['Config/Dolphin.ini'], 'Core', { [`SIDevice${player - 1}`]: 6 }) };
      }
      const WII_KEY = { A: 'Buttons/A', B: 'Buttons/B', 1: 'Buttons/1', 2: 'Buttons/2', '−': 'Buttons/-', '+': 'Buttons/+', Home: 'Buttons/Home', 'Nunchuk C': 'Nunchuk/Buttons/C', 'Nunchuk Z': 'Nunchuk/Buttons/Z' };
      // The pointer moves by the right stick as a mouse does, so it reaches
      // every edge and stays, and by the controller's motion where it has a
      // gyro, as a Wii Remote is aimed; pressing the right stick recentres
      // both.
      const motion = hasGyro(pad.family) ? {
        'IMUAccelerometer/Up': '`Accel Up`', 'IMUAccelerometer/Down': '`Accel Down`', 'IMUAccelerometer/Left': '`Accel Left`',
        'IMUAccelerometer/Right': '`Accel Right`', 'IMUAccelerometer/Forward': '`Accel Forward`', 'IMUAccelerometer/Backward': '`Accel Backward`',
        'IMUGyroscope/Pitch Up': '`Gyro Pitch Up`', 'IMUGyroscope/Pitch Down': '`Gyro Pitch Down`', 'IMUGyroscope/Roll Left': '`Gyro Roll Left`',
        'IMUGyroscope/Roll Right': '`Gyro Roll Right`', 'IMUGyroscope/Yaw Left': '`Gyro Yaw Left`', 'IMUGyroscope/Yaw Right': '`Gyro Yaw Right`',
      } : {};
      const keys = { Source: 1, Device: device, ...dpad, 'IR/Up': '`Right Y+`', 'IR/Down': '`Right Y-`', 'IR/Left': '`Right X-`', 'IR/Right': '`Right X+`',
        'IR/Relative Input': 'True', 'IR/Recenter': DOLPHIN_NAME.r3, 'IMUIR/Recenter': DOLPHIN_NAME.r3, ...motion,
        Extension: 'Nunchuk', ...stick('Nunchuk/Stick', 'Left') };
      for (const [k, c] of Object.entries(L)) {
        if (k === 'Shake') for (const axis of ['X', 'Y', 'Z']) keys[`Shake/${axis}`] = DOLPHIN_NAME[c];
        else keys[WII_KEY[k]] = DOLPHIN_NAME[c];
      }
      return { 'Config/WiimoteNew.ini': setSection(f['Config/WiimoteNew.ini'], `Wiimote${player}`, keys) };
    },
    Cemu: (f, system, player, pad, L) => {
      const pro = player > 1;
      // Cemu's numbers for its controls: SDL 3's buttons, 38 on its axes'
      // directions, 42 and 43 the triggers; and its buttons in its order.
      const AXES = { lsUp: 45, lsDown: 39, lsLeft: 44, lsRight: 38, rsUp: 47, rsDown: 41, rsLeft: 46, rsRight: 40 };
      const order = pro ? ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '+', '−', 'Home', 'up', 'down', 'left', 'right', 'l3', 'r3', 'lsUp', 'lsDown', 'lsLeft', 'lsRight', 'rsUp', 'rsDown', 'rsLeft', 'rsRight']
        : ['A', 'B', 'X', 'Y', 'L', 'R', 'ZL', 'ZR', '+', '−', 'up', 'down', 'left', 'right', 'l3', 'r3', 'lsUp', 'lsDown', 'lsLeft', 'lsRight', 'rsUp', 'rsDown', 'rsLeft', 'rsRight', null, null, 'Home'];
      const control = k => L[k] ?? k;
      const code = k => AXES[k] ?? (control(k) === 'zl' ? 42 : control(k) === 'zr' ? 43 : sdl3At(control(k)));
      const entries = order.map((k, i) => k && `\t\t\t<entry>\n\t\t\t\t<mapping>${i + 1}</mapping>\n\t\t\t\t<button>${code(k)}</button>\n\t\t\t</entry>`).filter(Boolean).join('\n');
      // Cemu's own lines beside the controller, its profile's name and display toggle, stay.
      const was = f[`controllerProfiles/controller${player - 1}.xml`] ?? '';
      const own = ['profile', 'toggle_display'].map(t => was.match(new RegExp(`^\\t<${t}>.*</${t}>$`, 'm'))?.[0]).filter(Boolean).map(l => `${l}\n`).join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<emulated_controller>\n\t<type>${pro ? 'Wii U Pro Controller' : 'Wii U GamePad'}</type>\n${own}\t<controller>\n`
        + `\t\t<api>SDLController</api>\n\t\t<uuid>0_${pad.sdl3}</uuid>\n\t\t<display_name>${escape(pad.name ?? 'Controller')}</display_name>\n\t\t<motion>${hasGyro(pad.family)}</motion>\n\t\t<rumble>0</rumble>\n`
        + `\t\t<axis>\n\t\t\t<deadzone>0.15</deadzone>\n\t\t\t<range>1</range>\n\t\t</axis>\n\t\t<rotation>\n\t\t\t<deadzone>0.15</deadzone>\n\t\t\t<range>1</range>\n\t\t</rotation>\n`
        + `\t\t<trigger>\n\t\t\t<deadzone>0.25</deadzone>\n\t\t\t<range>1</range>\n\t\t</trigger>\n\t\t<mappings>\n${entries}\n\t\t</mappings>\n\t</controller>\n</emulated_controller>\n`;
      return { [`controllerProfiles/controller${player - 1}.xml`]: xml };
    },
    Ryujinx: (f, system, player, pad, L) => {
      const c = JSON.parse(f['Config.json']);
      // Its id: the SDL 2 GUID as a .NET Guid, its first four characters zeroed.
      const g = pad.sdl2;
      const swap = h => h.match(/../g).reverse().join('');
      const id = `0-0000${swap(g.slice(0, 8)).slice(4)}-${swap(g.slice(8, 12))}-${swap(g.slice(12, 16))}-${g.slice(16, 20)}-${g.slice(20)}`;
      // Ryujinx names SDL 2's buttons, which on a Nintendo pad count by label;
      // − and + keep the names the file already gives them, Back and Start
      // in older versions, Minus and Plus in newer.
      const newer = /"(Minus|Plus)"/.test(f['Config.json']);
      const name = k => {
        const n = { zl: 'LeftTrigger', zr: 'RightTrigger' }[L[k]] ?? RYU_NAME[sdl2At(L[k], pad.family)];
        return newer ? { Back: 'Minus', Start: 'Plus' }[n] ?? n : n;
      };
      const entry = {
        left_joycon_stick: { joystick: 'Left', invert_stick_x: false, invert_stick_y: false, rotate90_cw: false, stick_button: 'LeftStick' },
        right_joycon_stick: { joystick: 'Right', invert_stick_x: false, invert_stick_y: false, rotate90_cw: false, stick_button: 'RightStick' },
        deadzone_left: 0.1, deadzone_right: 0.1, range_left: 1, range_right: 1, trigger_threshold: 0.5,
        motion: { motion_backend: 'GamepadDriver', sensitivity: 100, gyro_deadzone: 1, enable_motion: hasGyro(pad.family) },
        rumble: { strong_rumble: 1, weak_rumble: 1, enable_rumble: false },
        left_joycon: { button_minus: name('−'), button_l: name('L'), button_zl: name('ZL'), button_sl: 'SingleLeftTrigger0', button_sr: 'SingleRightTrigger0',
          dpad_up: 'DpadUp', dpad_down: 'DpadDown', dpad_left: 'DpadLeft', dpad_right: 'DpadRight' },
        right_joycon: { button_plus: name('+'), button_r: name('R'), button_zr: name('ZR'), button_sl: 'SingleLeftTrigger1', button_sr: 'SingleRightTrigger1',
          button_x: name('X'), button_b: name('B'), button_y: name('Y'), button_a: name('A') },
        version: 1, backend: 'GamepadSDL2', id, name: pad.name ?? 'Controller', controller_type: 'ProController', player_index: `Player${player}`,
      };
      // Laid over the player's entry as it was, so what Ryujinx keeps besides, such as its light, stays.
      const list = c.input_config ??= [];
      const at = list.findIndex(x => x.player_index === `Player${player}`);
      const was = list[at] ?? {};
      const merged = { ...was, ...entry };
      for (const k of ['left_joycon_stick', 'right_joycon_stick', 'motion', 'rumble', 'left_joycon', 'right_joycon']) merged[k] = { ...was[k], ...entry[k] };
      if (at >= 0) list[at] = merged; else list.push(merged);
      return { 'Config.json': JSON.stringify(c, null, 2) };
    },
    xemu: (f, system, player, pad) => {
      let text = f['xemu.toml'].replace(new RegExp(`^port${player}(_driver)?\\s*=.*\\n`, 'gm'), '');
      const lines = `port${player}_driver = 'usb-xbox-gamepad'\nport${player} = '${pad.sdl3}'\n`;
      text = /^\[input\.bindings\]\s*$/m.test(text) ? text.replace(/^\[input\.bindings\]\s*\n/m, m => m + lines) : `${text.trimEnd()}\n\n[input.bindings]\n${lines}`;
      return { 'xemu.toml': text };
    },
  };
  const PS_KEY = { '✕': 'Cross', '○': 'Circle', '□': 'Square', '△': 'Triangle' };
  // Which IDs a writer needs from the helper, so Set up says when one is missing.
  // Whether a family's controllers have a gyro, so motion is turned on only for them.
  const hasGyro = family => family === 'nintendo' || family === 'ps';
  const NEEDS = { mGBA: 'sdl2', Azahar: 'sdl2', Ryujinx: 'sdl2', Cemu: 'sdl3', xemu: 'sdl3' };

  // The files Set up writes for one player of the chosen console, read now
  // and changed, by `layout` or else Emu's: { emulator, open } for an
  // emulator Emu opens instead, or { emulator, files: { rel: [bytes before,
  // text after] } }, or { problem }.
  async function setUp(system, helper, player, pad, layout = LAYOUTS[system]) {
    const emulator = await emulatorFor(system);
    const writer = WRITERS[emulator], reader = READERS[emulator];
    if (!writer) return { problem: `Emu cannot set up ${emulator ?? 'this console'} yet.` };
    if (player > (reader.players ?? 1)) return { problem: `${emulator} plays ${reader.players ?? 1} player${(reader.players ?? 1) > 1 ? 's' : ''}.` };
    if (NEEDS[emulator] && !pad[NEEDS[emulator]]) return { problem: `Rux Emu Helper could not read this controller's ID, which ${emulator} needs.` };
    const f = {}, raw = {};
    for (const rel of reader.files) {
      try { raw[rel] = await helper.setting(emulator, rel); f[rel] = text(raw[rel]); } catch { /* not written yet */ }
    }
    const out = writer(f, system, player, pad, layout ?? {});
    if (out.open) return { emulator, open: true };
    // Each file as its bytes were, for Undo, and as it will be.
    return { emulator, files: Object.fromEntries(Object.entries(out).map(([rel, after]) => [rel, [raw[rel] ?? null, after]])) };
  }

  // BEFORE A GAME STARTS, each connected controller plays as the player it
  // keeps with the account, in an emulator that names the controller: a
  // player bound to another is set up again for the kept one, with the
  // buttons that controller had where it was. Mesen 2 and PCSX2 count
  // controllers in an order SDL itself does not keep from one start to the
  // next, and DuckStation counts one with no serial so, so they are left as
  // they are. Gopher64 also binds by SDL
  // path, which changes each time a controller connects, so its paths are
  // brought up to date last.
  const ORDERED = new Set(['Mesen 2', 'PCSX2']);
  // Whether an emulator counts these connected controllers, helper report
  // entries, by place.
  const byPlace = (emulator, report) => ORDERED.has(emulator) || (emulator === 'DuckStation' && (report ?? []).some(c => !duckId(c)));
  const MESEN_PADS = 20;
  // A console's layout as a map has it: Emu's, with each button the map
  // moves where the map has it.
  function layoutFrom(system, map) {
    const L = LAYOUTS[system];
    if (!L) return undefined;
    const out = { ...L };
    for (const [control, does] of Object.entries(map ?? {})) for (const d of does.split(' · ')) if (d in L) out[d] = control;
    return out;
  }
  // A player set up now for controller `c`, a helper report entry with its
  // family, in the chosen console's emulator: with the buttons the controller
  // has where the emulator names it, or, in one that counts by place, the
  // buttons that player has. Throws what stops it; { open } where only the
  // emulator itself can bind it.
  async function fix(system, helper, player, c) {
    const emulator = await emulatorFor(system);
    const now = await read(system, helper, c.family);
    const was = byPlace(emulator, [c]) ? now.players.find(x => x.player === player) : now.players.find(x => bindsTo(x.bound, c, -1));
    const out = await setUp(system, helper, player, c, layoutFrom(system, was?.map));
    if (out.problem) throw new Error(out.problem);
    for (const [rel, [, after]] of Object.entries(out.files ?? {})) await helper.putSetting(emulator, rel, new TextEncoder().encode(after));
    return out;
  }
  // Dolphin's file for one game, GameSettings/<game ID>.ini, read over its
  // own, set for the game's controller type, for each controller turned on
  // at Play, at least one, and none past them, so one player alone has one
  // Game Boy Advance: the Game Boy Advance a GBA
  // (Integrated) port, 13; the Wii Remote alone or the Classic Controller
  // its player's profile and the Remote on; the GameCube controller in a Wii
  // game every Wii Remote off and a GameCube port, 6. A game on its
  // console's own controller has none of these lines, so Dolphin's own setup
  // applies. Its other lines stay. The ID is the one the scan read from the
  // disc's header.
  const PORTS = ['SIDevice0', 'SIDevice1', 'SIDevice2', 'SIDevice3'];
  const PROFILES = ['WiimoteProfile1', 'WiimoteProfile2', 'WiimoteProfile3', 'WiimoteProfile4'];
  const SOURCES = ['WiimoteSource0', 'WiimoteSource1', 'WiimoteSource2', 'WiimoteSource3'];
  async function dolphinGame(helper, game, mode) {
    const id = (game?.files ?? []).map(f => f.header?.discId).find(Boolean);
    if (!id || !/^[A-Z0-9]{6}$/.test(id)) return;
    const rel = `GameSettings/${id}.ini`;
    let was = null;
    try { was = text(await helper.setting('Dolphin', rel)); } catch { /* none yet */ }
    if (mode === baseOf(mode) && !was) return;
    let after = dropKeys(dropKeys(was ?? '', 'Core', PORTS), 'Controls', [...PROFILES, ...SOURCES]);
    if (mode !== baseOf(mode)) {
      const connected = ((await helper.controllers?.()) ?? []).length;
      const count = Math.min(4, Math.max(1, connected));
      const each = (keys, on, off) => Object.fromEntries(keys.map((k, i) => [k, i < count ? on(i) : off]));
      if (mode === GBA_MODE) after = setSection(after, 'Core', each(PORTS, () => 13, 0));
      if (mode === 'wii-gc') {
        after = setSection(after, 'Core', each(PORTS, () => 6, 0));
        after = setSection(after, 'Controls', Object.fromEntries(SOURCES.map(k => [k, 0])));
      }
      if (mode === 'wii-remote' || mode === 'wii-classic') {
        const players = PROFILES.slice(0, count).map((k, i) => [k, `emu-${mode.slice(4)}-${i + 1}`]);
        after = setSection(after, 'Controls', Object.fromEntries([...players, ...SOURCES.slice(0, count).map(k => [k, 1])]));
      }
    }
    // Sections left empty go, so a game back on its own controller leaves no trace.
    after = after.replace(/^\[(Core|Controls)\]\n(?=\n*(\[|$))/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
    if (after !== (was ?? '')) await helper.putSetting('Dolphin', rel, new TextEncoder().encode(after));
  }
  // A section of a `key = value` file without `keys`, every other line kept.
  function dropKeys(body, name, keys) {
    let inside = false;
    return body.replace(/\r\n/g, '\n').split('\n').filter(line => {
      if (/^\[.+\]\s*$/.test(line)) { inside = line.trim() === `[${name}]`; return true; }
      return !(inside && keys.includes(line.slice(0, line.indexOf('=')).trim()));
    }).join('\n');
  }
  async function beforePlay(console_, helper, game) {
    const system = modeOf(console_, game);
    const emulator = await emulatorFor(system);
    if (emulator === 'Dolphin' && game) await dolphinGame(helper, game, system);
    const reader = READERS[emulator];
    if (!reader || !helper.controllers) return;
    const report = await helper.controllers();
    if (!report?.length) return;
    const list = [...report].sort((a, b) => (a.sdl3Index ?? 0) - (b.sdl3Index ?? 0));
    // Each player's kept controller among those connected.
    const rows = await (R.data?.controllers?.() ?? Promise.resolve([])).catch(() => []);
    const kept = new Map(), used = new Set();
    for (const row of rows) {
      const p = row.details?.player;
      if (!p || p > (reader.players ?? 1) || kept.has(p)) continue;
      const [vendor, product] = String(row.id).split(':');
      const c = list.find(c => !used.has(c) && c.vendor === vendor && c.product === product);
      if (c) { kept.set(p, c); used.add(c); }
    }
    if (kept.size && WRITERS[emulator] && !byPlace(emulator, report)) {
      for (const [p, c] of kept) {
        const family = FAMILY[c.vendor] ?? 'xbox';
        const now = await read(system, helper, family);
        if (now.players.some(x => x.player === p && bindsTo(x.bound, c, -1))) continue;
        await fix(system, helper, p, { family, ...c });
      }
    }
    if (emulator === 'Gopher64') await pointGopher(helper, report);
  }
  // Gopher64's players Emu set, each profile named for its controller,
  // pointed at that controller's SDL path now; two of one model take their
  // paths in turn.
  async function pointGopher(helper, report) {
    const c = JSON.parse(text(await helper.setting('Gopher64', 'config.json')));
    const input = c.input;
    const taken = new Map();
    let changed = false;
    (input.input_profile_binding ?? []).forEach((name, i) => {
      const m = /^Emu ([0-9a-f]{4}):([0-9a-f]{4})$/.exec(name ?? '');
      if (!m || !input.controller_enabled?.[i]) return;
      const key = `${m[1]}:${m[2]}`, n = taken.get(key) ?? 0;
      taken.set(key, n + 1);
      const found = report.filter(r => r.vendor === m[1] && r.product === m[2])[n];
      if (found?.path && input.controller_assignment[i] !== found.path) { input.controller_assignment[i] = found.path; changed = true; }
    });
    if (changed) await helper.putSetting('Gopher64', 'config.json', new TextEncoder().encode(JSON.stringify(c, null, 2)));
  }

  R.pads = { of, identify, read, playerOf, beforePlay, fix, modeOf, GBA_MODE, byPlace, draw, drawBack, drawOriginal, lit, ORIGINALS, MODELS, CHROME, PRINTED, setUp, LAYOUTS, usable, _readers: READERS, _writers: WRITERS };
})();
