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

## Run it on the server

The server fetches the program from the published site each time it starts,
so a push to `main` reaches it on its next restart.

1. In TrueNAS, open **Apps**. The first time, choose the `storage` pool when
   it asks where apps live.
2. Choose **Discover Apps**, then the **⋮** menu, then **Install via YAML**.
3. Name it `games`, paste the file below, and choose **Save**.

```yaml
services:
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
```

The games are mounted read-only, the container's own files cannot be
written, and it keeps only the right to read files whatever their
permissions say, which the share's SMB permissions need.

## Check it

From a Mac at home, `http://192.168.1.234:8090/` answers `ok`, and a game's
address without a log-in answers `401`. A signed-in Emu page fetches a game
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
