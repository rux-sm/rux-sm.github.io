// Rux Emu Helper — the Mac's sidekick for the Rux Emu site.
//
// A menu bar app with no window. It answers the site on 127.0.0.1 only,
// and only requests whose Origin is the site's:
//
//   GET    /status         what the helper sees: the collection it found and
//                          whether it is a network share, this Mac's library
//                          folder, and each system whose emulator is installed
//   POST   /play           { "system": "n64", "file": "<file in roms/n64/>" }
//                          opens that one game in its system's emulator, from
//                          this Mac's library, else from a drive plugged in
//   GET    /mac            how this Mac stands, read now: each app and its
//                          version, and each place an emulator saves to
//   POST   /update         { "url", "name", "size", "sha1", "version" }, a
//                          newer helper fetched from Supabase by the link
//                          the site signed, put in this one's place and
//                          started, once it proves signed as this one is
//   POST   /install        { "emulator", "url", "name", "size", "sha1",
//                          "version" }, that emulator's installer fetched
//                          from Supabase by the link the site signed, and its
//                          app put in Applications with a receipt
//   GET    /mac/settings   ?emulator=, each settings file that emulator
//                          keeps on this Mac, with its SHA-1 as it is stored
//   GET    /mac/setting    ?emulator=&rel=, one of those, as it is stored
//   POST   /mac/setting    ?emulator=&rel=, the body written as that file
//   POST   /mac/manage     { "emulator" }, the settings Emu manages written
//                          into its settings file
//   GET    /mac/carry      ?emulator=, each save that emulator keeps in the
//                          folders Emu carries, with its SHA-1 now and at
//                          its last carry, and whether the emulator runs
//   GET    /mac/carried    ?path=<its path in Supabase>, one of those
//   PUT    /mac/carried    ?path=&saved=, the body written as that save, at
//                          the moment it was saved, and noted as carried
//   POST   /mac/carried/mark  ?path=&sha1=, that save noted as carried, when
//                          it still has that SHA-1
//   GET    /mac/given      ?emulator=, each BIOS, key or firmware file that
//                          emulator holds in the folders Supabase fills
//   PUT    /mac/given      ?emulator=&path=<its path in Supabase>, the body
//                          written as that file
//   GET    /mac/saves      each save this Mac keeps itself, neither on the
//                          drive nor carried to Supabase
//   GET    /mac/save       ?stored=<emulator>/<place>/<file>, one of those
//   GET    /newest         the newest version of each emulator its project
//                          has out, asked of the feed emulators.json names
//   GET    /drive/list     ?path=, a folder of the collection, for the scan
//   GET    /drive/stat     ?path=, a file's size and last-changed time
//   GET    /drive/file     ?path=&at=&n=, a file's bytes, or n of them from at
//   GET    /drive/fingerprint  ?path=, a file's CRC32, MD5 and SHA-1, in hex
//   PUT    /drive/file     ?path=, the body written there, folders made
//   DELETE /drive/file     ?path=, that one file removed
//   POST   /download       { "system", "files": [{ "name", "size", "sha1" }],
//                          "token" }, a game's files fetched from the home
//                          server into this Mac's library, one after another
//   GET    /downloads      each download asked for since the helper started,
//                          with how far it has come
//   GET    /library        each game file this Mac's library holds
//   GET    /library/space  how many bytes this Mac has free for games
//   DELETE /library/file   ?path=<system>/<name>, that one file out of this
//                          Mac's library, its download stopped
//
// A download comes from the home server's address inside the home when it
// answers, since the router loops the public name back slowly, and from the
// public name otherwise; both are `server.json`, which build-helper.mjs puts
// inside the app from beside the games, so neither is in the public
// repository. It carries the signed-in account's access token, which the
// helper keeps only until that download ends. A file arrives beside its place
// as a hidden part, resumes from where it stopped, is checked against the
// SHA-1 the site sends, and only then takes its name. The library is
// `~/Emulation/roms/<system>/`, laid out as the collection's roms folder. A
// game plays from the library, or from a drive plugged into this Mac, and
// never from a network share, where a dropped connection stops the game.
//
// The collection is the first folder holding a `roms` folder that is either
// a drive's `emulation` folder, as on the T7, or a drive itself, as the home
// server's `games` share mounts, and every /drive path is inside it once links are followed. What
// the helper knows of each emulator, how it opens a game and where it keeps
// saves on a Mac, is the site's `emulators.json`, which build-helper.mjs puts
// inside the app, so it reads a Mac with no drive plugged in. A game must
// sit inside `roms/<system>/`, and a Mac's save must be one /mac/saves
// lists, so nothing the site sends can open or read anything else. The one
// thing it asks of the internet is each project's feed, at the addresses
// inside the app, and it sends them nothing but the question.
//
// An emulator's settings are the files emulators.json gives the class `own`,
// inside its folder on this Mac, less any a more exact entry gives another
// class, as a log-in's file is. One is stored with this Mac's home folder
// written as `~`, so it opens on another Mac, and without a line whose key
// names a token, password or secret; one over a megabyte is left where it is.
// A file is written only at a place those entries name, with `~` made this
// Mac's home again, and never while its emulator runs, which writes its
// settings as it quits. Writing one for an emulator never opened on this Mac
// makes its folder first.
//
// A carried save sits in a folder inside its emulator's own, which
// emulators.json names beside that folder's path in Supabase, and the
// settings Emu manages point the emulator there. The helper keeps each one's
// SHA-1 at its last carry in ~/Library/Application Support/Rux Emu
// Helper/carried.json, so the site can tell which side changed, and never
// writes one while its emulator runs. Its menu bar icon is filled while a
// save differs from its last carry.
//
// A given file is a BIOS, key or firmware file Supabase holds for every Mac.
// It sits in a folder inside its emulator's own, which emulators.json names
// beside that folder's path in Supabase, and the settings Emu manages point
// the emulator there, so it starts with no drive plugged in.
//
// An installer comes only from the collection's bucket in Supabase, is
// checked against the size and SHA-1 the site sends, and puts in Applications
// only an app emulators.json names for that emulator. The receipt it leaves,
// in ~/Library/Application Support/Rux Emu Helper/receipts/, names the
// installer's version, since some apps do not say their own; it holds only
// while the app is the one it was written for.

import AppKit
import CryptoKit
import GameController
import Network
import Security
import ServiceManagement
import SystemConfiguration
import zlib

let version = "29"
let port: NWEndpoint.Port = 47647
let site = URL(string: "https://rux-sm.github.io/emu/")!
let allowedOrigins: Set<String> = ["https://rux-sm.github.io", "http://localhost:8641"]
// Where a signed link to a file of the collection starts; the project's address is not a secret.
let collectionLinks = "https://udnmqhayzhrbltxzzhjw.supabase.co/storage/v1/object/sign/emu-collection/"

// MARK: The collection

// How a system's emulator starts a game: its app and arguments, or, for an
// emulator in Apple's sandbox, by opening the game with the app as the
// Finder does, since the sandbox refuses a game handed to it as an argument.
struct Launch { let app: String; let args: [String]; let open: Bool }

func collection() -> URL? {
  let volumes = (try? FileManager.default.contentsOfDirectory(atPath: "/Volumes")) ?? []
  for name in volumes.sorted() {
    let drive = URL(fileURLWithPath: "/Volumes").appendingPathComponent(name)
    for root in [drive.appendingPathComponent("emulation"), drive] {
      var dir: ObjCBool = false
      if FileManager.default.fileExists(atPath: root.appendingPathComponent("roms").path, isDirectory: &dir), dir.boolValue { return root }
    }
  }
  return nil
}

// The site's emulators.json, inside the app.
let rules: [String: Any] = {
  guard let url = Bundle.main.url(forResource: "emulators", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
  return json
}()

let launches: [String: Launch] = {
  var out: [String: Launch] = [:]
  for (system, value) in rules["systems"] as? [String: Any] ?? [:] {
    guard let s = value as? [String: Any], let l = s["launch"] as? [String: Any],
          let app = l["app"] as? String else { continue }
    out[system] = Launch(app: app, args: l["args"] as? [String] ?? [], open: l["open"] as? Bool ?? false)
  }
  return out
}()

// The app's own program, from its Info.plist, or nil where it is not installed.
func program(_ app: String) -> URL? {
  for dir in ["/Applications", NSHomeDirectory() + "/Applications"] {
    let bundle = URL(fileURLWithPath: dir).appendingPathComponent(app)
    if let b = Bundle(url: bundle), let exe = b.executableURL, FileManager.default.isExecutableFile(atPath: exe.path) { return exe }
  }
  return nil
}

// MARK: Answers

// The drive a collection is on, by its name in /Volumes.
func driveOf(_ root: URL) -> String { root.pathComponents.count > 2 ? root.pathComponents[2] : root.lastPathComponent }

// Whether a folder is on a network share, as the home server's is.
func onNetwork(_ p: String) -> Bool {
  var s = statfs()
  return statfs(p, &s) == 0 && s.f_flags & UInt32(MNT_LOCAL) == 0
}

func status() -> [String: Any] {
  let playable = launches.filter { program($0.value.app) != nil }.keys.sorted()
  let found = collection().map { ["path": $0.path, "drive": driveOf($0), "network": onNetwork($0.path)] as [String: Any] }
  return ["app": "Rux Emu Helper", "version": version, "collection": orNull(found), "library": tilde(library), "systems": playable]
}

// A game's file inside a roms folder, links followed, or nil where it is not there.
func gameFile(_ roms: URL, _ system: String, _ file: String) -> URL? {
  let base = roms.appendingPathComponent(system).resolvingSymlinksInPath().standardizedFileURL
  let target = base.appendingPathComponent(file).resolvingSymlinksInPath().standardizedFileURL
  var dir: ObjCBool = false
  guard target.path.hasPrefix(base.path + "/"),
        FileManager.default.fileExists(atPath: target.path, isDirectory: &dir), !dir.boolValue else { return nil }
  return target
}

func play(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let system = req["system"] as? String, let file = req["file"] as? String else { return (400, ["error": "Send a system and a file."]) }
  guard let launch = launches[system] else { return (404, ["error": "No emulator is set for \(system)."]) }
  guard let exe = program(launch.app) else { return (409, ["error": "\(launch.app) is not installed."]) }
  // This Mac's own copy first, then a drive plugged in.
  let found = collection()
  let shared = found.map { onNetwork($0.path) } ?? false
  var from = "library"
  var held = gameFile(URL(fileURLWithPath: library), system, file)
  if held == nil, let found, !shared { held = gameFile(found.appendingPathComponent("roms"), system, file); from = "drive" }
  guard let target = held else {
    if shared { return (409, ["error": "Download it to this Mac to play: a game does not play over the network."]) }
    return (404, ["error": found == nil ? "That game is not on this Mac. Download it, or plug in the drive." : "That game is not in the collection."])
  }
  if launch.open {
    let app = exe.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    let config = NSWorkspace.OpenConfiguration()
    config.activates = true
    NSWorkspace.shared.open([target], withApplicationAt: app, configuration: config) { _, _ in }
    return (200, ["playing": target.lastPathComponent, "with": launch.app, "from": from])
  }
  let p = Process()
  p.executableURL = exe
  p.arguments = launch.args.map { $0 == "{file}" ? target.path : $0 }
  p.standardOutput = FileHandle.nullDevice
  p.standardError = FileHandle.nullDevice
  // Its saves are compared with their last carry once it quits.
  p.terminationHandler = { _ in showWaiting() }
  do { try p.run() } catch { return (500, ["error": "\(launch.app) did not start."]) }
  // The emulator comes to the front once its window is up.
  DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
    NSRunningApplication(processIdentifier: p.processIdentifier)?.activate()
  }
  return (200, ["playing": target.lastPathComponent, "with": launch.app, "from": from])
}

// MARK: This Mac

// How this Mac stands: its macOS, ES-DE's and each emulator's app and
// version, the folder ES-DE reads games from, each place an emulator saves
// to with how many files it holds, and how many files each retired app still
// holds; and each save it keeps itself rather than on the drive. Where each
// emulator keeps saves is `macSaves` in emulators.json: its folder in
// ~/Library, and for each place it saves to, the default and the setting in
// its own settings file that moves it, which wins.

