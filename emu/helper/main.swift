// Rux Emu Helper — the Mac's sidekick for the Rux Emu site.
//
// A menu bar app with no window. It answers the site on 127.0.0.1 only,
// and only requests whose Origin is the site's, with three calls:
//
//   GET  /status   what the helper sees: the collection it found, and each
//                  system whose emulator is installed and can be played
//   GET  /mac      how this Mac stands, read now: the report check-mac.mjs
//                  writes, less the saves it copies
//   POST /play     { "system": "n64", "file": "<file in roms/n64/>" } opens
//                  that one game in its system's emulator
//
// The collection is the first `/Volumes/<drive>/emulation` holding a `roms`
// folder. What the helper knows of each emulator, how it opens a game and
// where it keeps saves on a Mac, is the site's `emulators.json`, which
// build-helper.mjs puts inside the app, so it reads a Mac with no drive
// plugged in. A file must sit inside `roms/<system>/` once links are
// followed, so nothing the site sends can open anything else.

import AppKit
import Network
import ServiceManagement
import SystemConfiguration

let version = "2"
let port: NWEndpoint.Port = 47647
let site = URL(string: "https://rux-sm.github.io/emu/")!
let allowedOrigins: Set<String> = ["https://rux-sm.github.io", "http://localhost:8641"]

// MARK: The collection

struct Launch { let app: String; let args: [String] }

