# Color Palette Spec v2 — Shadow Palette: Stealth & Siege

## Core Colors (5 total — Black removed, Yellow added)
| Name | Hex | Grayscale luminance shade (used in raid mode) |
|---|---|---|
| White | `#F1FAEE` | Lightest |
| Yellow | `#F4C245` | Light-medium |
| Green | `#2A9D8F` | Medium |
| Red | `#E63946` | Medium-dark |
| Blue | `#264653` | Darkest |

**Why no Black:** raid mode renders the entire world in grayscale for the attacker — keeping Black out of the paintable set avoids literal color and camouflage-state visually colliding.

## Grayscale Conversion Rule
Convert each hex to a luminance value and quantize into 5 fixed bands (not a continuous grayscale) so matching stays clean and testable:
```
White  → luminance band 5 (lightest)
Yellow → luminance band 4
Green  → luminance band 3
Red    → luminance band 2
Blue   → luminance band 1 (darkest)
```
Player's camo strategy also renders at their assigned band. Camouflage match = player's band equals the surrounding tile/wall's band.

## Color Quota
- No single color may cover more than **35%** of a base's total paintable surface (floor + building faces + walls), enforced server-side on save.

## UI / HUD Colors (non-gameplay)
| Role | Hex |
|---|---|
| Background (dark base) | `#0D1B1E` |
| Primary accent (buttons) | `#F4A261` |
| Success (extraction, loot) | `#2A9D8F` |
| Danger (alert, caught) | `#E63946` |
| Neutral text | `#F1FAEE` |

## Implementation Note
Keep both the hex-to-band mapping and the 35% quota rule in **one shared constants file** (e.g. `Colors.java` backend, `colors.js` frontend) so client-side preview and server-side validation never drift out of sync.