let home = NSHomeDirectory()
let files = FileManager.default
func expand(_ p: String) -> String { p == "~" ? home : p.hasPrefix("~/") ? home + p.dropFirst(1) : p }
func tilde(_ p: String) -> String { p.hasPrefix(home) ? "~" + p.dropFirst(home.count) : p }
// A value for the JSON answer, null where there is none.
func orNull(_ v: Any?) -> Any { v ?? NSNull() }
func exists(_ p: String) -> Bool { files.fileExists(atPath: p) }
func real(_ p: String) -> String {
  guard let r = realpath(p, nil) else { return p }
  defer { free(r) }
  return String(cString: r)
}

// The first capture of a pattern in a text, or nil.
func first(_ pattern: String, _ text: String, lines: Bool = false) -> String? {
  guard let re = try? NSRegularExpression(pattern: pattern, options: lines ? [.anchorsMatchLines] : []),
        let m = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)), m.numberOfRanges > 1,
        let r = Range(m.range(at: 1), in: text) else { return nil }
  return String(text[r])
}

// An app by any of its names in either Applications folder, with its
// version: the one its receipt names where the helper installed it, else the
// one its bundle says.
func appOf(_ names: [String], emulator: String? = nil) -> [String: Any]? {
  for dir in ["/Applications", home + "/Applications"] {
    for name in names where exists(dir + "/" + name) {
      let app = dir + "/" + name
      let info = NSDictionary(contentsOfFile: app + "/Contents/Info.plist")
      let receipt = emulator.flatMap { receiptOf($0, app: app) }
      return ["path": tilde(app), "version": orNull(receipt?["version"] as? String ?? info?["CFBundleShortVersionString"] as? String),
              "receipt": orNull(receipt.map { ["installer": orNull($0["installer"]), "installed": orNull($0["installed"])] as [String: Any] })]
    }
  }
  return nil
}

// One setting's value from an emulator's settings file, by its key: an INI
// section and key, a JSON or TOML path, a BML path, or an XML tag.
func setting(_ file: String, _ format: String, _ key: String) -> String? {
  guard var text = try? String(contentsOfFile: file, encoding: .utf8) else { return nil }
  if text.hasPrefix("\u{FEFF}") { text.removeFirst() }
  let clean = { (v: String?) -> String? in
    guard var s = v?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
    if s.count >= 2, s.hasPrefix("\""), s.hasSuffix("\"") { s = String(s.dropFirst().dropLast()).trimmingCharacters(in: .whitespaces) }
    return s.isEmpty ? nil : s
  }
  let parts = key.components(separatedBy: "/")
  switch format {
  case "ini":
    guard parts.count > 1 else { return nil }
    var inSection = false
    for line in text.components(separatedBy: .newlines) {
      let t = line.trimmingCharacters(in: .whitespaces)
      if t.hasPrefix("["), t.hasSuffix("]"), t.count > 2 { inSection = String(t.dropFirst().dropLast()) == parts[0]; continue }
      if inSection, let eq = line.firstIndex(of: "="), line[..<eq].trimmingCharacters(in: .whitespaces) == parts[1] {
        return clean(String(line[line.index(after: eq)...]))
      }
    }
    return nil
  case "json":
    guard let data = text.data(using: .utf8), var v = try? JSONSerialization.jsonObject(with: data) else { return nil }
    for k in key.components(separatedBy: ".") { guard let next = (v as? [String: Any])?[k] else { return nil }; v = next }
    if let s = v as? String { return clean(s) }
    if let n = v as? NSNumber { return clean(n.stringValue) }
    return nil
  case "toml":
    // A bare key is wherever the file holds it; a dotted one is the last
    // name under the table the rest names, as withSetting writes it.
    let names = key.components(separatedBy: ".")
    guard names.count > 1, let last = names.last else { return clean(first("^\\s*\(NSRegularExpression.escapedPattern(for: key))\\s*=\\s*(.+)$", text, lines: true)) }
    let table = names.dropLast().joined(separator: ".")
    var inTable = false
    for line in text.components(separatedBy: .newlines) {
      let t = line.trimmingCharacters(in: .whitespaces)
      if t.hasPrefix("["), t.hasSuffix("]") { inTable = String(t.dropFirst().dropLast()) == table; continue }
      if inTable, let eq = line.firstIndex(of: "="), line[..<eq].trimmingCharacters(in: .whitespaces) == last {
        // A literal string, in single quotes as xemu writes a path, reads as a quoted one.
        let v = line[line.index(after: eq)...].trimmingCharacters(in: .whitespaces)
        return clean(v.count >= 2 && v.hasPrefix("'") && v.hasSuffix("'") ? String(v.dropFirst().dropLast()) : v)
      }
    }
    return nil
  case "bml":
    // A BML tree: each level indented under its parent, a value after a colon.
    guard parts.count > 1, let re = try? NSRegularExpression(pattern: "^\(parts[0])\\s*$", options: [.anchorsMatchLines]),
          let m = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
          let r = Range(m.range, in: text) else { return nil }
    return clean(first("^\\s+\(parts[1]):\\s*(.*)$", String(text[r.upperBound...]), lines: true))
  case "xml":
    return clean(first("<\(key)>([^<]*)</\(key)>", text))
  default:
    return nil
  }
}

// Every file under a folder with its size, links and hidden files left out.
func walk(_ dir: String) -> [(path: String, size: Int)] {
  let names = ((try? files.contentsOfDirectory(atPath: dir)) ?? []).filter { !$0.hasPrefix(".") }.sorted()
  return names.flatMap { name -> [(path: String, size: Int)] in
    let p = dir + "/" + name
    guard let a = try? files.attributesOfItem(atPath: p), let type = a[.type] as? FileAttributeType else { return [] }
    if type == .typeSymbolicLink { return [] }
    if type == .typeDirectory { return walk(p) }
    return [(p, (a[.size] as? NSNumber)?.intValue ?? 0)]
  }
}

// Each place an emulator or retired app saves to, its setting winning over its default.
func placesOf(_ where_: [String: Any], _ homeDir: String) -> [(place: [String: Any], dir: String?, from: String)] {
  let config = where_["config"] as? [String: Any]
  let file = (config?["file"] as? String).map { homeDir + "/" + $0 }
  return (where_["places"] as? [[String: Any]] ?? []).map { place in
    if let key = place["key"] as? String, let file, exists(file),
       let v = setting(file, config?["format"] as? String ?? "", key) {
      let e = expand(v)
      return (place, URL(fileURLWithPath: e.hasPrefix("/") ? e : homeDir + "/" + e).standardizedFileURL.path, "setting")
    }
    return (place, (place["path"] as? String).map { homeDir + "/" + $0 }, "default")
  }
}

// An emulator's folder on this Mac: of those it may use, the one whose
// settings file was written last, else the first that is there.
let homeOf = { (w: [String: Any]) -> String? in
  let there = (w["homes"] as? [String] ?? []).map(expand).filter(exists)
  let file = (w["config"] as? [String: Any])?["file"] as? String
  let written = { (home: String) -> Date in
    file.flatMap { (try? files.attributesOfItem(atPath: home + "/" + $0))?[.modificationDate] as? Date } ?? .distantPast
  }
  let last = there.map(written).max()
  return there.first { written($0) == last }
}
let appsOf = { (w: [String: Any]) in w["apps"] as? [String] ?? [] }
let iso: ISO8601DateFormatter = {
  let f = ISO8601DateFormatter()
  f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return f
}()

// One place an emulator saves to, by its number in emulators.json.
struct Place { let index: Int; let rule: [String: Any]; let dir: String?; let from: String }
// An emulator as this Mac has it: the systems it plays, its data folder, and its places.
struct Saver { let name: String; let rule: [String: Any]; let plays: [String]; let home: String?; let places: [Place] }

func savers() -> [Saver] {
  let systems = rules["systems"] as? [String: Any] ?? [:]
  return (rules["macSaves"] as? [String: Any] ?? [:]).compactMap { name, value in
    guard let w = value as? [String: Any] else { return nil }
    let home = homeOf(w)
    let plays = systems.compactMap { ($0.value as? [String: Any])?["emulator"] as? String == name ? $0.key : nil }.sorted()
    let places = home.map { placesOf(w, $0).enumerated().map { Place(index: $0.offset, rule: $0.element.place, dir: $0.element.dir, from: $0.element.from) } } ?? []
    return Saver(name: name, rule: w, plays: plays, home: home, places: places)
  }
}

// The saves in one place: each file under 50 MB that its include matches, where it has one.
func saves(in place: Place) -> [(rel: String, path: String, size: Int)] {
  guard let dir = place.dir, exists(dir) else { return [] }
  let include = (place.rule["include"] as? String).flatMap { try? NSRegularExpression(pattern: $0) }
  return walk(dir).compactMap { f in
    guard f.size < 50_000_000 else { return nil }
    let rel = String(f.path.dropFirst(dir.count + 1))
    if let include, !["/" + rel, rel].contains(where: { include.firstMatch(in: $0, range: NSRange($0.startIndex..., in: $0)) != nil }) { return nil }
    return (rel, f.path, f.size)
  }
}

func macReport() -> [String: Any] {
  let frontend = rules["frontend"] as? [String: Any] ?? [:]

  // The folder ES-DE reads games from, from its own settings file.
  let esde = expand(frontend["settings"] as? String ?? "") + "/" + (frontend["config"] as? String ?? "")
  let roms = (try? String(contentsOfFile: esde, encoding: .utf8)).flatMap { first("<string name=\"ROMDirectory\" value=\"([^\"]*)\"", $0) }

  var emulators: [[String: Any]] = []
  // Every folder an emulator saves to, so a retired app's folder holding them is not counted twice.
  var gathered: [String] = []
  for e in savers() {
    var places: [[String: Any]] = []
    var count = 0, size = 0
    for place in e.places {
      if let dir = place.dir { gathered.append(dir) }
      let found = place.dir.map(exists) ?? false
      // A folder linked to the drive, as Ryujinx's is, is said where the link leads.
      let shown = place.dir.map { found ? real($0) : $0 }
      let held = saves(in: place)
      count += held.count
      size += held.reduce(0) { $0 + $1.size }
      places.append(["dir": orNull(shown.map(tilde)), "from": place.from, "found": found, "files": held.count])
    }
    emulators.append(["emulator": e.name, "systems": e.plays, "app": orNull(appOf(appsOf(e.rule), emulator: e.name)),
                      "data": orNull(e.home.map(tilde)), "places": places, "files": count, "size": size,
                      // A folder in another app's sandbox that macOS refuses this helper, as Gopher64's is without Full Disk Access.
                      "readable": e.home.map { (try? files.contentsOfDirectory(atPath: $0)) != nil } ?? true])
  }

  for (emulator, value) in rules["retired"] as? [String: Any] ?? [:] {
    guard let w = value as? [String: Any] else { continue }
    let homeDir = homeOf(w), app = appOf(appsOf(w))
    if app == nil && homeDir == nil { continue }
    var places: [[String: Any]] = []
    var count = 0, size = 0
    if let homeDir {
      var seen = Set<String>()
      for (_, dir, from) in placesOf(w, homeDir) {
        guard let dir, !seen.contains(dir) else { continue }
        seen.insert(dir)
        let left = exists(dir) ? walk(dir).filter { f in !gathered.contains { f.path.hasPrefix($0 + "/") } } : []
        places.append(["dir": tilde(dir), "from": from, "found": !left.isEmpty, "files": left.count])
        count += left.count
        size += left.reduce(0) { $0 + $1.size }
      }
    }
    emulators.append(["emulator": emulator, "retired": true, "systems": [String](), "app": orNull(app),
                      "data": orNull(homeDir.map(tilde)), "places": places, "files": count, "size": size])
  }

  let v = ProcessInfo.processInfo.operatingSystemVersion
  var u = utsname()
  uname(&u)
  let chip = withUnsafeBytes(of: &u.machine) { String(cString: $0.bindMemory(to: CChar.self).baseAddress!) }
  return [
    "mac": SCDynamicStoreCopyComputerName(nil, nil) as String? ?? ProcessInfo.processInfo.hostName,
    "made": iso.string(from: Date()),
    "macos": "\(v.majorVersion).\(v.minorVersion)" + (v.patchVersion > 0 ? ".\(v.patchVersion)" : ""),
    "chip": chip,
    "frontend": ["name": frontend["name"] as? String ?? "ES-DE", "app": orNull(appOf(appsOf(frontend))), "romDirectory": orNull(roms.map(tilde))],
    "emulators": emulators,
  ]
}

