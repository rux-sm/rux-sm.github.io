// Rux Emu Helper — the Mac's sidekick for the Rux Emu site.
//
// A menu bar app with no window. It answers the site on 127.0.0.1 only,
// and only requests whose Origin is the site's, with two calls:
//
//   GET  /status   what the helper sees: the collection it found, and each
//                  system whose emulator is installed and can be played
//   POST /play     { "system": "n64", "file": "<file in roms/n64/>" } opens
//                  that one game in its system's emulator
//
// The collection is the first `/Volumes/<drive>/emulation` holding a `roms`
// folder. Each system's emulator and arguments are `launch` in the
// collection's `tools/emulators.json`, which `check-mac.mjs --install` puts
// there, so the helper plays every system the site knows, the same way ES-DE
// does. A file must sit inside `roms/<system>/` once links are followed, so
// nothing the site sends can open anything else.

import AppKit
import Network
import ServiceManagement

let version = "1"
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

func launches(_ root: URL) -> [String: Launch] {
  let file = root.appendingPathComponent("tools/emulators.json")
  guard let data = try? Data(contentsOf: file),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let systems = json["systems"] as? [String: Any] else { return [:] }
  var out: [String: Launch] = [:]
  for (system, value) in systems {
    guard let s = value as? [String: Any], let l = s["launch"] as? [String: Any],
          let app = l["app"] as? String, let args = l["args"] as? [String] else { continue }
    out[system] = Launch(app: app, args: args)
  }
  return out
}

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
  let playable = launches(root).filter { program($0.value.app) != nil }.keys.sorted()
  return ["app": "Rux Emu Helper", "version": version,
          "collection": ["path": root.path, "drive": root.deletingLastPathComponent().lastPathComponent],
          "systems": playable]
}

func play(_ body: Data) -> (Int, [String: Any]) {
  guard let req = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
        let system = req["system"] as? String, let file = req["file"] as? String else { return (400, ["error": "Send a system and a file."]) }
  guard let root = collection() else { return (409, ["error": "No collection is plugged in."]) }
  guard let launch = launches(root)[system] else { return (404, ["error": "No emulator is set for \(system)."]) }
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
