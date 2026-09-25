# Bang Li Fantasy · บางลี่แลนด์

A 2D pixel-art social sandbox MMORPG that runs in the browser, set in a playful
parody of ตลาดบางลี่. Players log in and spawn in the market, chat with bubbles
over their heads, go to the back alley to fight sewer rats (by clicking or with
the server-side auto-farm), and turn the junk they collect into fashion.

The full design is in [docs/GDD.md](docs/GDD.md). This repository contains the
**MVP (GDD §5, milestones 1–5)**.

## Quick start

```bash
npm install
npm start          # http://localhost:3000
npm test           # server + shared logic tests (node:test)
```

Open the URL in two browser windows (or on a phone on the same network),
register a character name with a password, and you are in. Log in with the
same name and password from any device.

| Env var        | Default             | Purpose |
|----------------|---------------------|---------|
| `PORT`         | `3000`              | HTTP + WebSocket port |
| `DATABASE_URL` | (unset)             | Postgres connection string. When set, accounts are stored in Postgres. |
| `DATA_FILE`    | `data/players.json` | JSON file used when `DATABASE_URL` is unset (local play) |

To run the Postgres tests locally, point `TEST_DATABASE_URL` at an empty
database. CI always runs them against a Postgres service.

## Deploy (for play-testing)

The game needs a Node.js server with WebSockets, so static hosts like GitHub
Pages won't work. [Render](https://render.com)'s free plan works, and
`render.yaml` is included:

1. Sign in to Render with GitHub, then choose **New → Blueprint**.
2. Pick this repository and the branch to deploy. Render reads `render.yaml`
   and creates the `bangli-fantasy` web service.
3. When the deploy finishes, open the `https://bangli-fantasy-….onrender.com` URL.

Free-plan caveat: the service sleeps after about 15 minutes without traffic,
so the first visit afterwards takes 30–60 s to wake it up.

**Keep accounts across redeploys.** Render's disk is wiped on every restart,
so without a database every character is lost. Create a free Postgres
database (for example on [Neon](https://neon.tech) or
[Supabase](https://supabase.com)), copy its connection string, and add it to
the Render service as the environment variable `DATABASE_URL`. The server
creates its `players` table on first start.

## How to play

- **Tap/click the ground** to walk (server-side A* pathfinding).
- **Tap a rat** to lock on. You walk into weapon range and trade hits based on ASPD.
- **🤖 AUTO** (only in the alley) makes the bot find the nearest rat, loot your
  own drops, and drink โอเลี้ยง below the HP % you set in 🎒. The bot runs on
  the server, so it keeps farming while the tab is in the background.
- **Enter** to chat, **1** to drink a potion, **Esc** to close panels.
- **NPCs in the market:** ป้าศรี (potions), เฮียเล้ง (weapons: broom, spatula, umbrella)
  and ช่างเจี๊ยบ, who crafts the **orange motorbike-taxi vest** from 5 junk + 50 coins.
- **The café table** (or the 🎴 button, usable anywhere) opens a close-up
  card-matching minigame that pays coins. The world keeps running underneath it.

## MVP scope vs. GDD

| Milestone | Status | Where |
|---|---|---|
| 1. Character walks on a tilemap; 2 rooms joined by portals | ✅ | `shared/maps.js`, `server/room.js`, `client/src/WorldScene.js` |
| 2. Market is a Safe Zone; real-time bubble chat for many players | ✅ plus emotes (ไหว้ / นั่งยอง / ท่าแว้น / เต้น) | `server/world.js` (`chat`, `emote`) |
| 3. Alley has sewer rats; click to attack, damage numbers, coin + junk drops | ✅ plus EXP/levels, death & respawn | `server/room.js`, `server/combat.js` |
| 4. Auto-farm button | ✅ with auto-potion % and idle-tab support | `GameRoom.botThink` |
| 5. Close-up minigame + one fashion item in a shop | ✅ card matching + craftable vest | `server/minigame.js`, `client/src/minigame.js`, tailor NPC |

The GDD's three basic weapons are in too: the broom hits nearby enemies for 50%
splash damage, the spatula adds +25% crit chance, and the umbrella has a 30%
chance to block a hit.

Not built yet (post-MVP): rooms 03–05, the bounty board, more monsters and
bosses, parties, hat/prop/pet slots, and the 1v1 board games.

## Architecture

```
client/            static, no build step: served as ES modules
  index.html       DOM HUD, chat, panels, close-up overlay
  style.css
  src/main.js      boot, login, Phaser game
  src/WorldScene.js  map rendering, interpolation, input -> intents
  src/ui.js        HUD / shop / tailor / bag panels
  src/minigame.js  close-up card-matching overlay
  src/art.js       pixel art as ASCII data (characters, rat, drops, weapons)
  src/textures.js  turns art + procedural tiles into Phaser textures at runtime
shared/            imported by both server and browser
  constants.js     items, weapons, monsters, shops, recipes, stat formulas
  maps.js          ASCII room maps, portals, NPCs, spawn zones
  pathfinding.js   8-direction A*
server/
  index.js         http static server + WebSocket (ws) on /ws
  world.js         sessions, login, message routing, room transfers
  room.js          authoritative room simulation (tick 10 Hz)
  combat.js        damage roll, EXP/level-up
  minigame.js      server-authoritative memory match
  auth.js          password hashing, login rate limiting
  store.js         player persistence (Postgres or JSON file)
test/              node:test suites
```

**Server authority.** Clients only send intents such as `move {x,y}` and
`attack {id}`. Each room runs at 10 ticks/s. It moves entities along A* paths
and resolves hits, drops, EXP and the auto-farm bot, then sends a delta
snapshot `s` with only the entities that changed. Walking onto a portal tile
removes the player from one room and adds them to another, like GDD §4's
`leave_room`/`join_room`, and the client redraws for the new room.

**Why `ws` instead of Colyseus.** The GDD lists Colyseus as an option. For the
MVP, a room layer written directly on `ws` has less to learn, no schema build
step, and is easy to test in-process: the tests drive a `World` with a fake
clock and a seeded RNG, with no sockets. The room/message design follows
Colyseus closely, so switching later would be mostly mechanical.

**Accounts and persistence.** Players register a name and password. Passwords
are hashed with scrypt, and repeated wrong passwords lock the name for five
minutes. `store.js` has one async interface (`get`/`create`/`save`) with two
implementations: `PgStore`, which keeps each account as a row with the
profile in a JSONB column, and `JsonStore` for local play. Profiles save on
disconnect and every 30 s, and writes for the same account are queued so they
land in order.

**Art.** There are no image files. Characters, rats, drops and weapons are
ASCII pixel art in `client/src/art.js`. Tiles are drawn in code. Each look and
outfit combination is turned into a texture the first time it's needed.

### Protocol (JSON over WebSocket)

Client → server: `hello {name, password, mode: login|register}`, `move {x,y}`, `attack {id}`, `chat {text}`,
`emote {e}`, `auto {on, pct}`, `use {item}`, `buy {npc, item}`, `craft {id}`,
`equip {item}`, `unequip {slot}`, `mg_open`, `mg_flip {i}`, `mg_close`, `ping`.

Server → client: `welcome`, `room` (full room state), `join`/`leave`,
`s` (delta snapshot `[id, x, y, hp, dir]`), `hit`, `die`, `gone`, `lvl`, `look`,
`chat`, `emote`, `fx`, `me` (your private profile), `auto`, `toast`, `sys`,
`mg`, `error`.
