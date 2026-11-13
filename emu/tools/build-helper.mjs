// Builds Rux Emu Helper.app from emu/helper/main.swift and puts it beside the
// games, with the double-click installer that copies it into Applications,
// and zipped in the emulators folder as Rux-Emu-Helper-<version>-macOS.zip.
//
//   node emu/tools/build-helper.mjs "/Volumes/<drive>/emulation"
//
// It needs Xcode's Swift, so it runs on a Mac that builds the site; the Mac
// that installs the helper needs nothing. The app runs on Apple silicon and
// Intel, and is replaced whole each time. It is signed with the Rux Emu
// Helper certificate in this Mac's keychain, a free one made in Keychain
// Access, so macOS knows every build as the same app and keeps each
// permission it gave, where a build signed for itself alone is asked about
// again; a Mac allows it once by hand, since Apple vouches for no free
// certificate. A Mac without the certificate is refused here rather than
// building one macOS takes for another app. The site's emulators.json goes inside it, and the
// emulation folder's server.json, `{ "home": "http://<address>:8090",
// "public": "https://<name>" }`, the home server's two addresses; its
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
const identity = 'Rux Emu Helper';
const identities = execFileSync('security', ['find-identity', '-p', 'codesigning'], { encoding: 'utf8' });
if (!identities.includes(`"${identity}"`)) {
  console.error(`No "${identity}" certificate in this Mac's keychain: make it in Keychain Access, Certificate Assistant, Create a Certificate, Self Signed Root, Code Signing, or import it from the Mac that has it.`);
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emu-helper-'));

try {
  const app = path.join(tmp, `${name}.app`);
  const macos = path.join(app, 'Contents', 'MacOS');
  fs.mkdirSync(macos, { recursive: true });
  fs.mkdirSync(path.join(app, 'Contents', 'Resources'));
  fs.copyFileSync(path.join(here, '..', 'emulators.json'), path.join(app, 'Contents', 'Resources', 'emulators.json'));
  // The home server's addresses, kept beside the games and out of this public repository.
  const server = path.join(root, 'server.json');
  if (fs.existsSync(server)) fs.copyFileSync(server, path.join(app, 'Contents', 'Resources', 'server.json'));
  else console.warn('No server.json beside the games: this helper cannot download from the home server.');
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
  <key>NSLocalNetworkUsageDescription</key><string>Rux Emu Helper downloads games from your home server.</string>
  <key>CFBundleURLTypes</key><array><dict>
    <key>CFBundleURLName</key><string>Rux Emu Helper</string>
    <key>CFBundleURLSchemes</key><array><string>rux-emu</string></array>
  </dict></array>
</dict></plist>
`);
  execFileSync('codesign', ['--force', '--sign', identity, app]);

  // What Check this Mac.command was, which the helper replaces: the command,
  // its tool and copy of emulators.json, and the reports it wrote.
  for (const old of ['Check this Mac.command', 'tools', 'macs']) fs.rmSync(path.join(root, old), { recursive: true, force: true });

  const dest = path.join(root, `${name}.app`);
  fs.rmSync(dest, { recursive: true, force: true });
  execFileSync('ditto', [app, dest]);

  // The app zipped among the installers, so Update puts it in Supabase and
  // the Status page offers it to a Mac away from the collection.
  const installers = path.join(root, 'emulators');
  fs.mkdirSync(installers, { recursive: true });
  for (const old of fs.readdirSync(installers)) if (/^Rux-Emu-Helper-.*-macOS\.zip$/.test(old)) fs.rmSync(path.join(installers, old));
  execFileSync('ditto', ['-c', '-k', '--norsrc', '--noextattr', '--noqtn', '--keepParent', app, path.join(installers, `Rux-Emu-Helper-${version}-macOS.zip`)]);

  const installer = path.join(root, `Install ${name}.command`);
  fs.writeFileSync(installer, `#!/bin/zsh
# Copies ${name} from beside the games into Applications and starts it,
# without the downloaded mark a network share puts on it, which would have
# macOS run it from a sealed copy that cannot answer the site.
cd "$(dirname "$0")"
osascript -e 'quit app "${name}"' 2>/dev/null
rm -rf "/Applications/${name}.app"
ditto --noqtn "${name}.app" "/Applications/${name}.app"
open "/Applications/${name}.app"
echo "${name} is installed: its game controller is in the menu bar."
read -k 1 "?Press any key to close."
`);
  fs.chmodSync(installer, 0o755);
  console.log(`${name}.app ${version} and Install ${name}.command are on ${root}.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
