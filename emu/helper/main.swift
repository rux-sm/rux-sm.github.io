// Rux Emu Helper — the Mac's sidekick for the Rux Emu site.
//
// A menu bar app with no window. It answers the site on 127.0.0.1 only,
// and only requests whose Origin is the site's:
//
//   GET    /status         what the helper sees: the collection it found, and
//                          each system whose emulator is installed and can be
//                          played
//   POST   /play           { "system": "n64", "file": "<file in roms/n64/>" }
//                          opens that one game in its system's emulator
//   GET    /mac            how this Mac stands, read now: each app and its
//                          version, and each place an emulator saves to
//   GET    /mac/saves      each save this Mac keeps itself, not on the drive
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
//
// A download comes from the home server's address inside the home when it
// answers, since the router loops the public name back slowly, and from the
// public name otherwise; both are `server.json`, which build-helper.mjs puts
// inside the app from beside the games, so neither is in the public
// repository. It carries the signed-in account's access token, which the
// helper keeps only until that download ends. A file arrives beside its place
// as a hidden part, resumes from where it stopped, is checked against the
// SHA-1 the site sends, and only then takes its name. The library is
// `~/Emulation/roms/<system>/`, laid out as the collection's roms folder.
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

import AppKit
import CryptoKit
import Network
import ServiceManagement
import SystemConfiguration
import zlib

let version = "6"
let port: NWEndpoint.Port = 47647
let site = URL(string: "https://rux-sm.github.io/emu/")!
let allowedOrigins: Set<String> = ["https://rux-sm.github.io", "http://localhost:8641"]

// MARK: The collection

struct Launch { let app: String; let args: [String] }

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
          let app = l["app"] as? String, let args = l["args"] as? [String] else { continue }
    out[system] = Launch(app: app, args: args)
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

func status() -> [String: Any] {
  guard let root = collection() else { return ["app": "Rux Emu Helper", "version": version, "collection": NSNull(), "systems": []] }
  let playable = launches.filter { program($0.value.app) != nil }.keys.sorted()
  return ["app": "Rux Emu Helper", "version": version,
          "collection": ["path": root.path, "drive": root.deletingLastPathComponent().lastPathComponent],
          "systems": playable]
}

func play(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let system = req["system"] as? String, let file = req["file"] as? String else { return (400, ["error": "Send a system and a file."]) }
  guard let root = collection() else { return (409, ["error": "No collection is plugged in."]) }
  guard let launch = launches[system] else { return (404, ["error": "No emulator is set for \(system)."]) }
  guard let exe = program(launch.app) else { return (409, ["error": "\(launch.app) is not installed."]) }
  let base = root.appendingPathComponent("roms").appendingPathComponent(system).resolvingSymlinksInPath().standardizedFileURL
  let target = base.appendingPathComponent(file).resolvingSymlinksInPath().standardizedFileURL
  var dir: ObjCBool = false
  guard target.path.hasPrefix(base.path + "/"),
        FileManager.default.fileExists(atPath: target.path, isDirectory: &dir), !dir.boolValue else {
    return (404, ["error": "That game is not in the collection."])
  }
  let p = Process()
  p.executableURL = exe
  p.arguments = launch.args.map { $0 == "{file}" ? target.path : $0 }
  p.standardOutput = FileHandle.nullDevice
  p.standardError = FileHandle.nullDevice
  do { try p.run() } catch { return (500, ["error": "\(launch.app) did not start."]) }
  // The emulator comes to the front once its window is up.
  DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
    NSRunningApplication(processIdentifier: p.processIdentifier)?.activate()
  }
  return (200, ["playing": target.lastPathComponent, "with": launch.app])
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