// Each save this Mac keeps itself, neither on the drive nor carried to
// Supabase, which holds a carried save already: its emulator and the
// systems it plays, its path within its place for matching it to its game,
// `stored` naming it for /mac/save, the folder it came from for restoring
// it, its size, and when it was made and last saved.
func macSaves() -> [[String: Any]] {
  let drive = collection().map { real($0.path) + "/" }
  var out: [[String: Any]] = []
  for e in savers() {
    for place in e.places where place.rule["stored"] == nil {
      for f in saves(in: place) {
        if let drive, real(f.path).hasPrefix(drive) { continue }
        let a = try? files.attributesOfItem(atPath: f.path)
        out.append(["emulator": e.name, "systems": e.plays, "rel": f.rel, "stored": "\(e.name)/\(place.index)/\(f.rel)",
                    "from": (f.path as NSString).deletingLastPathComponent, "size": f.size,
                    "created": orNull((a?[.creationDate] as? Date).map(iso.string)),
                    "saved": orNull((a?[.modificationDate] as? Date).map(iso.string))])
      }
    }
  }
  return out
}

// One save /mac/saves lists, by its `stored` name, and nothing else.
func macSavePath(_ stored: String) -> String? {
  let parts = stored.split(separator: "/", maxSplits: 2).map(String.init)
  guard parts.count == 3, let index = Int(parts[1]),
        let place = savers().first(where: { $0.name == parts[0] })?.places.first(where: { $0.index == index }) else { return nil }
  return saves(in: place).first { $0.rel == parts[2] }?.path
}

// MARK: An emulator's settings

// Whether one of an emulator's apps is running.
func running(_ apps: [String]) -> Bool {
  NSWorkspace.shared.runningApplications.contains { a in apps.contains(a.bundleURL?.lastPathComponent ?? "") }
}

// The names in an entry of emulators.json that lists several, as "cheats, patches".
func listed(_ v: Any?) -> [String] { (v as? String)?.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty } ?? [] }

// Each place an emulator keeps settings: its name within the emulator's
// folder, and where it is on this Mac, which a setting may move.
func ownPlaces(_ e: Saver) -> [(rel: String, at: String)] {
  guard let home = e.home else { return [] }
  let config = e.rule["config"] as? [String: Any]
  let file = (config?["file"] as? String).map { home + "/" + $0 }
  var out: [(rel: String, at: String)] = []
  for entry in e.rule["files"] as? [[String: Any]] ?? [] where entry["class"] as? String == "own" {
    let keys = listed(entry["key"])
    for (i, rel) in listed(entry["path"]).enumerated() {
      var at = home + "/" + rel
      if keys.indices.contains(i), let file, exists(file), let v = setting(file, config?["format"] as? String ?? "", keys[i]) {
        let moved = expand(v)
        at = URL(fileURLWithPath: moved.hasPrefix("/") ? moved : home + "/" + moved).standardizedFileURL.path
      }
      out.append((rel, at))
    }
  }
  return out
}

// The names another class holds inside an emulator's folder, which its settings leave out.
func notOwn(_ e: Saver) -> [String] {
  (e.rule["files"] as? [[String: Any]] ?? []).filter { $0["class"] as? String != "own" }.flatMap { listed($0["path"]) }
}
func leftOut(_ rel: String, of place: String, by others: [String]) -> Bool {
  others.contains { $0.count > place.count && (rel == $0 || rel.hasPrefix($0 + "/")) }
}

// Each settings file an emulator has on this Mac, and how many are too large to carry.
func ownFiles(_ e: Saver) -> (files: [(rel: String, path: String)], large: Int) {
  let others = notOwn(e)
  var out: [(rel: String, path: String)] = []
  var large = 0
  for place in ownPlaces(e) where exists(place.at) {
    let found = isFolder(place.at) ? walk(place.at).map { (place.rel + $0.path.dropFirst(place.at.count), $0.path, $0.size) }
      : [(place.rel, place.at, ((try? files.attributesOfItem(atPath: place.at))?[.size] as? NSNumber)?.intValue ?? 0)]
    for (rel, path, size) in found where !leftOut(rel, of: place.rel, by: others) {
      if size > 900_000 { large += 1 } else { out.append((rel, path)) }
    }
  }
  return (out, large)
}

// A settings file as it is stored: a text's home folder written as `~`, and
// in a file of `key = value` lines, each line whose key names a log-in left out.
func stored(_ path: String) -> Data? {
  guard let data = files.contents(atPath: path) else { return nil }
  guard !data.contains(0), var text = String(data: data, encoding: .utf8) else { return data }
  text = text.replacingOccurrences(of: home, with: "~")
  if ["ini", "toml", "cfg", "conf"].contains((path as NSString).pathExtension.lowercased()),
     let secret = try? NSRegularExpression(pattern: "^[^=\\[#;]*(token|password|passwd|secret)[^=]*=.*\\n?", options: [.anchorsMatchLines, .caseInsensitive]) {
    text = secret.stringByReplacingMatches(in: text, range: NSRange(text.startIndex..., in: text), withTemplate: "")
  }
  return Data(text.utf8)
}

// A stored file as this Mac holds it: `~` at the start of a path made its home again.
func restored(_ data: Data) -> Data {
  guard !data.contains(0), let text = String(data: data, encoding: .utf8),
        let tilde = try? NSRegularExpression(pattern: "(?<![A-Za-z0-9_~./-])~(?=/)") else { return data }
  return Data(tilde.stringByReplacingMatches(in: text, range: NSRange(text.startIndex..., in: text), withTemplate: NSRegularExpression.escapedTemplate(for: home)).utf8)
}

func saver(_ name: String) -> Saver? { savers().first { $0.name == name } }

func settingsOf(_ name: String) -> (Int, [String: Any]) {
  guard let e = saver(name) else { return (404, ["error": "\(name) is not an emulator Emu knows."]) }
  let own = ownFiles(e)
  let list: [[String: Any]] = own.files.compactMap { f in
    guard let data = stored(f.path) else { return nil }
    let a = try? files.attributesOfItem(atPath: f.path)
    return ["rel": f.rel, "size": data.count, "sha1": Insecure.SHA1.hash(data: data).map { String(format: "%02x", $0) }.joined(),
            "saved": orNull((a?[.modificationDate] as? Date).map(iso.string))]
  }
  return (200, ["emulator": name, "home": orNull(e.home.map(tilde)), "files": list, "large": own.large, "running": running(appsOf(e.rule))])
}

func settingBytes(_ name: String, _ rel: String) -> Data? {
  guard let e = saver(name), let f = ownFiles(e).files.first(where: { $0.rel == rel }) else { return nil }
  return stored(f.path)
}

// One settings file written at a place the emulator's entries name.
func writeSetting(_ name: String, _ rel: String, _ body: Data) -> (Int, [String: Any]) {
  guard var e = saver(name) else { return (404, ["error": "\(name) is not an emulator Emu knows."]) }
  let app = (appsOf(e.rule).first as NSString?)?.deletingPathExtension ?? name
  // An emulator never opened on this Mac has no folder yet: the first it may
  // use is made, so the settings kept for it start it as on any other Mac.
  if e.home == nil, let first = (e.rule["homes"] as? [String])?.first {
    try? files.createDirectory(atPath: expand(first), withIntermediateDirectories: true)
    guard let made = saver(name), made.home != nil else { return (500, ["error": "The helper could not make \(app)'s folder."]) }
    e = made
  }
  guard !running(appsOf(e.rule)) else { return (409, ["error": "Quit \(app) first: it writes its settings as it quits."]) }
  guard plainName(rel) else { return (400, ["error": "A settings file needs a plain name."]) }
  let others = notOwn(e)
  guard let place = ownPlaces(e).first(where: { rel == $0.rel || rel.hasPrefix($0.rel + "/") }), !leftOut(rel, of: place.rel, by: others),
        rel == place.rel ? !isFolder(place.at) : !exists(place.at) || isFolder(place.at) else {
    return (404, ["error": "\(rel) is not one of \(name)'s settings files."])
  }
  let dest = place.at + rel.dropFirst(place.rel.count)
  guard (try? files.createDirectory(atPath: (dest as NSString).deletingLastPathComponent, withIntermediateDirectories: true)) != nil,
        (try? restored(body).write(to: URL(fileURLWithPath: dest), options: .atomic)) != nil else {
    return (500, ["error": "The helper could not write \(rel)."])
  }
  return (200, ["written": rel])
}

// A value set in an INI text, in its section, which is made where it is
// missing, written `key = value` where the file writes its lines so.
func iniSet(_ text: String, _ section: String, _ key: String, _ value: String) -> String {
  let entry = text.contains(" = ") ? "\(key) = \(value)" : "\(key)=\(value)"
  var lines = text.components(separatedBy: "\n")
  var inSection = false, end: Int? = nil
  for (i, line) in lines.enumerated() {
    let t = line.trimmingCharacters(in: .whitespaces)
    if t.hasPrefix("["), t.hasSuffix("]"), t.count > 2 {
      if inSection { break }
      inSection = String(t.dropFirst().dropLast()) == section
      if inSection { end = i }
      continue
    }
    guard inSection else { continue }
    if !t.isEmpty { end = i }
    if let eq = line.firstIndex(of: "="), line[..<eq].trimmingCharacters(in: .whitespaces) == key {
      lines[i] = entry
      return lines.joined(separator: "\n")
    }
  }
  if let end { lines.insert(entry, at: end + 1) }
  else {
    if lines.last == "" { lines.removeLast() }
    lines += (lines.isEmpty ? [] : [""]) + ["[\(section)]", entry, ""]
  }
  return lines.joined(separator: "\n")
}

// A pattern's one match in a text replaced by what `with` makes of its
// captures, or nil where it matches no time or more than once.
func replacedOnce(_ text: String, _ pattern: String, _ with: ([String]) -> String) -> String? {
  guard let re = try? NSRegularExpression(pattern: pattern, options: [.anchorsMatchLines]) else { return nil }
  let all = re.matches(in: text, range: NSRange(text.startIndex..., in: text))
  guard all.count == 1, let whole = Range(all[0].range, in: text) else { return nil }
  let groups = (0..<all[0].numberOfRanges).map { Range(all[0].range(at: $0), in: text).map { String(text[$0]) } ?? "" }
  return text.replacingCharacters(in: whole, with: with(groups))
}

// A text as a quoted string, as JSON and TOML both write one.
func quoted(_ v: String) -> String {
  (try? JSONSerialization.data(withJSONObject: v, options: [.fragmentsAllowed, .withoutEscapingSlashes])).flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
}

