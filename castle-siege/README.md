# 🏰 Castle Siege — Endless Defense

A medieval tower-defense game built for **playing while you multitask**. Towers auto-fight,
your army auto-resummons, heroes auto-cast their skills, waves auto-start — you drop in
between tasks to spend gold, upgrade, and see how deep you can push.

![Castle Siege screenshot](screenshot.png)

## How to run it

No install, no server, no dependencies, fully offline:

1. Download this `castle-siege` folder (or clone the repo).
2. Double-click **`index.html`** — it opens in your browser (Chrome, Edge, or Firefox).
3. Click anywhere once and hit 🎵 for the soundtrack (browsers require a click before audio).

Progress **autosaves every wave**, per battlefield, in your browser's storage.

## Three battlefields

| Battlefield | Difficulty | Roads | Twist |
|---|---|---|---|
| Greenvale Meadow | Easy | 1 | The classic winding road — learn the trade |
| Amberfield Crossroads | Medium | 2 | Two war-roads converge on your gate |
| Ashen Pass | Hard | 3 | Three scorched paths meet in a killzone; richer gold |

Each keeps its own save slot and best-wave record. Endless waves, a **boss every 10th wave**
(4 rotating bosses that return stronger as tier II, III…), and Elite/Champion enemy rarities.

## Your arsenal

- **9 towers × 5 levels** — Archer, Cannon, Frost, Flame, Ballista, Poison, chain-lightning
  Storm Spire, **Gold Mint** (passive income) and **Holy Beacon** (damage aura). Armored
  enemies resist arrows — melt them with magic.
- **12 troop types** — set a keep-count per type and fallen troops **auto-resummon at a
  discount**; on multi-road maps the army reinforces the most threatened road automatically.
- **6 heroes** — Sir Aldric leads from wave 1; recruit Lyra, Magnus, Celeste, Bjorn, and Nyx
  as you push deeper (they unlock earlier on harder maps). At **Lv 3** each learns an
  auto-cast signature skill — Valor Slam, Arrow Storm, Meteor, Sanctuary, War Cry, Shadow
  Flurry — and at **Lv 8** a passive.
- **7 relics** — permanent tiered upgrades: troop damage, tower damage, army capacity, gold
  income, castle walls, hero power, faster resummons.
- **3 consumables** — click-target **Meteor Strike** (the boss-killer), **Horn of Renewal**
  (full army heal), **Frost Nova** (freeze everything). Stock up before boss waves.

## Multitask setup 😎

AUTO waves on → set army keep-counts → build Gold Mints → 3× speed → collapse the bottom
panel (▼). Check in when you hear the boss horn.

## Controls

| Input | Action |
|---|---|
| Click tower card → click tile | Build (Shift-click = several) |
| `1`–`9` | Tower hotkeys |
| Click a built tower | Upgrade / sell |
| Click a hero (or `H`) → click map | Reposition hero |
| `R` + click near a road | Set that road's rally point |
| `Space` / `F` / `Esc` | Pause / speed / cancel |

## Tech

Plain HTML5 canvas + JavaScript — no frameworks, no assets, no network. All art is
pre-rendered procedurally in code (`sprites.js`); the medieval score is generated live with
WebAudio (`music.js` — Karplus-Strong plucked lute, flute, drums, with calm/battle/boss
intensity layers).
