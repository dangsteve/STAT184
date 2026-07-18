# 🏰 Castle Siege — Endless Defense

A medieval tower-defense game built for playing **while you multitask**. Towers auto-fight,
your army auto-resummons, waves auto-start — you drop in between tasks to spend gold,
upgrade, and see how long you can last.

![Castle Siege screenshot](screenshot.png)

## How to run it locally

No install, no server, no dependencies. Just:

1. Download this `castle-siege` folder (or clone the repo).
2. Double-click **`index.html`** — it opens in your browser (Chrome, Edge, or Firefox).

Progress **autosaves every wave** (per browser), so you can close the tab and hit
*Continue* later. Note: the save lives in the browser's storage for that file location —
if you move the folder, the save starts fresh.

## The game

- **Endless waves** that scale forever. Every **10th wave is a boss** (4 rotating bosses
  that come back stronger as tier II, III…).
- **9 tower types**, each upgradeable **5 levels** (they change look as they grow):
  Archer, Cannon, Frost Spire, Flame Brazier, Ballista, Alchemy Lab (poison),
  Storm Spire (chain lightning), **Gold Mint** (passive income — the idle player's best
  friend) and **Holy Beacon** (damage aura for nearby towers).
- **12 troop types** you summon to fight on the road — Militia, Archers, Swordsmen,
  Spearmen, Crossbowmen, Berserkers, Knights, Battle Mages, Clerics (healers), Cavalry,
  Paladins, and Giants. They block enemies, they die, and — key feature — you set a
  **keep-count per type** and the game **auto-resummons** them with your gold while
  you're off doing something else. Each type is upgradeable (all future summons get stronger).
- **A hero, Sir Aldric**, fights from wave 1: cleaves crowds, slams packs of enemies,
  respawns when he falls. Train him with gold — his armor evolves every 5 levels.
- **14+ enemy types** with armor (use magic towers against armored foes!), healers,
  regenerators, and fast flankers — plus random **Elite** (purple) and **Champion** (gold)
  rarities worth extra gold, and themed SWARM / ARMORED / ELITE waves.
- **Castle lives**: 20. Normal enemies that slip through cost 1–3, bosses cost 10.

## Multitask setup 😎

1. Turn **AUTO** waves on (it's on by default).
2. Set your army keep-counts in the **Army** tab.
3. Build a couple of **Gold Mints**.
4. Crank speed to **3×** and go do your real work — glance over, spend gold, repeat.

## Controls

| Input | Action |
|---|---|
| Click tower card → click tile | Build (Shift-click to place several) |
| `1`–`9` | Tower build hotkeys |
| Click a built tower | Upgrade / sell |
| `H` + click | Move the hero |
| `R` + click | Set the army rally point |
| `Space` | Pause |
| `F` | Cycle game speed |
| `Esc` / right-click | Cancel / deselect |

Built with plain HTML5 canvas + JavaScript — all art drawn procedurally in code, sound
synthesized with WebAudio. No frameworks, no assets, works offline.