// A settings text with one setting given a value, by the key setting() reads
// it by, or nil where the helper cannot place it: an INI section and key; a
// JSON key that the file holds once, its value a text, a number or a yes or
// no; a TOML key the file holds once, or one under its table; a BML name
// under its heading; an XML tag the file holds once. A value stays the kind
// it was, so a text stays quoted.
func withSetting(_ text: String, _ format: String, _ key: String, _ value: String) -> String? {
  let name = { (k: String) in NSRegularExpression.escapedPattern(for: k) }
  switch format {
  case "ini":
    let parts = key.components(separatedBy: "/")
    return parts.count == 2 ? iniSet(text, parts[0], parts[1], value) : nil
  case "json":
    guard let last = key.components(separatedBy: ".").last else { return nil }
    return replacedOnce(text, "(\"\(name(last))\"\\s*:\\s*)(\"(?:[^\"\\\\]|\\\\.)*\"|true|false|null|-?[0-9][0-9.eE+-]*)") { g in
      g[1] + (g[2].hasPrefix("\"") ? quoted(value) : value)
    }
  case "toml":
    // A bare key is wherever the file holds it once; a dotted one is the
    // last name under the table the rest names, added there where missing.
    let parts = key.components(separatedBy: ".")
    let plain = ["true", "false"].contains(value) || Double(value) != nil
    guard parts.count > 1, let last = parts.last else {
      return replacedOnce(text, "^(\\s*\(name(key))\\s*=\\s*)(.*)$") { g in
        g[1] + (g[2].hasPrefix("\"") || g[2].hasPrefix("'") ? quoted(value) : value)
      }
    }
    let table = parts.dropLast().joined(separator: ".")
    var lines = text.components(separatedBy: "\n")
    var inTable = false, end: Int? = nil
    for (i, line) in lines.enumerated() {
      let t = line.trimmingCharacters(in: .whitespaces)
      if t.hasPrefix("["), t.hasSuffix("]") {
        if inTable { break }
        inTable = String(t.dropFirst().dropLast()) == table
        if inTable { end = i }
        continue
      }
      guard inTable else { continue }
      if !t.isEmpty { end = i }
      if let eq = line.firstIndex(of: "="), line[..<eq].trimmingCharacters(in: .whitespaces) == last {
        let old = line[line.index(after: eq)...].trimmingCharacters(in: .whitespaces)
        lines[i] = "\(last) = \(old.hasPrefix("\"") || old.hasPrefix("'") || !plain ? quoted(value) : value)"
        return lines.joined(separator: "\n")
      }
    }
    let entry = "\(last) = \(plain ? value : quoted(value))"
    if let end { lines.insert(entry, at: end + 1) }
    else {
      if lines.last == "" { lines.removeLast() }
      lines += (lines.isEmpty ? [] : [""]) + ["[\(table)]", entry, ""]
    }
    return lines.joined(separator: "\n")
  case "xml":
    let escaped = value.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
    return replacedOnce(text, "<\(name(key))>[^<]*</\(name(key))>|<\(name(key))\\s*/>") { _ in "<\(key)>\(escaped)</\(key)>" }
  case "bml":
    let parts = key.components(separatedBy: "/")
    guard parts.count == 2 else { return nil }
    var lines = text.components(separatedBy: "\n")
    var under = false
    for (i, line) in lines.enumerated() {
      if !line.hasPrefix(" ") { under = line.trimmingCharacters(in: .whitespaces) == parts[0]; continue }
      guard under, line.hasPrefix("  "), !line.hasPrefix("   ") else { continue }
      let t = line.dropFirst(2)
      if t == parts[1] || t.hasPrefix(parts[1] + ":") {
        lines[i] = value.isEmpty ? "  \(parts[1])" : "  \(parts[1]): \(value)"
        return lines.joined(separator: "\n")
      }
    }
    return nil
  default: return nil
  }
}

// The settings Emu manages for an emulator written into its settings file:
// each key set, and each left where the helper could not place it.
func manage(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any], let name = req["emulator"] as? String,
        let e = saver(name) else { return (404, ["error": "That is not an emulator Emu knows."]) }
  let app = (appsOf(e.rule).first as NSString?)?.deletingPathExtension ?? name
  let manages = e.rule["manages"] as? [[String: Any]] ?? []
  if manages.isEmpty { return (200, ["set": [String](), "left": [String]()]) }
  guard let home = e.home else { return (409, ["error": "Open \(app) once on this Mac first, so it makes its settings folder."]) }
  guard !running(appsOf(e.rule)) else { return (409, ["error": "Quit \(app) first: it writes its settings as it quits."]) }
  let config = e.rule["config"] as? [String: Any]
  var set: [String] = [], left: [String] = []
  guard let file = (config?["file"] as? String).map({ home + "/" + $0 }), let format = config?["format"] as? String else {
    return (200, ["set": set, "left": manages.compactMap { $0["key"] as? String }])
  }
  // A file that opens with a byte order mark, as Mesen 2's does, keeps it.
  let mark = Data([0xEF, 0xBB, 0xBF])
  let raw = files.contents(atPath: file) ?? Data()
  let marked = raw.starts(with: mark)
  var text = String(data: marked ? raw.dropFirst(mark.count) : raw, encoding: .utf8) ?? ""
  for m in manages {
    guard let key = m["key"] as? String, var value = m["value"] as? String else { continue }
    // A folder inside the emulator's own, or a file in one, its folder made
    // so the emulator finds it there.
    if value.hasPrefix("{home}/") {
      value = home + value.dropFirst("{home}".count)
      let folder = (value as NSString).pathExtension.isEmpty ? value : (value as NSString).deletingLastPathComponent
      try? files.createDirectory(atPath: folder, withIntermediateDirectories: true)
    }
    if let next = withSetting(text, format, key, value) { text = next; set.append(key) } else { left.append(key) }
  }
  guard (try? ((marked ? mark : Data()) + Data(text.utf8)).write(to: URL(fileURLWithPath: file), options: .atomic)) != nil else {
    return (500, ["error": "The helper could not write \(app)'s settings file."])
  }
  return (200, ["set": set, "left": left])
}

// MARK: Carrying saves

// Whether an emulator is playing a game: the process that runs its game,
// where emulators.json names one, since Gopher64 runs each game apart from
// its window, which stays open after; else any of its apps.
func playing(_ rule: [String: Any]) -> Bool {
  if let game = rule["gameProcess"] as? String {
    return NSWorkspace.shared.runningApplications.contains { $0.executableURL?.lastPathComponent == game }
  }
  return running(appsOf(rule))
}

// Each folder of an emulator that Emu carries: its path in Supabase, where
// it is inside the emulator's own folder, whatever its setting says now, and
// which of its files are saves, where it holds other things too.
struct Carried {
  let stored: String, dir: String, include: NSRegularExpression?
  func holds(_ rel: String) -> Bool {
    guard let include else { return true }
    return ["/" + rel, rel].contains { include.firstMatch(in: $0, range: NSRange($0.startIndex..., in: $0)) != nil }
  }
}
func carriedPlaces(_ e: Saver) -> [Carried] {
  guard let home = e.home else { return [] }
  return (e.rule["places"] as? [[String: Any]] ?? []).compactMap { p in
    guard let stored = p["stored"] as? String, let path = p["path"] as? String else { return nil }
    return Carried(stored: stored, dir: home + "/" + path, include: (p["include"] as? String).flatMap { try? NSRegularExpression(pattern: $0) })
  }
}

// Each carried save's SHA-1 at its last carry, by its path in Supabase.
let ledgerFile = home + "/Library/Application Support/Rux Emu Helper/carried.json"
let ledgerLock = NSLock()
func ledger() -> [String: String] {
  ledgerLock.lock(); defer { ledgerLock.unlock() }
  return files.contents(atPath: ledgerFile).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: String] } ?? [:]
}
func note(_ path: String, _ sha1: String) {
  ledgerLock.lock()
  var all = files.contents(atPath: ledgerFile).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: String] } ?? [:]
  all[path] = sha1
  try? files.createDirectory(atPath: (ledgerFile as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
  try? JSONSerialization.data(withJSONObject: all, options: [.sortedKeys]).write(to: URL(fileURLWithPath: ledgerFile), options: .atomic)
  ledgerLock.unlock()
  showWaiting()
}

func sha1Of(_ path: String) -> String? {
  files.contents(atPath: path).map { Insecure.SHA1.hash(data: $0).map { String(format: "%02x", $0) }.joined() }
}

// Each save in an emulator's carried folders, under 200 MB, which holds a console's whole disk image.
func carriedFiles(_ e: Saver) -> [(path: String, at: String, size: Int)] {
  carriedPlaces(e).flatMap { place in
    walk(place.dir).filter { $0.size < 200_000_000 && place.holds(String($0.path.dropFirst(place.dir.count + 1))) }
      .map { (place.stored + $0.path.dropFirst(place.dir.count), $0.path, $0.size) }
  }
}

func carry(_ name: String) -> (Int, [String: Any]) {
  guard let e = saver(name) else { return (404, ["error": "\(name) is not an emulator Emu knows."]) }
  let last = ledger()
  let list: [[String: Any]] = carriedFiles(e).compactMap { f in
    guard let sha1 = sha1Of(f.at) else { return nil }
    let a = try? files.attributesOfItem(atPath: f.at)
    return ["path": f.path, "size": f.size, "sha1": sha1, "carried": orNull(last[f.path]),
            "saved": orNull((a?[.modificationDate] as? Date).map(iso.string))]
  }
  return (200, ["emulator": name, "mac": SCDynamicStoreCopyComputerName(nil, nil) as String? ?? ProcessInfo.processInfo.hostName,
                "carries": !carriedPlaces(e).isEmpty, "running": playing(e.rule), "files": list])
}

// Where a carried save is on this Mac, by its path in Supabase: inside the
// folder with the longest path that holds it, and its emulator.
func carriedAt(_ path: String) -> (e: Saver, at: String)? {
  var best: (e: Saver, place: Carried)? = nil
  for e in savers() {
    for place in carriedPlaces(e) where path.hasPrefix(place.stored + "/") && place.stored.count > (best?.place.stored.count ?? -1) {
      best = (e, place)
    }
  }
  guard let best else { return nil }
  let rel = String(path.dropFirst(best.place.stored.count + 1))
  guard plainName(rel), best.place.holds(rel) else { return nil }
  return (best.e, best.place.dir + "/" + rel)
}

// A carried save just written: given the moment it was saved, and noted as carried.
func carriedWritten(_ path: String, _ at: String, _ saved: String?) {
  if let when = saved.flatMap(iso.date) ?? saved.flatMap({ ISO8601DateFormatter().date(from: $0) }) {
    try? files.setAttributes([.modificationDate: when], ofItemAtPath: at)
  }
  if let sha1 = sha1Of(at) { note(path, sha1) }
}

func markCarried(_ path: String, _ sha1: String) -> (Int, [String: Any]) {
  guard let found = carriedAt(path), sha1Of(found.at) == sha1 else { return (409, ["error": "That save changed since it was read."]) }
  note(path, sha1)
  return (200, ["carried": path])
}

// Whether any carried save differs from its last carry.
func savesWaiting() -> Bool {
  let last = ledger()
  return savers().contains { e in carriedFiles(e).contains { sha1Of($0.at) != last[$0.path] } }
}

// The menu bar icon filled while saves wait; set once the app is up.
var showWaiting: () -> Void = {}

// MARK: Given files

// Each folder of an emulator that Supabase fills: its path there, and where
// it is inside the emulator's own folder.
// Each folder in Supabase a provided kind of file comes from, one or a list,
// with the folder inside the emulator's own it goes to and the files it
// takes: every one, or those its include matches, as a Switch's keys from
// beside its firmware.
func givenPlaces(_ e: Saver) -> [Carried] {
  guard let home = e.home else { return [] }
  return (e.rule["files"] as? [[String: Any]] ?? []).flatMap { f -> [Carried] in
    guard f["class"] as? String == "provided", let path = f["path"] as? String else { return [] }
    let include = (f["include"] as? String).flatMap { try? NSRegularExpression(pattern: $0) }
    let froms = (f["given"] as? [String]) ?? (f["given"] as? String).map { [$0] } ?? []
    return froms.map { Carried(stored: $0, dir: home + "/" + path, include: include) }
  }
}

func given(_ name: String) -> (Int, [String: Any]) {
  guard let e = saver(name) else { return (404, ["error": "\(name) is not an emulator Emu knows."]) }
  let places = givenPlaces(e)
  let list: [[String: Any]] = places.flatMap { place in
    walk(place.dir).compactMap { f -> [String: Any]? in
      guard place.holds(String(f.path.dropFirst(place.dir.count + 1))), let sha1 = sha1Of(f.path) else { return nil }
      return ["path": place.stored + f.path.dropFirst(place.dir.count), "size": f.size, "sha1": sha1]
    }
  }
  return (200, ["emulator": name, "folders": Array(Set(places.map { $0.stored })).sorted(), "running": playing(e.rule), "files": list])
}

// Where a given file goes on this Mac, by its emulator and its path in Supabase.
func givenAt(_ name: String, _ path: String) -> (e: Saver, at: String)? {
  guard let e = saver(name), let place = givenPlaces(e).first(where: {
    path.hasPrefix($0.stored + "/") && $0.holds(String(path.dropFirst($0.stored.count + 1)))
  }) else { return nil }
  let rel = String(path.dropFirst(place.stored.count + 1))
  return plainName(rel) ? (e, place.dir + "/" + rel) : nil
}

// MARK: Updating itself

// Whether the app at a path is signed as this one is: it meets the
// requirement macOS knows this helper by, its name and its certificate, so
// nothing but a build of this helper takes its place.
func signedLikeMe(_ path: String) -> Bool {
  var me: SecCode?
  var mine: SecStaticCode?
  var req: SecRequirement?
  var other: SecStaticCode?
  guard SecCodeCopySelf([], &me) == errSecSuccess, let me,
        SecCodeCopyStaticCode(me, [], &mine) == errSecSuccess, let mine,
        SecCodeCopyDesignatedRequirement(mine, [], &req) == errSecSuccess, let req,
        SecStaticCodeCreateWithPath(URL(fileURLWithPath: path) as CFURL, [], &other) == errSecSuccess, let other else { return false }
  return SecStaticCodeCheckValidity(other, SecCSFlags(rawValue: kSecCSCheckAllArchitectures), req) == errSecSuccess
}

// A newer helper from Supabase put in this one's place: fetched by the
// site's signed link, checked against the size and SHA-1 the site sends,
// unzipped, and refused unless it is a newer version signed as this one is.
// Once in place, it is started and this one quits.
func update(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let link = req["url"] as? String, let name = req["name"] as? String,
        let size = (req["size"] as? NSNumber)?.intValue, let sha1 = req["sha1"] as? String,
        let wanted = req["version"] as? String else {
    return (400, ["error": "Send the helper's link, name, size and SHA-1, and its version."])
  }
  guard link.hasPrefix(collectionLinks), let url = URL(string: link) else { return (400, ["error": "A helper comes only from the collection in Supabase."]) }
  guard plainName(name), !name.contains("/") else { return (400, ["error": "The helper's zip needs a plain name."]) }
  guard (Int(wanted) ?? 0) > (Int(version) ?? 0) else { return (409, ["error": "This Mac already runs version \(version)."]) }
  let tmp = NSTemporaryDirectory() + "rux-emu-update-" + UUID().uuidString
  guard (try? files.createDirectory(atPath: tmp + "/out", withIntermediateDirectories: true)) != nil else { return (500, ["error": "The helper could not make room to unpack itself."]) }
  defer { try? files.removeItem(atPath: tmp) }
  let file = tmp + "/" + name
  guard fetched(url, to: file) else { return (502, ["error": "The new helper did not arrive from Supabase. Try again."]) }
  guard ((try? files.attributesOfItem(atPath: file))?[.size] as? NSNumber)?.intValue == size,
        (fingerprint(file)?["sha1"] as? String) == sha1.lowercased() else {
    return (502, ["error": "The new helper arrived but is not the file Supabase lists."])
  }
  guard run("/usr/bin/ditto", ["-x", "-k", file, tmp + "/out"]), let found = appUnder(tmp + "/out", ["Rux Emu Helper.app"]) else {
    return (500, ["error": "The zip holds no Rux Emu Helper."])
  }
  guard NSDictionary(contentsOfFile: found.path + "/Contents/Info.plist")?["CFBundleVersion"] as? String == wanted else {
    return (409, ["error": "The zip holds another version than Supabase names."])
  }
  guard signedLikeMe(found.path) else { return (403, ["error": "The new helper is not signed as this one is, so it was not put in its place."]) }
  let dest = Bundle.main.bundlePath
  let staged = (dest as NSString).deletingLastPathComponent + "/.Rux Emu Helper.app.installing"
  try? files.removeItem(atPath: staged)
  guard run("/usr/bin/ditto", ["--noqtn", found.path, staged]) else {
    try? files.removeItem(atPath: staged)
    return (500, ["error": "The helper could not write beside itself."])
  }
  try? files.removeItem(atPath: dest)
  guard (try? files.moveItem(atPath: staged, toPath: dest)) != nil else {
    return (500, ["error": "The helper could not put the new one in its place. Install it from the Status page's Download."])
  }
  // The new one starts a moment after this answer goes, and this one quits.
  DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/sh")
    p.arguments = ["-c", "sleep 1; /usr/bin/open -n \"$0\"", dest]
    try? p.run()
    NSApp.terminate(nil)
  }
  return (200, ["updated": wanted, "was": version])
}

