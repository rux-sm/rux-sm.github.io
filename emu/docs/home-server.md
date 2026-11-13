---
type: how-to
---

# The home server's game downloads

The collection lives on the home server, a TrueNAS machine, in the `games`
share of its `storage` pool. `emu/tools/serve-games.mjs` sends a game from
its `roms` folder to a request carrying the signed-in account's Supabase
access token. It reads the games and never writes them, and it resumes a
broken download. `emu/tools/serve-games.test.mjs` proves each refusal and
runs in `npm run check`.

The internet reaches it at a DuckDNS name, through two ports the AT&T
gateway forwards to the server: Caddy answers there, fetches and renews a
Let's Encrypt certificate by itself, and passes each request to the
download server. A third container tells DuckDNS the home's address every
five minutes. TrueNAS's own pages are not forwarded.

## Run it on the server

The server fetches the program from the published site each time it starts,
so a push to `main` reaches it on its next restart.

1. On duckdns.org, signed in, add a sub domain and keep the page's token
   private.
2. In TrueNAS, open **Apps**. The first time, choose the `storage` pool when
   it asks where apps live.
3. Choose **Discover Apps**, then the **⋮** menu, then **Install via YAML**;
   for the app already there, open it and choose **Edit**.
4. Name it `games`, paste the file below with the sub domain in place of
   `NAME` twice and the token in place of `TOKEN`, and choose **Save**.

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    command: caddy reverse-proxy --from NAME.duckdns.org --to games:8080
    ports:
      - "8081:80"
      - "8443:443"
    volumes:
      - caddy-data:/data
    depends_on:
      - games
  ddns:
    image: alpine:3
    restart: unless-stopped
    environment:
      DOMAIN: NAME
      TOKEN: TOKEN
    command: >-
      sh -c 'while true; do
      wget -qO- "https://www.duckdns.org/update?domains=$$DOMAIN&token=$$TOKEN&ip=";
      echo; sleep 300; done'
  games:
    image: node:24-alpine
    restart: unless-stopped
    command: >-
      sh -c "wget -qO /tmp/serve-games.mjs https://rux-sm.github.io/emu/tools/serve-games.mjs
      && exec node /tmp/serve-games.mjs"
    environment:
      GAMES: /games
      PORT: "8080"
    ports:
      - "8090:8080"
    volumes:
      - /mnt/storage/games:/games:ro
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - DAC_READ_SEARCH
volumes:
  caddy-data: {}
```

The games are mounted read-only, the container's own files cannot be
written, and it keeps only the right to read files whatever their
permissions say, which the share's SMB permissions need. Caddy keeps its
certificate in `caddy-data`, so a restart does not ask Let's Encrypt again.

5. In the gateway at `192.168.1.254`, open **Firewall**, then
   **NAT/Gaming**, then **Custom Services**, and add two: `Emu HTTPS`,
   ports 443 to 443, host port 8443, and `Emu HTTP`, ports 80 to 80, host
   port 8081, both TCP. Back on NAT/Gaming, add each for the device
   `192.168.1.234`.

## Check it

From a Mac at home, `http://192.168.1.234:8090/` answers `ok`, and a game's
address without a log-in answers `401`. From anywhere,
`https://NAME.duckdns.org/` answers `ok` with a valid certificate. A signed-in Emu page fetches a game
with its access token as `Authorization: Bearer`.

The app's **Logs** in TrueNAS print one line a request: the status, the
path, the account's id and the time taken. They never print a token.

## Settings

| Variable | What it is |
| :--- | :--- |
| `GAMES` | the collection folder, holding its roms folder |
| `PORT` | the port inside the container, 8080 by default |
| `ORIGINS` | the sites it answers, comma-separated; the published site and both local previews by default |
| `MEMBER_RPC` | the Supabase function that says an account may download, `is_owner` until `emu_is_member()` exists |

## The nightly scan

A container scans the collection at 4 a.m. each night, and once when it
starts, with `emu/tools/scan-roms.mjs --save`: the same scan as Update, saved
to Supabase the same way, so a game put on the server is in the Library the
next morning. It also puts each BIOS, key, firmware and installer put on the
server into Supabase, a newer installer in place of its emulator's older
one, and asks each emulator's project for its newest version out. It reads
the games read-only and keeps its fingerprints in its own `scan-cache`
volume, starting from the ones beside the games, so only a new or changed
file is read whole. It leaves the drive's backup zip as Update last saved it.

