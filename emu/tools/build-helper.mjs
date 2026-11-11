// Builds Rux Emu Helper.app from emu/helper/main.swift and puts it beside the
// games, with the double-click installer that copies it into Applications.
//
//   node emu/tools/build-helper.mjs "/Volumes/<drive>/emulation"
//
// It needs Xcode's Swift, so it runs on a Mac that builds the site; the Mac
// that installs the helper needs nothing. The app runs on Apple silicon and
// Intel, is signed for this Mac only (macOS asks once to open it), and is
// replaced whole each time. The site's emulators.json goes inside it, and its
// version is the one main.swift says.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.argv[2];
if (!root || !fs.existsSync(path.join(root, 'roms'))) {
  console.error('usage: build-helper.mjs <emulation folder holding roms/>');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'helper', 'main.swift');
const version = fs.readFileSync(source, 'utf8').match(/^let version = "(\d+)"$/m)[1];
const name = 'Rux Emu Helper';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emu-helper-'));

try {
  const app = path.join(tmp, `${name}.app`);
  const macos = path.join(app, 'Contents', 'MacOS');
  fs.mkdirSync(macos, { recursive: true });
  fs.mkdirSync(path.join(app, 'Contents', 'Resources'));
  fs.copyFileSync(path.join(here, '..', 'emulators.json'), path.join(app, 'Contents', 'Resources', 'emulators.json'));
  const parts = ['arm64', 'x86_64'].map((arch) => {
    const out = path.join(tmp, `helper-${arch}`);
    execFileSync('swiftc', ['-O', '-target', `${arch}-apple-macos13.0`, source, '-o', out], { stdio: 'inherit' });
    return out;
  });
  execFileSync('lipo', ['-create', ...parts, '-output', path.join(macos, 'helper')]);
  fs.writeFileSync(path.join(app, 'Contents', 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>${name}</string>
  <key>CFBundleDisplayName</key><string>${name}</string>
  <key>CFBundleIdentifier</key><string>io.github.rux-sm.emu-helper</string>
  <key>CFBundleExecutable</key><string>helper</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSUIElement</key><true/>
  <key>CFBundleURLTypes</key><array><dict>
    <key>CFBundleURLName</key><string>Rux Emu Helper</string>
    <key>CFBundleURLSchemes</key><array><string>rux-emu</string></array>
  </dict></array>
</dict></plist>
`);
  execFileSync('codesign', ['--force', '--sign', '-', app]);

  const dest = path.join(root, `${name}.app`);
  fs.rmSync(dest, { recursive: true, force: true });
  execFileSync('ditto', [app, dest]);

  const installer = path.join(root, `Install ${name}.command`);
  fs.writeFileSync(installer, `#!/bin/zsh
# Copies ${name} from beside the games into Applications and starts it.
cd "$(dirname "$0")"
osascript -e 'quit app "${name}"' 2>/dev/null
rm -rf "/Applications/${name}.app"
ditto "${name}.app" "/Applications/${name}.app"
open "/Applications/${name}.app"
echo "${name} is installed: its game controller is in the menu bar."
read -k 1 "?Press any key to close."
`);
  fs.chmodSync(installer, 0o755);
  console.log(`${name}.app ${version} and Install ${name}.command are on ${root}.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