// An app by any of its names in either Applications folder, with the version its bundle says.
func appOf(_ names: [String]) -> [String: Any]? {
  for dir in ["/Applications", home + "/Applications"] {
    for name in names where exists(dir + "/" + name) {
      let info = NSDictionary(contentsOfFile: dir + "/" + name + "/Contents/Info.plist")
      return ["path": tilde(dir + "/" + name), "version": orNull(info?["CFBundleShortVersionString"] as? String)]
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
    return clean(first("^\\s*\(key)\\s*=\\s*(.+)$", text, lines: true))
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
    emulators.append(["emulator": e.name, "systems": e.plays, "app": orNull(appOf(appsOf(e.rule))),
                      "data": orNull(e.home.map(tilde)), "places": places, "files": count, "size": size])
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

// Each save this Mac keeps itself, not on the drive: its emulator and the
// systems it plays, its path within its place for matching it to its game,
// `stored` naming it for /mac/save, the folder it came from for restoring
// it, its size, and when it was made and last saved.
func macSaves() -> [[String: Any]] {
  let drive = collection().map { real($0.path) + "/" }
  var out: [[String: Any]] = []
  for e in savers() {
    for place in e.places {
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

  private func set(_ key: String, _ fields: [String: Any]) {
    lock.lock(); defer { lock.unlock() }
    jobs[key, default: [:]].merge(fields) { _, new in new }
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
    lock.unlock()
    let key = "\(w.system)/\(w.name)"
    let dest = "\(library)/\(key)"
    let dir = (dest as NSString).deletingLastPathComponent
    let part = dir + "/." + (dest as NSString).lastPathComponent + ".part"
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
    session.dataTask(with: req).resume()
  }

  private func fail(_ key: String, _ why: String) {
    set(key, ["state": "failed", "error": why])
    now = nil
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
    lock.lock(); let refused = jobs[n.key]?["error"] as? String; lock.unlock()
    if let refused { return fail(n.key, refused) }
    // Cut short: the part stays, so asking again resumes it.
    if let error { return fail(n.key, "The download stopped: \(error.localizedDescription) Ask again to resume it.") }
    guard n.got == n.total else {
      try? files.removeItem(atPath: n.part); try? files.removeItem(atPath: n.part + ".etag")
      return fail(n.key, "The file arrived at \(n.got) bytes, not \(n.total).")
    }
    set(n.key, ["state": "checking"])
    if let want = n.want.sha1?.lowercased(), (fingerprint(n.part)?["sha1"] as? String) != want {
      try? files.removeItem(atPath: n.part); try? files.removeItem(atPath: n.part + ".etag")
      return fail(n.key, "The file arrived but its SHA-1 does not match the collection's.")
    }
    try? files.removeItem(atPath: n.dest)
    guard (try? files.moveItem(atPath: n.part, toPath: n.dest)) != nil else { return fail(n.key, "The helper could not put the file in place.") }
    try? files.removeItem(atPath: n.part + ".etag")
    set(n.key, ["state": "done", "done": n.total])
    now = nil
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
    case ("GET", "/mac"): off { .json(200, macReport()) }
    case ("GET", "/mac/saves"): off { .list(200, macSaves()) }
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

  // A PUT /drive/file: the body written beside its file as it arrives, then
  // put in its place, so a write cut short leaves the file as it was.
  func upload(_ c: NWConnection, _ req: Request, _ first: Data, _ origin: String) {
    guard req.path == "/drive/file", let target = drivePath(req.query["path"] ?? ""), !isFolder(target) else {
      return send(c, .json(404, ["error": "That is not in the collection."]), origin: origin)
    }
    let dir = (target as NSString).deletingLastPathComponent
    let part = dir + "/." + (target as NSString).lastPathComponent + ".part"
    guard (try? files.createDirectory(atPath: dir, withIntermediateDirectories: true)) != nil,
          files.createFile(atPath: part, contents: nil), let h = FileHandle(forWritingAtPath: part) else {
      return send(c, .json(500, ["error": "The helper could not write to the drive."]), origin: origin)
    }
    var left = req.length
    let take = { (d: Data) in let piece = d.prefix(left); h.write(piece); left -= piece.count }
    let finish = { (whole: Bool) in
      try? h.close()
      if whole, (try? files.removeItem(atPath: target)) != nil || !exists(target), (try? files.moveItem(atPath: part, toPath: target)) != nil {
        return self.send(c, .json(200, ["written": req.query["path"] ?? ""]), origin: origin)
      }
      try? files.removeItem(atPath: part)
      self.send(c, .json(500, ["error": "The write to the drive did not finish."]), origin: origin)
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

// MARK: The menu bar

final class Helper: NSObject, NSApplicationDelegate, NSMenuDelegate {
  var item: NSStatusItem!
  var server: Server?
  let state = NSMenuItem(title: "", action: nil, keyEquivalent: "")

  func applicationDidFinishLaunching(_ note: Notification) {
    item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    item.button?.image = NSImage(systemSymbolName: "gamecontroller", accessibilityDescription: "Rux Emu Helper")
    let menu = NSMenu()
    menu.delegate = self
    menu.addItem(NSMenuItem(title: "Rux Emu Helper", action: nil, keyEquivalent: ""))
    menu.addItem(state)
    menu.addItem(.separator())
    menu.addItem(NSMenuItem(title: "Open Rux Emu", action: #selector(openSite), keyEquivalent: ""))
    menu.addItem(NSMenuItem(title: "Quit Rux Emu Helper", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
    item.menu = menu
    do { server = try Server() } catch { state.title = "Could not listen for the site" }
    // Starts again at each log-in; macOS lists it in Login Items, where it can be turned off.
    try? SMAppService.mainApp.register()
  }

  func menuWillOpen(_ menu: NSMenu) {
    if server == nil { return }
    if let root = collection() { state.title = "Games on \(root.deletingLastPathComponent().lastPathComponent)" }
    else { state.title = "No games plugged in" }
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