1. In the Supabase dashboard, open **Project Settings**, then **API Keys**,
   and make a new secret key named for the home server, if it has none. It
   reads and writes every account's rows, so it goes only into TrueNAS,
   never into a file here.
2. In TrueNAS, open **Apps**, the `games` app, then **Edit**. Add this
   service beside the others, with the key in place of `KEY`, and add
   `scan-cache: {}` under `volumes:` at the end beside `caddy-data`. Then
   **Save**.

```yaml
  scan:
    image: node:24-alpine
    restart: unless-stopped
    command: >-
      sh -c 'mkdir -p /tmp/emu/tools && cd /tmp/emu && while true; do
      wget -qO tools/scan-roms.mjs https://rux-sm.github.io/emu/tools/scan-roms.mjs
      && wget -qO scan.js https://rux-sm.github.io/emu/scan.js
      && wget -qO saves-rules.js https://rux-sm.github.io/emu/saves-rules.js
      && wget -qO scan-save.js https://rux-sm.github.io/emu/scan-save.js
      && wget -qO emulators.json https://rux-sm.github.io/emu/emulators.json
      && node tools/scan-roms.mjs /games --save;
      sleep $$(node -e "const n=new Date(),t=new Date(n);t.setHours(4,0,0,0);if(t<=n)t.setDate(t.getDate()+1);console.log(Math.round((t-n)/1000))");
      done'
    environment:
      CACHE: /cache
      SUPABASE_KEY: KEY
      TZ: America/Chicago
    volumes:
      - /mnt/storage/games:/games:ro
      - scan-cache:/cache
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - DAC_READ_SEARCH
```

The app's **Logs** print one line a night: how many games and drive saves
it found and what changed, such as `2 added, 1 gone`, or `nothing changed`,
and any project that gave no newest version.
A night whose scan fails prints why and tries again the next night.

## The copy of Supabase

`emu/tools/copy-supabase.mjs` keeps the server's own copy of everything
Supabase holds for Emu, so a save or a Mac's settings goes back by hand with
Supabase gone. It writes the newest copy of each file under its own name,
and every row of each Emu table as JSON, into the `backups` dataset. A fourth
container runs it once a day; no forwarded port reaches it.
`emu/tools/copy-supabase.test.mjs` runs each case in `npm run check`.

1. In TrueNAS, open **Datasets**, choose `storage`, then **Add Dataset**, and
   name it `backups`.
2. Open **Data Protection**, then **Periodic Snapshot Tasks**, then **Add**:
   the dataset `storage/backups`, daily, kept for 30 days. Add a second,
   monthly, kept for a year. The snapshots are the dated copies.
3. In the Supabase dashboard, open **Project Settings**, then **API Keys**,
   and make a new secret key named for the home server. It reads every
   account's rows, so it goes only into TrueNAS, never into a file here.
4. In TrueNAS, open **Apps**, the `games` app, then **Edit**. Add this
   service beside the others, with the key in place of `KEY`, and **Save**.

```yaml
  backup:
    image: node:24-alpine
    restart: unless-stopped
    command: >-
      sh -c 'while true; do
      wget -qO /tmp/copy-supabase.mjs https://rux-sm.github.io/emu/tools/copy-supabase.mjs
      && node /tmp/copy-supabase.mjs; sleep 86400; done'
    environment:
      BACKUPS: /backups
      SUPABASE_KEY: KEY
    volumes:
      - /mnt/storage/backups:/backups
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
```

The app's **Logs** print one line a run: how many files it copied, how many
were the same, how many it removed and how many failed. A first run copies
about 1.5 GB.

### Putting a save back from the copy

A carried save is at `owner/saves/<system>/` under its game's own name, and a
Mac's settings at `owner/settings/<Mac>/<emulator>/`. Copy the file into the
emulator's own folder on the Mac, as the Emulators page names it, with the
emulator closed. The notes on each game are in the `emu_notes` file of the
copy's `tables` folder.
