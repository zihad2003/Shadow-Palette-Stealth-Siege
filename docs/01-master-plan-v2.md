# 🎮 Shadow Palette: Stealth & Siege — Master Plan v2

## 📋 Overview
- AOOP academic project — Spring Boot (REST, JPA, MySQL) backend + HTML5 Canvas/JS frontend
- Single shared 2.5D persistent world (Clash of Clans style) with roads connecting plots
- Raid model: **async, instanced** — attacker enters a private simulation built from the defender's last-saved layout. No real-time multiplayer sync needed anywhere in the game.

---

## 🌍 World & Onboarding Flow
1. Player picks 1 of **3 character models** (cosmetic only)
2. Player picks **1 of 5 camo colors** (permanent, used only during raid/escape — not swapped in real time)
3. Player browses the shared world map and freely selects a plot
4. Player receives a fixed starting coin amount, enough to build a decent starter base
5. Player enters **Build Mode** on their own 20×20 (400-tile) plot

---

## 🏗️ Build Phase

### Plot
- Fixed size: **20×20 = 400 tiles** per base (single grid, not multiple sub-plots)

### Buildings (max 16 tiles footprint each, 2–3 model variants each)
| Building | Suggested footprint | Purpose |
|---|---|---|
| Ink House | 3×3 (9 tiles) | Ink Energy generation/storage |
| Craft House | 4×4 (16 tiles) | Crafting/upgrades hub |
| Sleep House | 3×3 (9 tiles) | Player's own quarters (cosmetic/base identity) |
| Coin Generator | 4×3 (12 tiles) | Coin generation |

All buildings start **white** and are colorable, along with floor tiles, walls, and the gate.

### Color System
- 5 colors: **White, Red, Green, Blue, Yellow** (no Black — reserved so it never clashes with raid mode's grayscale filter)
- Each color has a **quota** on how much of the base surface can use it (prevents painting the whole base one color) — suggested: no single color may cover more than **35%** of total paintable tiles
- In raid mode, the whole world renders in grayscale for the attacker; each color maps to a distinct **luminance shade** so camouflage still works without literal color being visible:

| Color | Grayscale shade |
|---|---|
| White | lightest |
| Yellow | light-medium |
| Green | medium |
| Red | medium-dark |
| Blue | darkest |

### Defense (current scope — 2 types)
- **Lighthouse** — exactly **1 per base**, 3 selectable cosmetic models. Behaves like a real spotlight: cone-shaped beam (angle 45–60°, range 6–8 tiles), sweeps clockwise with random up/down oscillation (not a smooth uniform rotation).
- **PatrolRobot** — unlocked after **3 successful raids** elsewhere, brought home by spending coins. Roams randomly in Patrol state; escalates through Suspicious → Alert → Chasing → Searching based on player stealth.

*(LaserGrid deferred — not in current scope.)*

---

## 🥷 Raid Phase

1. Attacker enters a private instance built from defender's saved layout. Screen renders in **grayscale**.
2. Attacker enters via the gate — either **climb** (quiet, slower) or **break** (loud, faster, riskier).
3. Camo works by matching the player's fixed color-shade to the shade of the surface they're near.
4. Lighthouse core-beam always detects; edge-of-cone is dimmer, giving a partial-safety zone.
5. **Detection branches:**
   - Never detected → **Silent Extraction** — 1.0× loot, no chase.
   - Detected but escapes → **Escaped** — 1.5× loot.
   - Detected and caught → **Caught** — 0 loot (see penalty below).

## 🏃 Escape Phase (same view as raid — no separate mode for now)
- On alarm, the **gate locks**. Player must either find another exit or **break a wall block**.
- Wall break requires **~4 hits**; progress is **persistent** (never decays) even if interrupted.
- Player's run speed is **slightly faster** than PatrolRobot's — enabling a **kite loop**: hit wall → robot approaches → outrun/break line-of-sight → robot searches/gives up → return and land more hits → repeat until wall breaks → escape.
- On alarm: Lighthouse sweep speeds up and cone range extends slightly, keeping pressure on even while running.
- *(Stretch goal, only if time remains: an optional side-scrolling Escape Runner sequence triggered after breaking through the wall.)*

## ⚖️ Capture Penalty (medium tier — confirmed)
- Lose all loot carried that attempt
- That attempt does not count toward the 3-successful-raids PatrolRobot unlock progress
- Short cooldown before the player can start another raid

---

## 🏛️ Design Patterns

| Pattern | Application |
|---|---|
| **State** | Game phases (Build→Raid→Escape); Guard AI (Patrol→Suspicious→Alert→Chasing→Searching) |
| **Factory** | `BuildingFactory` (4 house types), `DefenseFactory` (Lighthouse, PatrolRobot) |
| **Strategy** | `CamouflageStrategy` — one of 5 color strategies, assigned once per player at setup |
| **Observer** | `AlarmSystem` (sensor) notifies Siren, AlertLight, Gate-lock, and PatrolRobot's state transition simultaneously |
| **Singleton** | `GameSessionManager` |
| **Builder** | `RaidSessionBuilder` (attacker + defender snapshot + config) |
| *(optional)* **Command** | Each wall-break "hit" as a Command object — clean way to model interruptible, persistent-progress actions |

---

## 🌐 Networking Scope
- **Pure REST — no WebSockets required.**
- World map browsing = simple GET requests (static shared data, not live-streamed)
- Own character movement = fully client-side (canvas), network calls only for discrete actions (buy plot, place building, start/complete raid)
- Raids run against a saved snapshot, never a live opponent — removes the entire real-time sync problem

---

## 🚀 Sprint Roadmap
- **Sprint 0:** UML/ER diagrams, finalize API contract, dev environment setup
- **Sprint 1:** Backend core — entities, REST APIs, plot/building CRUD
- **Sprint 2:** Frontend base builder — canvas grid, paint tool, building placement
- **Sprint 3:** Lighthouse cone mechanic + camo/stealth score logic (Strategy pattern)
- **Sprint 4:** PatrolRobot AI (State pattern) + Observer-based alarm system
- **Sprint 5:** Raid flow end-to-end — snapshot fetch, raid simulation, server-side validation
- **Sprint 6:** Escape mechanic — gate lock, wall-break/kite loop, penalties, polish
- **Sprint 7 (stretch):** Side-scrolling Escape Runner bonus mode, UML/report finalization

---
**Last Updated:** July 30, 2026
