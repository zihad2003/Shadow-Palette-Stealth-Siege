# Game Design Document v2 — Shadow Palette: Stealth & Siege

## 1. Onboarding
- Character model: 3 cosmetic options, no gameplay difference
- Camo color: 5 options (White, Red, Green, Blue, Yellow), chosen at setup; body color can be changed later at the Makeup House (raid locks camo for that attempt)
- Starting coins: 500 (enough for ~2-3 Lvl-1 buildings; tune after playtesting)
- **New user → new base automatically** — no world-map / plot selection step

## 2. Economy
| Resource | Source | Sink |
|---|---|---|
| Coins | Raids, daily login (+100/day) | Building place/upgrades, unlocking PatrolRobot |
| Ink Energy | Regenerates +1/min (cap 100), or instant refill via coins | Painting a tile (5 Ink), placing a building (15 Ink) |
| Chips | Stored on base, stolen in raids | Traded 1:1 for coins, or spent on Prestige |

## 3. Home Base (Plot)
- Grid: **48×40 = 1920 tiles** (`MAP_COLS`/`MAP_ROWS` in `frontend/src/gamemap/mapConfig.js`; backend `Colors.PLOT_TOTAL_TILES` must match)
- Playable fortress board shared visually with raid mode (colored at home, grayscale in raid)
- Starter buildings pre-placed as **ruins**; player walks to them and repairs with F (no menu placement)
- First base: **auto-assigned on `POST /player/setup`** — player never picks a sector on a world map
- Expansion plots: out of scope / deferred

## 4. Buildings
> Current build uses a uniform **2×2** footprint for all houses (`starterRuins.js`). The table below is the design target; align code or table before finalizing.

| Building | Footprint (≤16 tile cap) | Levels | Effect per level |
|---|---|---|---|
| Ink House | 3×3 = 9 | 1–3 | +Ink regen rate |
| Craft House | 4×4 = 16 | 1–3 | Unlocks higher-tier upgrades |
| Sleep House | 3×3 = 9 | 1–3 | Cosmetic / base identity only |
| Coin Generator | 4×3 = 12 | 1–3 | +Coin generation rate |

Upgrade costs (all buildings, all levels — same scale as before):
| Level | Coins | Ink |
|---|---|---|
| Lvl 1 | 100 | 10 |
| Lvl 2 | 300 | 25 |
| Lvl 3 | 750 | 50 |

## 5. Color Quota
- No single color may cover more than **35%** of total paintable surface (floor + building faces + wall) on one base
- Enforced client-side (soft warning) and server-side (hard reject on save) to prevent degenerate all-one-color bases

## 6. Lighthouse (Spotlight)
```
cone_angle = 45–60 degrees
cone_range = 6–8 tiles
sweep = clockwise, base speed 1 rotation per 12 sec
oscillation = random vertical bob, ±15 degrees, every 1–2 sec
```
- **Core zone** (inner 60% of cone): always detects, regardless of color match
- **Edge zone** (outer 40% of cone): detection chance reduced if color/shade matches surroundings

## 7. Stealth Detection Formula
```
in_core_zone → always detected
in_edge_zone:
    detected = true UNLESS player_shade == surrounding_shade
outside_cone:
    detected = false (safe by default, unless PatrolRobot line-of-sight)
```

## 8. Guard AI State Thresholds (PatrolRobot)
| State | Trigger |
|---|---|
| Patrol | Default |
| Suspicious | Player briefly in edge-zone mismatch, or near-miss line-of-sight |
| Alert | Player detected in core-zone or sustained edge-zone mismatch (3 ticks) |
| Chasing | Alert confirmed — robot moves directly toward player's last known position |
| Searching | Line-of-sight lost during chase — robot searches expanding radius around last-seen point for ~15–20 sec, then reverts to Patrol |

## 9. Escape Mechanic — Wall Break
- Requires **4 hits** to fully break one wall block
- Each hit takes ~2 sec of stationary action
- Progress is **permanent** — interruption never resets or decays it
- Player run speed: **1.25×** PatrolRobot's chase speed (gives a reliable kiting window)
- On alarm: Lighthouse sweep speed +25%, cone range +1 tile

## 10. Raid Outcomes & Loot
| Outcome | Condition | Loot Multiplier |
|---|---|---|
| Silent Extraction | Never detected | 1.0× |
| Detected but Escaped | Alarm triggered, player breaks out successfully | 1.5× |
| Detected and Caught | PatrolRobot catches player | 0× |

## 11. Capture Penalty (medium tier)
- Lose all loot carried this attempt
- No progress toward the 3-raid PatrolRobot unlock counter for this attempt
- Cooldown: 5 minutes before another raid can be started

## 12. Progression / Endgame
- All buildings + defenses at Lvl 3 → unlock **Prestige**: base resets, permanent +5% stealth bonus (stacks to +25% at Prestige 5), cosmetic base-border color

## 13. Open Numbers to Playtest / Tune
- Starting coin amount (500 is a first guess)
- Wall-break hit count (4 — could go to 3 if raids feel too long)
- Color quota percentage (35% — adjust based on how restrictive it feels)
- Lighthouse rotation speed (12 sec/rotation — tune for difficulty curve)