// MARK: Installing an emulator

let receipts = home + "/Library/Application Support/Rux Emu Helper/receipts"
func receiptFile(_ emulator: String) -> String { receipts + "/" + emulator.lowercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) } + ".json" }

// What an app is known by: its program's size and when it was written.
func stamp(_ app: String) -> String? {
  guard let exe = NSDictionary(contentsOfFile: app + "/Contents/Info.plist")?["CFBundleExecutable"] as? String,
        let a = try? files.attributesOfItem(atPath: app + "/Contents/MacOS/" + exe) else { return nil }
  return "\((a[.size] as? NSNumber)?.intValue ?? 0)-\(Int((a[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0))"
}

// An emulator's receipt, where the app there is still the one it was written for.
func receiptOf(_ emulator: String, app: String) -> [String: Any]? {
  guard let data = files.contents(atPath: receiptFile(emulator)),
        let r = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let was = r["stamp"] as? String, was == stamp(app) else { return nil }
  return r
}

// A tool run to its end: whether it succeeded. `answer` is typed to it, for a disk image that asks to agree.
@discardableResult
func run(_ tool: String, _ args: [String], answer: String? = nil) -> Bool {
  let p = Process()
  p.executableURL = URL(fileURLWithPath: tool)
  p.arguments = args
  p.standardOutput = FileHandle.nullDevice
  p.standardError = FileHandle.nullDevice
  let typed = Pipe()
  p.standardInput = typed
  guard (try? p.run()) != nil else { return false }
  if let answer { typed.fileHandleForWriting.write(Data(answer.utf8)) }
  try? typed.fileHandleForWriting.close()
  p.waitUntilExit()
  return p.terminationStatus == 0
}

// A link's bytes into a file: whether they all came.
func fetched(_ url: URL, to path: String) -> Bool {
  let done = DispatchSemaphore(value: 0)
  var ok = false
  URLSession.shared.downloadTask(with: url) { tmp, response, _ in
    if (response as? HTTPURLResponse)?.statusCode == 200, let tmp {
      ok = (try? files.moveItem(atPath: tmp.path, toPath: path)) != nil
    }
    done.signal()
  }.resume()
  done.wait()
  return ok
}

// The first app of these names under a folder, three folders deep at most:
// where it is, and the name it is installed under. A download may name its
// app with its version after a hyphen, as PCSX2-v2.8.2.app, which is
// installed as PCSX2.app.
func appUnder(_ dir: String, _ names: [String], depth: Int = 3) -> (path: String, name: String)? {
  let entries = ((try? files.contentsOfDirectory(atPath: dir)) ?? []).sorted()
  let apps = entries.filter { $0.hasSuffix(".app") && isFolder(dir + "/" + $0) }
  if let hit = apps.first(where: { names.contains($0) }) { return (dir + "/" + hit, hit) }
  for e in apps {
    if let name = names.first(where: { e.hasPrefix(($0 as NSString).deletingPathExtension + "-") }) { return (dir + "/" + e, name) }
  }
  guard depth > 0 else { return nil }
  for e in entries where !e.hasSuffix(".app") && isFolder(dir + "/" + e) {
    if let hit = appUnder(dir + "/" + e, names, depth: depth - 1) { return hit }
  }
  return nil
}

// One emulator installed from its installer in Supabase: fetched by the
// site's signed link, checked, unpacked, and its app put in Applications in
// place of the one there, with a receipt naming the version.
func install(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let emulator = req["emulator"] as? String, let link = req["url"] as? String,
        let name = req["name"] as? String, let size = (req["size"] as? NSNumber)?.intValue,
        let sha1 = req["sha1"] as? String, let version = req["version"] as? String else {
    return (400, ["error": "Send an emulator, its installer's link, name, size and SHA-1, and its version."])
  }
  guard let rule = (rules["macSaves"] as? [String: Any])?[emulator] as? [String: Any] else { return (404, ["error": "\(emulator) is not an emulator Emu knows."]) }
  guard link.hasPrefix(collectionLinks), let url = URL(string: link) else { return (400, ["error": "An installer comes only from the collection in Supabase."]) }
  guard plainName(name), !name.contains("/") else { return (400, ["error": "The installer needs a plain name."]) }
  let apps = appsOf(rule)

  let tmp = NSTemporaryDirectory() + "rux-emu-install-" + UUID().uuidString
  guard (try? files.createDirectory(atPath: tmp, withIntermediateDirectories: true)) != nil else { return (500, ["error": "The helper could not make room to unpack it."]) }
  defer { try? files.removeItem(atPath: tmp) }
  let file = tmp + "/" + name
  guard fetched(url, to: file) else { return (502, ["error": "The installer did not arrive from Supabase. Try again."]) }
  guard ((try? files.attributesOfItem(atPath: file))?[.size] as? NSNumber)?.intValue == size,
        (fingerprint(file)?["sha1"] as? String) == sha1.lowercased() else {
    return (502, ["error": "The installer arrived but is not the file Supabase lists."])
  }

  // Unpacked layer by layer, since a download may wrap its app twice, as
  // Mesen's zip holds a zip and Cemu's a disk image: each layer is opened
  // into a folder of its own until one holds the app, three layers at most.
  var mounts: [String] = []
  defer { for m in mounts.reversed() { run("/usr/bin/hdiutil", ["detach", m, "-force"]) } }
  func unpack(_ archive: String, into dir: String) -> String? {
    try? files.createDirectory(atPath: dir, withIntermediateDirectories: true)
    let kind = (archive as NSString).lastPathComponent.lowercased()
    if kind.hasSuffix(".zip") {
      return run("/usr/bin/ditto", ["-x", "-k", archive, dir]) ? nil : "The installer did not unzip."
    } else if kind.hasSuffix(".dmg") {
      guard run("/usr/bin/hdiutil", ["attach", archive, "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", dir], answer: "Y\n") else {
        return "The installer's disk image did not open."
      }
      mounts.append(dir)
      return nil
    } else if kind.hasSuffix(".tar.gz") || kind.hasSuffix(".tgz") || kind.hasSuffix(".tar.xz") {
      return run("/usr/bin/tar", ["-xf", archive, "-C", dir]) ? nil : "The installer did not unpack."
    }
    return "The helper does not open that kind of installer."
  }
  let packed = { (p: String) in [".zip", ".dmg", ".tar.gz", ".tgz", ".tar.xz"].contains { p.lowercased().hasSuffix($0) } }
  var out = tmp + "/out"
  if let error = unpack(file, into: out) { return (error.hasPrefix("The helper does not") ? 415 : 500, ["error": error]) }
  for layer in 1...2 where appUnder(out, apps) == nil {
    guard let inner = walk(out).map({ $0.path }).first(where: packed) else { break }
    let next = tmp + "/out\(layer + 1)"
    if let error = unpack(inner, into: next) { return (500, ["error": error]) }
    out = next
  }
  guard let found = appUnder(out, apps) else { return (500, ["error": "The installer holds no \(apps.joined(separator: " or "))."]) }

  let app = found.name
  let dest = "/Applications/" + app
  if NSWorkspace.shared.runningApplications.contains(where: { $0.bundleURL?.resolvingSymlinksInPath().path == dest }) {
    return (409, ["error": "Quit \((app as NSString).deletingPathExtension) first, then install it again."])
  }
  // Copied beside its place first, so the app there goes only once the new one is whole.
  let staged = "/Applications/." + app + ".installing"
  try? files.removeItem(atPath: staged)
  guard run("/usr/bin/ditto", [found.path, staged]) else {
    try? files.removeItem(atPath: staged)
    return (500, ["error": "The helper could not write to Applications."])
  }
  try? files.removeItem(atPath: dest)
  guard (try? files.moveItem(atPath: staged, toPath: dest)) != nil else {
    try? files.removeItem(atPath: staged)
    return (500, ["error": "The helper could not put \(app) in Applications."])
  }

  let made = iso.string(from: Date())
  let receipt: [String: Any] = ["emulator": emulator, "app": app, "version": version, "installer": name, "sha1": sha1.lowercased(),
                                "installed": made, "stamp": orNull(stamp(dest))]
  try? files.createDirectory(atPath: receipts, withIntermediateDirectories: true)
  let written = (try? JSONSerialization.data(withJSONObject: receipt, options: [.prettyPrinted, .sortedKeys]))
    .map { files.createFile(atPath: receiptFile(emulator), contents: $0) } ?? false
  return (200, ["installed": app, "version": version, "receipt": written])
}

