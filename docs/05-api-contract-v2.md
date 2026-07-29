# API Contract v2 — Shadow Palette: Stealth & Siege

Base URL: `/api`

---

## `POST /player/setup`
One-time onboarding: pick character model + camo color.

**Request**
```json
{ "userId": 12, "characterModel": 2, "camoColor": "BLUE" }
```
**Response 200**
```json
{ "success": true, "characterModel": 2, "camoColor": "BLUE" }
```
**Response 409** (already set — camo color is permanent)
```json
{ "success": false, "error": "CAMO_COLOR_ALREADY_SET" }
```

---

## `GET /map`
Load global world map & plots (with roads metadata for rendering).

**Response 200**
```json
{ "plots": [ { "id": 2, "xCoord": 1, "yCoord": 0, "ownerId": null, "isOccupied": false } ] }
```

---

## `POST /plot/claim`
Claim the player's first free plot, or buy an additional plot (distance-priced).

**Request**
```json
{ "userId": 12, "plotId": 2 }
```
**Response 200**
```json
{ "success": true, "plot": { "id": 2, "ownerId": 12, "isOccupied": true }, "coinsRemaining": 500 }
```
**Response 409**
```json
{ "success": false, "error": "PLOT_ALREADY_OWNED" }
```

---

## `POST /building/place`
Place a building, or paint a tile/wall/gate.

**Request**
```json
{
  "userId": 12,
  "plotId": 2,
  "action": "PLACE_BUILDING",
  "buildingType": "CRAFT_HOUSE",
  "modelVariant": 1,
  "xPos": 3,
  "yPos": 4,
  "hexColor": "#FFFFFF"
}
```
**Response 200**
```json
{ "success": true, "buildingId": 45, "inkRemaining": 85 }
```
**Response 422** (color quota exceeded)
```json
{ "success": false, "error": "COLOR_QUOTA_EXCEEDED", "colorUsagePercent": 37 }
```

---

## `POST /defense/place`
Place the Lighthouse (once) or bring home an unlocked PatrolRobot.

**Request**
```json
{ "userId": 12, "plotId": 2, "defenseType": "LIGHTHOUSE", "modelVariant": 2 }
```
**Response 409** (Lighthouse already exists)
```json
{ "success": false, "error": "LIGHTHOUSE_ALREADY_PLACED" }
```
**Response 403** (PatrolRobot not yet unlocked)
```json
{ "success": false, "error": "PATROLROBOT_NOT_UNLOCKED", "successfulRaidsNeeded": 1 }
```

---

## `POST /building/upgrade`
Upgrade any building/defense one level.

**Request**
```json
{ "userId": 12, "targetId": 45, "targetType": "BUILDING" }
```
**Response 200**
```json
{ "success": true, "newLevel": 2, "coinsRemaining": 50, "inkRemaining": 60 }
```

---

## `GET /raid/target/{userId}`
Fetch a defender's base snapshot to start a raid instance.

**Response 200**
```json
{
  "defenderId": 34,
  "layout": {
    "buildings": [ { "id": 45, "type": "CRAFT_HOUSE", "xPos": 3, "yPos": 4, "hexColor": "#E63946" } ],
    "walls": [ { "xPos": 0, "yPos": 0, "hexColor": "#264653", "isGate": true } ],
    "lighthouse": { "coneAngle": 60, "coneRange": 7, "sweepSpeed": 1.0 },
    "patrolRobot": { "baseSpeed": 1.0 }
  },
  "chipsAvailable": 200
}
```

---

## `POST /raid/complete`
Submit raid session log for server-side validation.

**Request**
```json
{
  "attackerId": 12,
  "defenderId": 34,
  "durationSeconds": 61,
  "wallBreakEvents": [ { "wallBlockId": 9, "hits": 4, "gateWasLocked": true } ],
  "sessionLog": [ { "tick": 0, "xPos": 0, "yPos": 0 } ],
  "clientReportedOutcome": { "isDetected": true, "outcome": "ESCAPED", "chipsRequested": 300 }
}
```
**Response 200**
```json
{
  "success": true,
  "validatedOutcome": { "isDetected": true, "outcome": "ESCAPED", "chipsAwarded": 300 },
  "raidLogId": 901
}
```
**Response 422**
```json
{ "success": false, "error": "OUTCOME_MISMATCH", "validatedOutcome": { "outcome": "CAUGHT", "chipsAwarded": 0 } }
```

---

## Error Codes (shared)
| Code | Meaning |
|---|---|
| `CAMO_COLOR_ALREADY_SET` | Camo color is permanent, can't be re-chosen |
| `PLOT_ALREADY_OWNED` | Race condition on plot claim |
| `COLOR_QUOTA_EXCEEDED` | A color would exceed the 35% base-surface cap |
| `LIGHTHOUSE_ALREADY_PLACED` | Only one Lighthouse allowed per base |
| `PATROLROBOT_NOT_UNLOCKED` | Needs 3 successful raids first |
| `INSUFFICIENT_COINS` / `INSUFFICIENT_INK` | Not enough resources |
| `RAID_COOLDOWN_ACTIVE` | 5-minute cooldown after being caught |
| `OUTCOME_MISMATCH` | Server-side replay disagrees with client-reported outcome |