func collection() -> URL? {
  let volumes = (try? FileManager.default.contentsOfDirectory(atPath: "/Volumes")) ?? []
  for name in volumes.sorted() {
    let root = URL(fileURLWithPath: "/Volumes").appendingPathComponent(name).appendingPathComponent("emulation")
    var dir: ObjCBool = false
    if FileManager.default.fileExists(atPath: root.appendingPathComponent("roms").path, isDirectory: &dir), dir.boolValue { return root }
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

// How this Mac stands, as check-mac.mjs says it: its macOS, ES-DE's and each
// emulator's app and version, the folder ES-DE reads games from, each place
// an emulator saves to with how many files it holds, and how many files each
// retired app still holds. A place's setting in the emulator's own settings
// file wins over its default.

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

func macReport() -> [String: Any] {
  let frontend = rules["frontend"] as? [String: Any] ?? [:]
  let systems = rules["systems"] as? [String: Any] ?? [:]
  let homeOf = { (w: [String: Any]) in (w["homes"] as? [String] ?? []).map(expand).first(where: exists) }
  let appsOf = { (w: [String: Any]) in w["apps"] as? [String] ?? [] }

  // The folder ES-DE reads games from, from its own settings file.
  let esde = expand(frontend["settings"] as? String ?? "") + "/" + (frontend["config"] as? String ?? "")
  let roms = (try? String(contentsOfFile: esde, encoding: .utf8)).flatMap { first("<string name=\"ROMDirectory\" value=\"([^\"]*)\"", $0) }

  var emulators: [[String: Any]] = []
  // Every folder an emulator saves to, so a retired app's folder holding them is not counted twice.
  var gathered: [String] = []
  for (emulator, value) in rules["macSaves"] as? [String: Any] ?? [:] {
    guard let w = value as? [String: Any] else { continue }
    let homeDir = homeOf(w)
    let plays = systems.compactMap { ($0.value as? [String: Any])?["emulator"] as? String == emulator ? $0.key : nil }.sorted()
    var places: [[String: Any]] = []
    var count = 0, size = 0
    if let homeDir {
      for (place, dir, from) in placesOf(w, homeDir) {
        if let dir { gathered.append(dir) }
        let found = dir.map(exists) ?? false
        // A folder linked to the drive, as Ryujinx's is, is said where the link leads.
        let shown = dir.map { found ? real($0) : $0 }
        var n = 0
        if let dir, found {
          let include = (place["include"] as? String).flatMap { try? NSRegularExpression(pattern: $0) }
          for f in walk(dir) where f.size < 50_000_000 {
            let rel = String(f.path.dropFirst(dir.count + 1))
            if let include, !["/" + rel, rel].contains(where: { include.firstMatch(in: $0, range: NSRange($0.startIndex..., in: $0)) != nil }) { continue }
            n += 1; size += f.size
          }
        }
        count += n
        places.append(["dir": orNull(shown.map(tilde)), "from": from, "found": found, "files": n])
      }
    }
    emulators.append(["emulator": emulator, "systems": plays, "app": orNull(appOf(appsOf(w))),
                      "data": orNull(homeDir.map(tilde)), "places": places, "files": count, "size": size])
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
  let made = ISO8601DateFormatter()
  made.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return [
    "mac": SCDynamicStoreCopyComputerName(nil, nil) as String? ?? ProcessInfo.processInfo.hostName,
    "made": made.string(from: Date()),
    "macos": "\(v.majorVersion).\(v.minorVersion)" + (v.patchVersion > 0 ? ".\(v.patchVersion)" : ""),
    "chip": chip,
    "frontend": ["name": frontend["name"] as? String ?? "ES-DE", "app": orNull(appOf(appsOf(frontend))), "romDirectory": orNull(roms.map(tilde))],
    "emulators": emulators,
  ]
}

// MARK: The local server

final class Server {
  let listener: NWListener

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

  // Reads until the headers and the body they announce are in.
  func read(_ c: NWConnection, _ sofar: Data) {
    c.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, done, error in
      var all = sofar
      if let data { all.append(data) }
      if let split = all.range(of: Data("\r\n\r\n".utf8)) {
        let head = String(decoding: all[..<split.lowerBound], as: UTF8.self)
        let length = head.split(separator: "\r\n").first { $0.lowercased().hasPrefix("content-length:") }
          .flatMap { Int($0.split(separator: ":")[1].trimmingCharacters(in: .whitespaces)) } ?? 0
        let body = all[split.upperBound...]
        if body.count >= length { self?.answer(c, head, Data(body.prefix(length))); return }
      }
      if done || error != nil || all.count > 1_000_000 { c.cancel(); return }
      self?.read(c, all)
    }
  }

  func answer(_ c: NWConnection, _ head: String, _ body: Data) {
    let lines = head.split(separator: "\r\n").map(String.init)
    let parts = (lines.first ?? "").split(separator: " ").map(String.init)
    let method = parts.first ?? "", path = parts.count > 1 ? parts[1] : ""
    let header = { (name: String) in lines.dropFirst().first { $0.lowercased().hasPrefix(name + ":") }
      .map { String($0.dropFirst(name.count + 1)).trimmingCharacters(in: .whitespaces) } }
    guard let origin = header("origin"), allowedOrigins.contains(origin) else {
      return send(c, 403, ["error": "Only the Rux Emu site may ask."], origin: nil)
    }
    if method == "OPTIONS" { return send(c, 204, nil, origin: origin) }
    switch (method, path) {
    case ("GET", "/status"): send(c, 200, status(), origin: origin)
    case ("GET", "/mac"):
      // Counting each save folder's files takes a moment, so it is done off the menu bar's thread.
      DispatchQueue.global(qos: .userInitiated).async {
        let report = macReport()
        DispatchQueue.main.async { self.send(c, 200, report, origin: origin) }
      }
    case ("POST", "/play"): let (code, out) = play(body); send(c, code, out, origin: origin)
    default: send(c, 404, ["error": "No such call."], origin: origin)
    }
  }

  func send(_ c: NWConnection, _ code: Int, _ json: [String: Any]?, origin: String?) {
    let body = json.flatMap { try? JSONSerialization.data(withJSONObject: $0) } ?? Data()
    var head = "HTTP/1.1 \(code) \(code < 300 ? "OK" : "Refused")\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\nConnection: close\r\n"
    if let origin {
      // Chrome asks before a public site reaches this Mac; these headers say yes.
      head += "Access-Control-Allow-Origin: \(origin)\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST\r\n"
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