// MARK: The newest versions

// A feed's answer as JSON, or nil when it does not answer.
func asked(_ address: String) -> Any? {
  guard let url = URL(string: address) else { return nil }
  var req = URLRequest(url: url, timeoutInterval: 15)
  req.setValue("rux-emu-helper", forHTTPHeaderField: "User-Agent")
  req.setValue("application/json", forHTTPHeaderField: "Accept")
  let done = DispatchSemaphore(value: 0)
  var out: Any?
  URLSession.shared.dataTask(with: req) { data, response, _ in
    if (response as? HTTPURLResponse)?.statusCode == 200, let data { out = try? JSONSerialization.jsonObject(with: data) }
    done.signal()
  }.resume()
  done.wait()
  return out
}

// The newest version a feed names. A `github` project's is its latest
// release's tag; with `tags`, the greatest tag that pattern matches, for a
// project that tags without releasing; with `count`, the first tag and the
// commits from it to the second, as a rolling build numbers itself. Any
// other feed is a `url` and the `path` to the version in its JSON.
func newestOf(_ feed: [String: Any]) -> String? {
  if let repo = feed["github"] as? String {
    let api = "https://api.github.com/repos/\(repo)"
    if let count = feed["count"] as? [String], count.count == 2 {
      guard let n = (asked("\(api)/compare/\(count[0])...\(count[1])") as? [String: Any])?["ahead_by"] as? Int else { return nil }
      return "\(count[0])-\(n)"
    }
    if let pattern = feed["tags"] as? String {
      let names = (asked("\(api)/tags?per_page=100") as? [[String: Any]] ?? []).compactMap { $0["name"] as? String }
      return names.filter { $0.range(of: pattern, options: .regularExpression) != nil }.max()
    }
    return (asked("\(api)/releases/latest") as? [String: Any])?["tag_name"] as? String
  }
  guard let url = feed["url"] as? String, let path = feed["path"] as? String else { return nil }
  var v = asked(url)
  for k in path.components(separatedBy: ".") {
    if let i = Int(k) { v = (v as? [Any]).flatMap { $0.indices.contains(i) ? $0[i] : nil } } else { v = (v as? [String: Any])?[k] }
  }
  return v as? String
}

// Each emulator's newest version by its name, every feed asked at once. A
// whole answer is kept an hour, since GitHub answers 60 unsigned questions
// an hour and Status asks each time it opens.
var newestKept: (at: Date, found: [String: Any])?
let newestLock = NSLock()
func newest() -> [String: Any] {
  newestLock.lock()
  defer { newestLock.unlock() }
  if let kept = newestKept, Date().timeIntervalSince(kept.at) < 3600 { return kept.found }
  var feeds: [(name: String, feed: [String: Any])] = (rules["macSaves"] as? [String: Any] ?? [:]).compactMap { name, value in
    ((value as? [String: Any])?["feed"] as? [String: Any]).map { (name, $0) }
  }
  if let f = rules["frontend"] as? [String: Any], let name = f["name"] as? String, let feed = f["feed"] as? [String: Any] { feeds.append((name, feed)) }
  var found: [String: Any] = [:]
  let each = NSLock()
  DispatchQueue.concurrentPerform(iterations: feeds.count) { i in
    guard let v = newestOf(feeds[i].feed) else { return }
    each.lock()
    found[feeds[i].name] = v
    each.unlock()
  }
  if found.count == feeds.count { newestKept = (Date(), found) }
  return found
}

// MARK: The drive, for the site's scan

// A path inside the collection, links followed, or nil for one outside it.
func drivePath(_ rel: String) -> String? {
  guard let root = collection() else { return nil }
  let base = real(root.path)
  let p = URL(fileURLWithPath: base).appendingPathComponent(rel).standardizedFileURL.path
  let parent = (p as NSString).deletingLastPathComponent
  let resolved = exists(p) ? real(p) : (exists(parent) ? real(parent) : parent) + "/" + (p as NSString).lastPathComponent
  return resolved == base || resolved.hasPrefix(base + "/") ? resolved : nil
}

func isFolder(_ p: String) -> Bool {
  var dir: ObjCBool = false
  return files.fileExists(atPath: p, isDirectory: &dir) && dir.boolValue
}

let ms = { (d: Any?) in ((d as? Date)?.timeIntervalSince1970 ?? 0) * 1000 }

// A folder's visible entries, sorted by name, as the scan reads them.
func driveList(_ p: String) -> [[String: Any]] {
  let names = ((try? files.contentsOfDirectory(atPath: p)) ?? []).filter { !$0.hasPrefix(".") }
  return names.sorted { Array($0.utf16).lexicographicallyPrecedes(Array($1.utf16)) }.compactMap { name in
    guard let a = try? files.attributesOfItem(atPath: real(p + "/" + name)) else { return nil }
    let dir = a[.type] as? FileAttributeType == .typeDirectory
    return ["name": name, "dir": dir, "size": dir ? 0 : (a[.size] as? NSNumber)?.intValue ?? 0,
            "mtimeMs": dir ? 0 : ms(a[.modificationDate]), "birthtimeMs": dir ? 0 : ms(a[.creationDate])]
  }
}

// n bytes of a file from `at`, or the whole file.
func bytes(_ p: String, at: UInt64?, n: Int?) -> Data? {
  guard !isFolder(p), let h = FileHandle(forReadingAtPath: p) else { return nil }
  defer { try? h.close() }
  if let at { try? h.seek(toOffset: at) }
  return (n.map { try? h.read(upToCount: $0) } ?? (try? h.readToEnd())) ?? Data()
}

// A file's CRC32, MD5 and SHA-1 in one pass, the two digests of each chunk
// worked at once beside the CRC, so a disc is hashed as fast as it is read.
func fingerprint(_ p: String) -> [String: Any]? {
  guard !isFolder(p), let h = FileHandle(forReadingAtPath: p) else { return nil }
  defer { try? h.close() }
  var md5 = Insecure.MD5(), sha1 = Insecure.SHA1()
  var crc = crc32(0, nil, 0)
  while let chunk = try? h.read(upToCount: 8 << 20), !chunk.isEmpty {
    let both = DispatchGroup()
    DispatchQueue.global(qos: .userInitiated).async(group: both) { md5.update(data: chunk) }
    DispatchQueue.global(qos: .userInitiated).async(group: both) { sha1.update(data: chunk) }
    chunk.withUnsafeBytes { crc = crc32(crc, $0.bindMemory(to: Bytef.self).baseAddress, uInt($0.count)) }
    both.wait()
  }
  let hex = { (d: any Sequence<UInt8>) in d.map { String(format: "%02x", $0) }.joined() }
  return ["crc32": String(format: "%08x", crc), "md5": hex(md5.finalize()), "sha1": hex(sha1.finalize())]
}

// MARK: Downloads from the home server

let library = home + "/Emulation/roms"

// The home server's two addresses, from server.json inside the app.
let servers: (home: String?, public: String?) = {
  guard let url = Bundle.main.url(forResource: "server", withExtension: "json"),
        let data = try? Data(contentsOf: url),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: String] else { return (nil, nil) }
  return (json["home"], json["public"])
}()

// A system's folder name and a file's path within it: plain names only, so
// nothing the site sends can write outside the library.
func plainSystem(_ s: String) -> Bool { s.range(of: "^[a-z0-9]+$", options: .regularExpression) != nil }
func plainName(_ n: String) -> Bool {
  let parts = n.split(separator: "/", omittingEmptySubsequences: false)
  return !parts.isEmpty && parts.allSatisfy { !$0.isEmpty && $0 != "." && $0 != ".." && !$0.contains("\0") && !$0.hasPrefix(".") }
}

struct Wanted { let system: String; let name: String; let size: Int64; let sha1: String?; let token: String }

// A file's hidden part beside its place, and that part gone with the
// server's tag kept for resuming it.
func partOf(_ dest: String) -> String { (dest as NSString).deletingLastPathComponent + "/." + (dest as NSString).lastPathComponent + ".part" }
func removePart(_ part: String) { try? files.removeItem(atPath: part); try? files.removeItem(atPath: part + ".etag") }

// Each folder a file's going leaves empty goes too, up to the library itself.
func prune(_ dir: String) {
  var d = dir
  while d.hasPrefix(library + "/"), (try? files.contentsOfDirectory(atPath: d))?.isEmpty == true {
    try? files.removeItem(atPath: d)
    d = (d as NSString).deletingLastPathComponent
  }
}

