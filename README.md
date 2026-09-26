# Shadow Palette: Stealth & Siege

Color-camo stealth raids on a clay fortress. Build and paint your base, then sneak into others — match the tiles, dodge the searchlight, outrun the patrol robot, and extract with greed loot.

**Stack:** Spring Boot 3.3 (REST + JPA + WebSocket) · React 18 + Vite · Three.js · MySQL (H2 for local smoke)

---

## Features

| Mode | What you do |
|------|-------------|
| **Base builder** | Repair starter ruins, paint tiles (color quota), upgrade houses, unlock patrol |
| **Stealth raid** | Grayscale enemy base, locked camo, growing searchlight cone, AI patrol chase |
| **Extraction** | Channel at the south gate (or wall-break after alarm) · greed loot scales with time |
| **Live defense** *(optional)* | If the defender is online, they get 15s to join and manually drive the patrol robot over STOMP |

Default raids stay **fully async** (client session log → server `RaidValidator`). Live takeover never blocks the AI path — ignore, timeout, or disconnect and the attacker keeps the normal patrol AI.

---

## Quick start

### Requirements

- **JDK 17**, **Maven 3.9+**
- **Node.js 20+** / npm
- **MySQL 8** *or* use the H2 `local` profile (no MySQL needed)

### 1. Backend

```bash
cd backend

# Option A — MySQL (edit application.yml user/password first)
# CREATE DATABASE shadow_palette;
mvn spring-boot:run

# Option B — in-memory H2 (fast smoke / live-raid demos)
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

API: `http://localhost:8080` · Swagger: `http://localhost:8080/swagger-ui.html` · SockJS: `/ws`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

Game: **http://127.0.0.1:3000**  
Vite proxies `/api` and `/ws` → `8080`. Prefer port **3000** only (stale copies on other ports will look “broken”).

### 3. Two-player live raid (optional)

```text
Defender:  http://127.0.0.1:3000/?userId=34   → stay on Base
Attacker:  http://127.0.0.1:3000/?userId=12   → Raid → North Citadel (Owner #34)
```

Join within 15s to control the robot; otherwise AI continues. Full steps: [`docs/live-raid-testing.md`](docs/live-raid-testing.md).

---

## Project layout

```text
├── backend/                 Spring Boot API + live-raid WebSocket
│   └── src/main/java/com/shadowpalette/
│       ├── controller/      REST (raid, presence, buildings, …)
│       ├── liveraid/        STOMP invite / join / position / catch
│       ├── service/         RaidValidator, PresenceService, …
│       └── util/            StealthConstants (must match FE)
├── frontend/
│   └── src/
│       ├── views/           Base, Raid finder, StealthRaidView, …
│       ├── raid/            Detection, extraction, stealth constants
│       ├── gamemap/         Three.js map, searchlight, patrol robot
│       ├── live/            STOMP client, invite UI, LiveDefenseView
│       └── state/           GameStateContext FSM
└── docs/                    GDD, API contract, setup, live-raid testing
```

**Stealth constants are dual-homed.** Change difficulty in both:

- `frontend/src/raid/stealthConstants.js`
- `backend/.../util/StealthConstants.java`

The server recomputes outcomes from the session log and is the source of truth.

---

## Core gameplay loop

1. **Setup** — pick character + camo color · base is auto-assigned  
2. **Build** — repair houses · paint floor/walls (≤35% any one color) · optional patrol unlock  
3. **Raid** — lock camo · enter grayscale fortress · avoid / latch beam → patrol chases map-wide  
4. **Loot** — greed % accrues while you stay · extract silent, escape after alarm, or get **CAUGHT** (0 loot + cooldown)  
5. **Live** *(if defender online)* — they may take over the robot; catch is server-authoritative  

Raid outcomes: `SILENT` · `ESCAPED` · `CAUGHT` · `INCOMPLETE`

---

## Scripts & tests

```bash
# Frontend stealth / loot unit tests
cd frontend && npm test

# Backend (includes LiveRaidFlowTest)
cd backend && mvn test

# Live-raid flow only
cd backend && mvn -q test -Dtest=LiveRaidFlowTest
```

Curl smoke for presence + invite hook:

```bash
curl -s -X POST http://127.0.0.1:8080/api/presence \
  -H 'Content-Type: application/json' \
  -d '{"userId":34,"username":"Defender34","camoColor":"BLUE"}'

curl -s -X POST http://127.0.0.1:8080/api/raid/start \
  -H 'Content-Type: application/json' \
  -d '{"attackerId":12,"defenderId":34,"raidId":"smoke-1","attackerName":"Raider12"}'
# → liveInviteSent: true when defender is online
```

---

## Config notes

| File | Purpose |
|------|---------|
| `backend/.../application.yml` | MySQL URL, credentials, port `8080` |
| `backend/.../application-local.yml` | H2 in-memory profile |
| `frontend/vite.config.js` | Dev server `3000`, proxies `/api` + `/ws` |

Player id for local multi-window tests: `?userId=34` (persisted in `localStorage` as `sp_userId`).

---

## Docs

| Doc | Contents |
|-----|----------|
| [`docs/02-game-design-document-v2.md`](docs/02-game-design-document-v2.md) | Economy, stealth, buildings |
| [`docs/05-api-contract-v2.md`](docs/05-api-contract-v2.md) | REST contract |
| [`docs/09-setup-guide.md`](docs/09-setup-guide.md) | Tooling / first-time setup |
| [`docs/live-raid-testing.md`](docs/live-raid-testing.md) | Hybrid live defense playbook |

---

## License

Academic / AOOP project — Shadow Palette team. See repository ownership on GitHub.
