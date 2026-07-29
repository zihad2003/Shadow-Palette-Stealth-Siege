# Asset / Sprite List v2 — Shadow Palette: Stealth & Siege

## Map & Terrain
- [ ] `tile_empty.png`, `tile_owned_self.png`, `tile_owned_other.png`
- [ ] `tile_color_white.png` / `_yellow.png` / `_green.png` / `_red.png` / `_blue.png`
- [ ] `bg_grid_texture.png`, `road_segment.png`

## Player (3 character models × idle/walk/run)
- [ ] `player1_idle.png` / `player2_idle.png` / `player3_idle.png`
- [ ] `player1_walk.png` / `player2_walk.png` / `player3_walk.png` (spritesheet)
- [ ] `player_run.png` (spritesheet — used for the escape sprint)
- [ ] `player_camo_overlay.png` (tinted at runtime per assigned color/band)

## Buildings (2–3 model variants each, ×3 levels — can reuse base shape, retint per level)
- [ ] `crafthouse_v1.png` / `_v2.png` (×3 levels each)
- [ ] `inkhouse_v1.png` / `_v2.png` (×3 levels each)
- [ ] `sleephouse_v1.png` / `_v2.png` (×3 levels each)
- [ ] `coingenerator_v1.png` / `_v2.png` (×3 levels each)

## Defense
- [ ] `lighthouse_v1.png` / `_v2.png` / `_v3.png`
- [ ] `lighthouse_cone_beam.png` (semi-transparent, tinted at runtime, core vs edge zone visual distinction)
- [ ] `patrolrobot.png` (base sprite)
- [ ] `patrolrobot_walk.png` (spritesheet — patrol speed)
- [ ] `patrolrobot_chase.png` (spritesheet — faster chase animation, visually more urgent)

## Wall / Gate
- [ ] `wall_block.png` (5 color-tinted variants)
- [ ] `wall_block_cracked_1.png` / `_2.png` / `_3.png` (progressive break-damage states, 4 hits → 3 crack stages + broken)
- [ ] `wall_broken.png`
- [ ] `gate_unlocked.png`
- [ ] `gate_locked.png` (alarm-triggered state)

## Alarm / Detection
- [ ] `alarm_siren_idle.png` / `_triggered.png`
- [ ] `alarm_light_flash.png`
- [ ] `icon_detection_exclaim.png` (Suspicious state)
- [ ] `icon_alert.png` (Alert/Chasing state)

## HUD / UI
- [ ] `icon_coin.png`, `icon_ink.png`, `icon_chip.png`
- [ ] `btn_buy_normal.png` / `_hover.png` / `_disabled.png`
- [ ] `btn_upgrade_normal.png` / `_hover.png` / `_disabled.png`
- [ ] `meter_bar_frame.png` (can be canvas-drawn instead)
- [ ] `stamina_bar_frame.png` (for sprint mechanic — can be canvas-drawn)
- [ ] `wall_break_progress_indicator.png` (or canvas-drawn 4-segment pip bar)

## Menu / Misc
- [ ] `logo.png`, `bg_menu.png`

---

## ⚠️ Removed from v1 (no longer needed for now)
- ~~Side-scrolling parallax background layers~~ (escape stretch goal only, build later if time allows)
- ~~Separate escape-runner obstacle sprites~~
- ~~LaserGrid sprites/beam~~ (defense deferred)
- ~~Black tile color~~ (removed from palette)

## Minimum-viable cut
If time is tight: skip cone beam / crack-stage art and draw those as canvas primitives (colored polygons, opacity-based crack overlay) instead of PNGs. This trims the list to roughly **20 essential sprites** — 3 character sets, 8 building variants (one variant each, skip the 2nd model to start), lighthouse, patrol robot (2 states), wall/gate states, and core HUD icons.
