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
| `WORLD_BOSS_FIRST_MIN` | `5` | Minutes after server start until the first world boss arrives |
| `WORLD_BOSS_EVERY_MIN` | `30` | Minutes between world boss arrivals |

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
creates its `blfs_players` table on first start. Every table the game creates
starts with `blfs_`, so it can share a database with other apps.

## How to play

- **Tap/click the ground** to walk (server-side A* pathfinding).
- **🗺️ เดินทาง** lists the exits of the room you're in; pick one and your character
  walks there. Arrows at the screen edge point to exits that are off-screen.
- **Tap a monster** to lock on. You walk into weapon range and trade hits based on ASPD.
  The alley gets harder from west to east:

  | Monster | Lv | Behaviour | Drops |
  |---|---|---|---|
  | หนูท่อลมปราณ | 2 | Fights back only when hit | coins, junk |
  | นกพิราบแย่งข้าว | 3 | Hit one and the pigeons near it join in | coins, feathers |
  | หมาจรจัดประจำซอย | 6 | Bites anyone who walks close | coins, junk, bones |

  Walk through the portal at the east end of the alley to reach **ชุมชนริมคลองสองพี่น้อง**
  (Lv 13–35). It has wooden stilt houses and a boardwalk over the canal, and
  you can wade through the light-green shallows:

  | Monster | Lv | Behaviour | Drops |
  |---|---|---|---|
  | ผักตบชวากลายพันธุ์ | 13 | Floats in the shallows and grabs anyone close; its hits **slow** you for 3 s | coins, hyacinth stems |
  | ตัวเงินตัวทอง | 17 | Shy until attacked; its bite **poisons** (4 dmg/s for 5 s); drops a lot of coins | coins, scales |
  | 👑 มวลน้ำท่วม (miniboss) | 24 | Every 7 s it telegraphs a **flood wave** (growing blue ring): step out of the 3-tile radius within 1.2 s or take 25 damage. Respawns every 2 min | coins, rescue badge, stems |

  Everyone who deals at least 10% of the boss's HP gets their own loot and full EXP.

  The portal at the east end of the canal leads to **ชานเมือง & โกดังร้าง**
  (Lv 26–50): rice fields in the west, wasp country in the middle, and a
  warehouse yard in the east:

  | Monster | Lv | Behaviour | Drops |
  |---|---|---|---|
  | หุ่นไล่กาสเต็ปเทพ | 26 | Stays in the rice fields and **dodges 30%** of hits | coins, straw |
  | ฝูงแตนแตกรัง | 30 | Hit one and the swarm joins in; stings **poison** (8 dmg/s) | coins, stingers |
  | ควายเหล็กคลั่ง | 34 | Stays on the dirt roads; every 6 s it **charges** from range at 3× speed for double damage | coins, horns |

  **🔊 World boss: รถพ่วงข้างแต่งซิ่งติดลำโพงงานวัด** (Lv 40, 9000 HP). It isn't
  there all the time: it arrives in the warehouse yard 5 minutes after the server starts,
  then every 30 minutes. Every room gets an announcement one minute before it
  arrives. Every 6 s it sends out a **bass blast** (4-tile radius, 70 damage). If
  nobody beats it within 10 minutes it drives off. Anyone who deals at least 5%
  of its HP gets loot (a guaranteed temple-fair speaker) and full EXP. Winning is
  announced server-wide. It never heals: when its target leaves, it goes after
  whoever is nearest.

- **🤖 AUTO** (outside the market) makes the bot hunt the nearest monster, loot
  your own drops, and drink below the HP % you set in 🎒. It picks the drink that
  best fits the HP you're missing: โอเลี้ยง heals 45, ชาเย็น heals 150. It won't
  start fights more than 2 levels above you, but it fights back if bitten. The
  bot runs on the server, so it keeps farming while the tab is in the background.
- EXP from a monster drops once you out-level it by more than 3, so each area
  eventually stops being worth farming.
- **Enter** to chat, **1** to drink a potion, **Esc** to close panels.
- **NPCs in the market:** ป้าศรี (โอเลี้ยง and ชาเย็น), เฮียเล้ง (weapons: broom, spatula, umbrella)
  and ช่างเจี๊ยบ, who crafts fashion from farmed materials: the **orange
  motorbike-taxi vest** (5 junk + 50 coins) and the **straw hat with a pigeon
  feather** (6 feathers + 2 bones + 80 coins). From the canal: the **woven
  hyacinth hat** (12 stems + 150 coins) and the **yellow flood-rescue raincoat**
  (rescue badge + 4 scales + 5 stems + 300 coins). From the suburbs: the
  **scarecrow hat** (15 straw + 400 coins) and the **temple-fair racer jacket**
  (speaker + 3 horns + 10 stingers + 800 coins). Other players see what you wear.
- **📋 The bounty board** in the market lists four jobs a day (two for the
  alley, one for the canal, one for the suburbs, each for a different monster), the same for everyone. Kill the monsters, then come back to
  the board to claim coins and EXP. The board resets at midnight Bangkok time.
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

Added after the MVP: the alley's pigeons and stray dogs, the daily bounty
board, a hat slot, room 03 (the canal) with its miniboss, and room 04 (the
suburbs) with the timed world boss.

Not built yet: room 05, parties, prop/pet slots, and the 1v1 board games.

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
  combat.js        damage roll, EXP/level-up, EXP falloff
  bounty.js        daily bounty progress and claims
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
are hashed with scrypt, and repeated wrong passwords or recovery codes lock the
name for five minutes.

- **Remember me** (on by default): the server issues a random 30-day device
  token. The browser keeps the token, never the password, and logs in with it
  automatically; only its SHA-256 is stored (`blfs_sessions`). Logging out from
  🎒 revokes it.
- **Forgot password:** registering shows a one-time **recovery code**
  (`XXXX-XXXX-XXXX`, stored as a scrypt hash). "ลืมรหัสผ่าน?" on the login screen
  takes name + code + new password, then issues a new code and signs out every
  remembered device. Accounts made before this feature get a code at their next
  login, and a new code can be requested in 🎒 with the current password. `store.js` has one async interface (`get`/`create`/`save`) with two
implementations: `PgStore`, which keeps each account as a row with the
profile in a JSONB column, and `JsonStore` for local play. Profiles save on
disconnect and every 30 s, and writes for the same account are queued so they
land in order.

**Art.** There are no image files. Characters, rats, drops and weapons are
ASCII pixel art in `client/src/art.js`. Tiles are drawn in code. Each look and
outfit combination is turned into a texture the first time it's needed.

### Protocol (JSON over WebSocket)

Client → server: `hello {mode: login|register|session|recover, name, password?, remember?, session?, code?}`, `logout {session}`, `recovery_new {password}`, `move {x,y}`, `attack {id}`, `chat {text}`,
`emote {e}`, `auto {on, pct}`, `use {item}`, `buy {npc, item}`, `craft {id}`,
`equip {item}`, `unequip {slot}`, `mg_open`, `mg_flip {i}`, `mg_close`, `ping`.

Server → client: `welcome`, `room` (full room state), `join`/`leave`,
`s` (delta snapshot `[id, x, y, hp, dir]`), `hit`, `die`, `gone`, `lvl`, `look`,
`chat`, `emote`, `fx`, `me` (your private profile), `auto`, `toast`, `sys`,
`announce` (server-wide, e.g. the world boss), `mg`, `error`.