final class Downloads: NSObject, URLSessionDataDelegate {
  static let shared = Downloads()
  private let lock = NSLock()
  private var jobs: [String: [String: Any]] = [:]
  private var order: [String] = []
  private var waiting: [Wanted] = []
  private var running = false
  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 60
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    config.urlCache = nil
    return URLSession(configuration: config, delegate: self, delegateQueue: nil)
  }()
  // The file arriving now.
  private var now: (want: Wanted, key: String, part: String, dest: String, handle: FileHandle?, got: Int64, total: Int64)?
  // Its name and its request, and each file dropped while it arrived: kept
  // under the lock, since Remove asks from another thread.
  private var arriving: String?
  private var fetch: URLSessionDataTask?
  private var dropped = Set<String>()

  // Changes a download still listed; one dropped since stays gone.
  private func set(_ key: String, _ fields: [String: Any]) {
    lock.lock(); defer { lock.unlock() }
    guard jobs[key] != nil else { return }
    jobs[key]?.merge(fields) { _, new in new }
  }

  // The file arriving has ended, however it ended.
  private func ended() {
    lock.lock()
    if let a = arriving { dropped.remove(a) }
    arriving = nil; fetch = nil
    lock.unlock()
    now = nil
  }

  // A file no longer wanted: off the queue and the list, and its part gone.
  // One arriving is stopped, and its part goes when the request ends.
  func drop(_ key: String) {
    lock.lock()
    waiting.removeAll { "\($0.system)/\($0.name)" == key }
    jobs[key] = nil
    order.removeAll { $0 == key }
    let stopping = arriving == key
    if stopping { dropped.insert(key); fetch?.cancel() }
    lock.unlock()
    if !stopping { removePart(partOf("\(library)/\(key)")) }
  }

  func list() -> [[String: Any]] {
    lock.lock(); defer { lock.unlock() }
    return order.compactMap { jobs[$0] }
  }

  // Queues each file not already in the library at its size.
  func add(_ wants: [Wanted]) -> Int {
    lock.lock()
    var added = 0
    for w in wants {
      let key = "\(w.system)/\(w.name)"
      let dest = "\(library)/\(key)"
      if let a = try? files.attributesOfItem(atPath: dest), (a[.size] as? NSNumber)?.int64Value == w.size { continue }
      if let state = jobs[key]?["state"] as? String, state == "waiting" || state == "downloading" { continue }
      if !order.contains(key) { order.append(key) }
      jobs[key] = ["system": w.system, "name": w.name, "state": "waiting", "done": 0, "total": w.size]
      waiting.append(w)
      added += 1
    }
    let start = !running && !waiting.isEmpty
    if start { running = true }
    lock.unlock()
    if start { DispatchQueue.global(qos: .utility).async { self.next() } }
    return added
  }

  // The home address when it answers within a second and a half, else the public name.
  private func base() -> (url: String, from: String)? {
    if let h = servers.home, let url = URL(string: h + "/") {
      var req = URLRequest(url: url, timeoutInterval: 1.5)
      req.cachePolicy = .reloadIgnoringLocalCacheData
      let done = DispatchSemaphore(value: 0)
      var ok = false
      URLSession.shared.dataTask(with: req) { _, r, _ in ok = (r as? HTTPURLResponse)?.statusCode == 200; done.signal() }.resume()
      done.wait()
      if ok { return (h, "home") }
    }
    return servers.public.map { ($0, "public") }
  }

  private func next() {
    lock.lock()
    guard !waiting.isEmpty else { running = false; lock.unlock(); return }
    let w = waiting.removeFirst()
    let key = "\(w.system)/\(w.name)"
    arriving = key
    lock.unlock()
    let dest = "\(library)/\(key)"
    let dir = (dest as NSString).deletingLastPathComponent
    let part = partOf(dest)
    guard let (url, from) = base() else { return fail(key, "The helper has no address for the home server.") }
    try? files.createDirectory(atPath: dir, withIntermediateDirectories: true)
    // A part only resumes with the server's tag for the file it began from.
    let tag = try? String(contentsOfFile: part + ".etag", encoding: .utf8)
    var have = (try? files.attributesOfItem(atPath: part))?[.size] as? NSNumber
    if tag == nil { try? files.removeItem(atPath: part); have = nil }
    let path = ([w.system] + w.name.split(separator: "/").map(String.init))
      .map { $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/?#"))) ?? $0 }
      .joined(separator: "/")
    guard let target = URL(string: "\(url)/roms/\(path)") else { return fail(key, "That file has no address.") }
    var req = URLRequest(url: target)
    req.setValue("Bearer \(w.token)", forHTTPHeaderField: "Authorization")
    if let have, have.int64Value > 0, let tag {
      req.setValue("bytes=\(have.int64Value)-", forHTTPHeaderField: "Range")
      req.setValue(tag, forHTTPHeaderField: "If-Range")
    }
    now = (w, key, part, dest, nil, have?.int64Value ?? 0, w.size)
    set(key, ["state": "downloading", "from": from, "done": have?.int64Value ?? 0])
    let asked = session.dataTask(with: req)
    lock.lock()
    let gone = dropped.remove(key) != nil
    if !gone { fetch = asked }
    lock.unlock()
    if gone { return stopped(part) }
    asked.resume()
  }

  // A part kept for resuming keeps its folder; a folder made for nothing goes.
  private func fail(_ key: String, _ why: String) {
    set(key, ["state": "failed", "error": why])
    prune(("\(library)/\(key)" as NSString).deletingLastPathComponent)
    ended()
    next()
  }

  // A file dropped as it arrived: what came goes, and the queue moves on.
  private func stopped(_ part: String) {
    removePart(part)
    prune((part as NSString).deletingLastPathComponent)
    ended()
    next()
  }

  func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                  completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
    guard var n = now, let r = response as? HTTPURLResponse else { return completionHandler(.cancel) }
    switch r.statusCode {
    case 200, 206:
      if r.statusCode == 200 { n.got = 0; files.createFile(atPath: n.part, contents: nil) }
      if !files.fileExists(atPath: n.part) { files.createFile(atPath: n.part, contents: nil) }
      if let tag = r.value(forHTTPHeaderField: "ETag") { try? tag.write(toFile: n.part + ".etag", atomically: true, encoding: .utf8) }
      n.handle = FileHandle(forWritingAtPath: n.part)
      _ = try? n.handle?.seek(toOffset: UInt64(n.got))
      try? n.handle?.truncate(atOffset: UInt64(n.got))
      now = n
      set(n.key, ["done": n.got])
      completionHandler(.allow)
    case 401: set(n.key, ["error": "Sign in again, then download it again."]); completionHandler(.cancel)
    case 403: set(n.key, ["error": "This account may not download."]); completionHandler(.cancel)
    case 404: set(n.key, ["error": "The home server does not have that file."]); completionHandler(.cancel)
    default: set(n.key, ["error": "The home server answered \(r.statusCode)."]); completionHandler(.cancel)
    }
  }

  func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    guard var n = now, let h = n.handle else { return }
    h.write(data)
    n.got += Int64(data.count)
    now = n
    set(n.key, ["done": n.got])
  }

  func urlSession(_ s: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let n = now else { return }
    try? n.handle?.close()
    lock.lock(); let gone = dropped.remove(n.key) != nil; let refused = jobs[n.key]?["error"] as? String; lock.unlock()
    if gone { return stopped(n.part) }
    if let refused { return fail(n.key, refused) }
    // Cut short: the part stays, so asking again resumes it.
    if let error { return fail(n.key, "The download stopped: \(error.localizedDescription) Ask again to resume it.") }
    guard n.got == n.total else {
      removePart(n.part)
      return fail(n.key, "The file arrived at \(n.got) bytes, not \(n.total).")
    }
    set(n.key, ["state": "checking"])
    if let want = n.want.sha1?.lowercased(), (fingerprint(n.part)?["sha1"] as? String) != want {
      removePart(n.part)
      return fail(n.key, "The file arrived but its SHA-1 does not match the collection's.")
    }
    // It takes its place under the lock, so one dropped while it was checked
    // does not, and one dropped after is removed from its place.
    lock.lock()
    let late = dropped.remove(n.key) != nil
    var placed = false
    if !late {
      try? files.removeItem(atPath: n.dest)
      placed = (try? files.moveItem(atPath: n.part, toPath: n.dest)) != nil
      if placed { arriving = nil; fetch = nil }
    }
    lock.unlock()
    if late { return stopped(n.part) }
    guard placed else { return fail(n.key, "The helper could not put the file in place.") }
    try? files.removeItem(atPath: n.part + ".etag")
    set(n.key, ["state": "done", "done": n.total])
    ended()
    next()
  }
}

func download(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let system = req["system"] as? String, plainSystem(system),
        let token = req["token"] as? String, !token.isEmpty,
        let list = req["files"] as? [[String: Any]], !list.isEmpty else { return (400, ["error": "Send a system, its files and a token."]) }
  var wants: [Wanted] = []
  for f in list {
    guard let name = f["name"] as? String, plainName(name), let size = (f["size"] as? NSNumber)?.int64Value else {
      return (400, ["error": "Each file needs a plain name and its size."])
    }
    wants.append(Wanted(system: system, name: name, size: size, sha1: f["sha1"] as? String, token: token))
  }
  if servers.home == nil && servers.public == nil { return (409, ["error": "This helper was built without the home server's addresses."]) }
  return (200, ["queued": Downloads.shared.add(wants)])
}

// Each game file the library holds, its system and its name within it.
func libraryFiles() -> [[String: Any]] {
  guard exists(library) else { return [] }
  return walk(library).compactMap { f in
    let rel = String(f.path.dropFirst(library.count + 1))
    guard let slash = rel.firstIndex(of: "/") else { return nil }
    return ["system": String(rel[..<slash]), "name": String(rel[rel.index(after: slash)...]), "size": f.size]
  }
}

// One file out of the library, by its system and its plain name within it,
// with its download stopped; the game's saves are elsewhere and stay.
func removeFromLibrary(_ path: String) -> (Int, [String: Any]) {
  let parts = path.split(separator: "/", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
  guard parts.count == 2, plainSystem(parts[0]), plainName(parts[1]) else { return (400, ["error": "Send a system and a plain name within it."]) }
  let dest = "\(library)/\(path)"
  guard !isFolder(dest) else { return (400, ["error": "That is a folder, not a game file."]) }
  Downloads.shared.drop(path)
  if exists(dest), (try? files.removeItem(atPath: dest)) == nil { return (500, ["error": "The helper could not remove that file."]) }
  prune((dest as NSString).deletingLastPathComponent)
  return (200, ["removed": path])
}

// How many bytes the library's drive has free, as Finder counts them.
func librarySpace() -> [String: Any] {
  let at = URL(fileURLWithPath: real(exists(library) ? library : home))
  let v = try? at.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey, .volumeAvailableCapacityKey])
  let important = v?.volumeAvailableCapacityForImportantUsage ?? 0
  return ["free": important > 0 ? important : Int64(v?.volumeAvailableCapacity ?? 0)]
}

// MARK: The local server

struct Request {
  let method: String, path: String, query: [String: String], origin: String?, length: Int
  init(_ head: String) {
    let lines = head.split(separator: "\r\n").map(String.init)
    let parts = (lines.first ?? "").split(separator: " ").map(String.init)
    let url = URLComponents(string: parts.count > 1 ? parts[1] : "/")
    let header = { (name: String) in lines.dropFirst().first { $0.lowercased().hasPrefix(name + ":") }
      .map { String($0.dropFirst(name.count + 1)).trimmingCharacters(in: .whitespaces) } }
    method = parts.first ?? ""
    path = url?.path ?? ""
    query = Dictionary((url?.queryItems ?? []).map { ($0.name, $0.value ?? "") }, uniquingKeysWith: { a, _ in a })
    origin = header("origin")
    length = header("content-length").flatMap { Int($0) } ?? 0
  }
}

enum Reply { case json(Int, [String: Any]), list(Int, [[String: Any]]), bytes(Data) }

final class Server {
  let listener: NWListener
  // The drive and save folders are read off the menu bar's thread.
  let work = DispatchQueue(label: "rux-emu-helper.work", qos: .userInitiated, attributes: .concurrent)

  init() throws {
    let params = NWParameters.tcp
    params.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: port)
    listener = try NWListener(using: params)
    listener.newConnectionHandler = { [weak self] c in self?.serve(c) }
    listener.start(queue: .main)
  }

  func serve(_ c: NWConnection) {
    c.start(queue: .main)
    read(c, Data())
  }

  // Reads until the headers are in, then the body they announce: a PUT's
  // straight into its file, any other's whole, up to a megabyte.
  func read(_ c: NWConnection, _ sofar: Data) {
    c.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, done, error in
      guard let self else { return }
      var all = sofar
      if let data { all.append(data) }
      if let split = all.range(of: Data("\r\n\r\n".utf8)) {
        let req = Request(String(decoding: all[..<split.lowerBound], as: UTF8.self))
        let body = Data(all[split.upperBound...])
        guard let origin = req.origin, allowedOrigins.contains(origin) else {
          return self.send(c, .json(403, ["error": "Only the Rux Emu site may ask."]), origin: nil)
        }
        if req.method == "PUT" { return self.upload(c, req, body, origin) }
        if body.count >= req.length { return self.answer(c, req, body.prefix(req.length), origin) }
      }
      if done || error != nil || all.count > 1_000_000 { c.cancel(); return }
      self.read(c, all)
    }
  }

  func answer(_ c: NWConnection, _ req: Request, _ body: Data, _ origin: String) {
    if req.method == "OPTIONS" { return send(c, nil, origin: origin) }
    let q = req.query
    let off = { (reply: @escaping () -> Reply) in
      self.work.async { let r = reply(); DispatchQueue.main.async { self.send(c, r, origin: origin) } }
    }
    let missing = Reply.json(404, ["error": "That is not in the collection."])
    switch (req.method, req.path) {
    case ("GET", "/status"): send(c, .json(200, status()), origin: origin)
    case ("POST", "/play"): let (code, out) = play(body); send(c, .json(code, out), origin: origin)
    case ("POST", "/download"): let (code, out) = download(body); send(c, .json(code, out), origin: origin)
    case ("GET", "/downloads"): send(c, .list(200, Downloads.shared.list()), origin: origin)
    case ("GET", "/library"): off { .list(200, libraryFiles()) }
    case ("GET", "/library/space"): off { .json(200, librarySpace()) }
    case ("DELETE", "/library/file"): let (code, out) = removeFromLibrary(q["path"] ?? ""); send(c, .json(code, out), origin: origin)
    case ("GET", "/mac"): off { .json(200, macReport()) }
    case ("POST", "/install"): off { let (code, out) = install(body); return .json(code, out) }
    case ("POST", "/update"): off { let (code, out) = update(body); return .json(code, out) }
    case ("GET", "/mac/saves"): off { .list(200, macSaves()) }
    case ("GET", "/mac/settings"): off { let (code, out) = settingsOf(q["emulator"] ?? ""); return .json(code, out) }
    case ("GET", "/mac/setting"):
      off { settingBytes(q["emulator"] ?? "", q["rel"] ?? "").map(Reply.bytes) ?? .json(404, ["error": "That is not a settings file this Mac keeps."]) }
    case ("POST", "/mac/setting"): off { let (code, out) = writeSetting(q["emulator"] ?? "", q["rel"] ?? "", body); return .json(code, out) }
    case ("POST", "/mac/manage"): off { let (code, out) = manage(body); return .json(code, out) }
    case ("GET", "/mac/carry"): off { let (code, out) = carry(q["emulator"] ?? ""); return .json(code, out) }
    case ("GET", "/mac/given"): off { let (code, out) = given(q["emulator"] ?? ""); return .json(code, out) }
    case ("GET", "/mac/carried"):
      off { carriedAt(q["path"] ?? "").flatMap { bytes($0.at, at: nil, n: nil) }.map(Reply.bytes) ?? .json(404, ["error": "That is not a save this Mac keeps."]) }
    case ("POST", "/mac/carried/mark"): off { let (code, out) = markCarried(q["path"] ?? "", q["sha1"] ?? ""); return .json(code, out) }
    case ("GET", "/newest"): off { .json(200, newest()) }
    case ("GET", "/mac/save"):
      off { macSavePath(q["stored"] ?? "").flatMap { bytes($0, at: nil, n: nil) }.map(Reply.bytes)
        ?? .json(404, ["error": "That is not a save this Mac keeps."]) }
    case ("GET", "/drive/list"):
      off { drivePath(q["path"] ?? "").map { .list(200, isFolder($0) ? driveList($0) : []) } ?? missing }
    case ("GET", "/drive/stat"):
      off {
        guard let p = drivePath(q["path"] ?? ""), !isFolder(p), let a = try? files.attributesOfItem(atPath: p) else { return missing }
        return .json(200, ["size": (a[.size] as? NSNumber)?.intValue ?? 0, "mtimeMs": ms(a[.modificationDate])])
      }
    case ("GET", "/drive/file"):
      off { drivePath(q["path"] ?? "").flatMap { bytes($0, at: q["at"].flatMap { UInt64($0) }, n: q["n"].flatMap { Int($0) }) }.map(Reply.bytes) ?? missing }
    case ("GET", "/drive/fingerprint"):
      off { drivePath(q["path"] ?? "").flatMap(fingerprint).map { .json(200, $0) } ?? missing }
    case ("DELETE", "/drive/file"):
      guard let p = drivePath(q["path"] ?? ""), exists(p), !isFolder(p), (try? files.removeItem(atPath: p)) != nil else { return send(c, missing, origin: origin) }
      send(c, .json(200, ["removed": q["path"] ?? ""]), origin: origin)
    default: send(c, .json(404, ["error": "No such call."]), origin: origin)
    }
  }

  // A PUT of a file on the drive or of a carried save: the body written
  // beside its file as it arrives, then put in its place, so a write cut
  // short leaves the file as it was.
  func upload(_ c: NWConnection, _ req: Request, _ first: Data, _ origin: String) {
    let path = req.query["path"] ?? ""
    var target: String? = nil
    var written: () -> Void = {}
    switch req.path {
    case "/drive/file":
      target = drivePath(path).flatMap { isFolder($0) ? nil : $0 }
    case "/mac/carried":
      guard let found = carriedAt(path) else { return send(c, .json(404, ["error": "That is not a save Emu carries."]), origin: origin) }
      let app = (appsOf(found.e.rule).first as NSString?)?.deletingPathExtension ?? found.e.name
      guard !playing(found.e.rule) else {
        return send(c, .json(409, ["error": "Quit \(app) first: a save cannot change under a running game."]), origin: origin)
      }
      target = found.at
      written = { carriedWritten(path, found.at, req.query["saved"]) }
    case "/mac/given":
      guard let found = givenAt(req.query["emulator"] ?? "", path) else { return send(c, .json(404, ["error": "That is not a file Emu gives that emulator."]), origin: origin) }
      let app = (appsOf(found.e.rule).first as NSString?)?.deletingPathExtension ?? found.e.name
      guard !playing(found.e.rule) else { return send(c, .json(409, ["error": "Quit \(app) first."]), origin: origin) }
      target = found.at
    default: break
    }
    guard let target else { return send(c, .json(404, ["error": "That is not in the collection."]), origin: origin) }
    let dir = (target as NSString).deletingLastPathComponent
    let part = dir + "/." + (target as NSString).lastPathComponent + ".part"
    guard (try? files.createDirectory(atPath: dir, withIntermediateDirectories: true)) != nil,
          files.createFile(atPath: part, contents: nil), let h = FileHandle(forWritingAtPath: part) else {
      return send(c, .json(500, ["error": "The helper could not write that file."]), origin: origin)
    }
    var left = req.length
    let take = { (d: Data) in let piece = d.prefix(left); h.write(piece); left -= piece.count }
    let finish = { (whole: Bool) in
      try? h.close()
      if whole, (try? files.removeItem(atPath: target)) != nil || !exists(target), (try? files.moveItem(atPath: part, toPath: target)) != nil {
        written()
        return self.send(c, .json(200, ["written": path]), origin: origin)
      }
      try? files.removeItem(atPath: part)
      self.send(c, .json(500, ["error": "The write did not finish."]), origin: origin)
    }
    func next() {
      if left <= 0 { return finish(true) }
      c.receive(minimumIncompleteLength: 1, maximumLength: 1 << 20) { data, _, done, error in
        if let data { take(data) }
        if left <= 0 { finish(true) } else if done || error != nil { finish(false) } else { next() }
      }
    }
    take(first)
    next()
  }

  func send(_ c: NWConnection, _ reply: Reply?, origin: String?) {
    var code = 204, type = "application/json", body = Data()
    switch reply {
    case .json(let n, let json)?: code = n; body = (try? JSONSerialization.data(withJSONObject: json)) ?? Data()
    case .list(let n, let json)?: code = n; body = (try? JSONSerialization.data(withJSONObject: json)) ?? Data()
    case .bytes(let data)?: code = 200; type = "application/octet-stream"; body = data
    case nil: break
    }
    var head = "HTTP/1.1 \(code) \(code < 300 ? "OK" : "Refused")\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nConnection: close\r\n"
    if let origin {
      // Chrome asks before a public site reaches this Mac; these headers say yes.
      head += "Access-Control-Allow-Origin: \(origin)\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE\r\n"
      head += "Access-Control-Allow-Headers: Content-Type\r\nAccess-Control-Allow-Private-Network: true\r\n"
    }
    c.send(content: Data((head + "\r\n").utf8) + body, completion: .contentProcessed { _ in c.cancel() })
  }
}

// MARK: The quit combo

// Holding + and pressing − on a controller quits the emulator in front, the
// same way in every emulator: it is asked to quit, as ⌘Q asks it, so it
// closes its game and writes its saves, and the site then carries them. An
// emulator Emu knows that is in front is the one; with none in front, the
// only one running. Each emulator quits without asking, as the settings Emu
// manages say, since no controller answers a dialog. Ryujinx answers the
// first ask by stopping its game, which closes its saves, and then stops
// answering, so an emulator still open four seconds later is asked again,
// and one still open twelve seconds after that is made to quit.
final class QuitCombo {
  static let shared = QuitCombo()
  private var watched = Set<ObjectIdentifier>()

  func start() {
    NotificationCenter.default.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] note in
      if let c = note.object as? GCController { self?.watch(c) }
    }
    GCController.controllers().forEach(watch)
  }

  // Background input is asked for once a controller is connected, since
  // asking before the first one crashes on some macOS versions.
  private func watch(_ c: GCController) {
    GCController.shouldMonitorBackgroundEvents = true
    guard let pad = c.extendedGamepad, watched.insert(ObjectIdentifier(c)).inserted else { return }
    pad.buttonOptions?.pressedChangedHandler = { _, _, pressed in
      guard pressed, pad.buttonMenu.isPressed else { return }
      DispatchQueue.main.async { quitEmulatorInFront() }
    }
  }
}

func quitEmulatorInFront() {
  let names = Set((rules["macSaves"] as? [String: Any] ?? [:]).values.compactMap { $0 as? [String: Any] }.flatMap(appsOf))
  let isEmulator = { (a: NSRunningApplication) in names.contains(a.bundleURL?.lastPathComponent ?? "") }
  let running = NSWorkspace.shared.runningApplications.filter(isEmulator)
  let front = NSWorkspace.shared.frontmostApplication.flatMap { isEmulator($0) ? $0 : nil }
  guard let target = front ?? (running.count == 1 ? running.first : nil) else { return }
  // An emulator whose rule says `quit: force` ignores a quit request and
  // writes a save a second after the game does, as Gopher64 does, so the
  // process running its game is ended two seconds after being asked.
  let rule = (rules["macSaves"] as? [String: Any] ?? [:]).values.compactMap { $0 as? [String: Any] }
    .first { appsOf($0).contains(target.bundleURL?.lastPathComponent ?? "") }
  if rule?["quit"] as? String == "force", let game = rule?["gameProcess"] as? String {
    guard let proc = NSWorkspace.shared.runningApplications.first(where: { $0.executableURL?.lastPathComponent == game }) else { return }
    proc.terminate()
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { if !proc.isTerminated { proc.forceTerminate() } }
    return
  }
  target.terminate()
  DispatchQueue.main.asyncAfter(deadline: .now() + 4) { if !target.isTerminated { target.terminate() } }
  DispatchQueue.main.asyncAfter(deadline: .now() + 16) { if !target.isTerminated { target.forceTerminate() } }
}

// MARK: The menu bar

final class Helper: NSObject, NSApplicationDelegate, NSMenuDelegate {
  var item: NSStatusItem!
  var server: Server?
  let state = NSMenuItem(title: "", action: nil, keyEquivalent: "")
  let waiting: NSMenuItem = {
    let item = NSMenuItem(title: "Saves waiting: open Rux Emu to carry them", action: nil, keyEquivalent: "")
    item.isHidden = true
    return item
  }()

  func applicationDidFinishLaunching(_ note: Notification) {
    item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    item.button?.image = NSImage(systemSymbolName: "gamecontroller", accessibilityDescription: "Rux Emu Helper")
    let menu = NSMenu()
    menu.delegate = self
    menu.addItem(NSMenuItem(title: "Rux Emu Helper", action: nil, keyEquivalent: ""))
    menu.addItem(state)
    menu.addItem(waiting)
    menu.addItem(NSMenuItem(title: "Hold + and press − on a controller to quit a game", action: nil, keyEquivalent: ""))
    menu.addItem(.separator())
    menu.addItem(NSMenuItem(title: "Open Rux Emu", action: #selector(openSite), keyEquivalent: ""))
    menu.addItem(NSMenuItem(title: "Quit Rux Emu Helper", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
    item.menu = menu
    do { server = try Server() } catch { state.title = "Could not listen for the site" }
    showWaiting = { [weak self] in
      DispatchQueue.global().async {
        let waiting = savesWaiting()
        DispatchQueue.main.async {
          self?.waiting.isHidden = !waiting
          self?.item.button?.image = NSImage(systemSymbolName: waiting ? "gamecontroller.fill" : "gamecontroller", accessibilityDescription: "Rux Emu Helper")
        }
      }
    }
    showWaiting()
    QuitCombo.shared.start()
    // Starts again at each log-in; macOS lists it in Login Items, where it can be turned off.
    try? SMAppService.mainApp.register()
  }

  func menuWillOpen(_ menu: NSMenu) {
    showWaiting()
    if server == nil { return }
    if let root = collection() { state.title = "Games on \(driveOf(root))" }
    else { state.title = exists(library) && !libraryFiles().isEmpty ? "Games on this Mac" : "No games plugged in" }
  }

  // Opened by a rux-emu:// link from the site: running is all it asks.
  func application(_ app: NSApplication, open urls: [URL]) {}

  @objc func openSite() { NSWorkspace.shared.open(site) }
}

let app = NSApplication.shared
let helper = Helper()
app.delegate = helper
app.setActivationPolicy(.accessory)
app.run()
