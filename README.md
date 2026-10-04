# Shadow Palette: Stealth & Siege

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160+-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![H2](https://img.shields.io/badge/H2-embedded-blue.svg)](https://www.h2database.com/)
[![STOMP](https://img.shields.io/badge/STOMP-live%20sync-teal.svg)](https://stomp.github.io/)

**Shadow Palette: Stealth & Siege** is a browser 3D stealth game. You build a clay fortress, paint it, and raid other bases in grayscale by matching your camouflage to the floor. There is no Unity or Unreal project. The world is drawn with Three.js.

Two players on different networks can party up from **Co-op / Duo**, talk through the game server, and drop into the **same base at the same time**. Raids can also stay solo. If the base owner is online, they can join for a short window and drive the patrol robot.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [AOOP & Software Engineering Design Patterns](#aoop--software-engineering-design-patterns)
3. [Key Gameplay Systems](#key-gameplay-systems)
   - [Device account](#1-device-account)
   - [Base Building & Color Quotas](#2-base-building--color-quotas)
   - [Co-op / Duo drop](#3-co-op--duo-drop)
   - [Voice](#4-voice)
   - [Stealth Raids & 12-Second Robot Stun](#5-stealth-raids--12-second-robot-stun)
   - [Live Defense Takeover](#6-live-defense-takeover)
   - [Admin Telemetry Dashboard](#7-admin-telemetry-dashboard)
4. [Database](#database)
5. [Local Development Setup](#local-development-setup)
6. [Cloud Deployment Guide (Render + Vercel)](#cloud-deployment-guide-render--vercel)
7. [Automated Test Suite](#automated-test-suite)

---

## Architectural Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 + Vite Frontend                        │
│  Three.js 3D Voxel Renderer · GameStateContext FSM · Lucide · Tailwind │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTPS / REST                    │ STOMP over WebSocket
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Spring Boot 3.3 Backend                           │
│  REST · Duo & live-raid STOMP · voice relay · presence · raid pots        │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ Spring Data JPA
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│              H2 file database (local profile) or MySQL                 │
│  `user` · `plot` · `building` · `patrol_robot` · `lighthouse` · raids  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: React 18, Vite, Three.js, Tailwind, and Framer Motion. The dev server proxies `/api` and `/ws` to port 8080.
- **Backend**: Spring Boot 3.3. REST for accounts, raids, and presence. STOMP for duo state, positions, and voice.
- **Database**: The `local` profile uses a file-backed H2 database and creates tables on startup. Flyway stays off unless `FLYWAY_ENABLED=true`. A live MySQL URL is optional and only works when that host resolves.
- **Voice**: PCM audio is sent through the same STOMP socket as the raid. Players do not open a WebRTC call and do not need a TURN server.

---

## AOOP & Software Engineering Design Patterns

The codebase strictly demonstrates core **Advanced Object-Oriented Programming (AOOP)** design patterns:

### 1. State Pattern
- **Backend**: [`PatrolRobotContext.java`](file:///backend/src/main/java/com/shadowpalette/state/PatrolRobotContext.java) and [`RobotState.java`](file:///backend/src/main/java/com/shadowpalette/state/RobotState.java). Transitions between `PatrolState`, `SuspiciousState`, `AlertState`, `ChasingState`, `SearchingState`, and `DisabledState`.
- **Frontend**: [`patrolRobotState.js`](file:///frontend/src/patrolRobotState.js). Evaluates sensory detection ticks and manages autonomous transitions and stun timers.

### 2. Observer Pattern
- **Backend**: [`SensorObserver.java`](file:///backend/src/main/java/com/shadowpalette/observer/SensorObserver.java) and [`PatrolRobotAlertListener.java`](file:///backend/src/main/java/com/shadowpalette/observer/PatrolRobotAlertListener.java). Searchlight sensor detects light breaches and notifies attached observers to trigger fortress sirens.
- **Frontend**: [`AlarmSystem.js`](file:///frontend/src/raid/AlarmSystem.js) and STOMP topic subscriptions (`/topic/duo/{partyId}/state`, `/topic/duo/{partyId}/signal`, `/topic/live-raid/{raidId}`).

### 3. Strategy Pattern
- **Backend**: [`LootCalculationStrategy.java`](file:///backend/src/main/java/com/shadowpalette/strategy/LootCalculationStrategy.java). Calculates final coin and ink allocations based on raid outcome (`SILENT`, `ESCAPED`, `CAUGHT`, `INCOMPLETE`).
- **Frontend**: [`DetectionSystem.js`](file:///frontend/src/raid/DetectionSystem.js) and [`ColorCamouflageStrategy.js`](file:///frontend/src/raid/ColorCamouflageSystem.js). Computes stealth scores depending on character color match against target tile color.

### 4. Builder Pattern
- **Backend**: [`RaidSessionBuilder.java`](file:///backend/src/main/java/com/shadowpalette/builder/RaidSessionBuilder.java). Assembles validated raid replay logs, attacker gear, target defenses, and outcome metrics into immutable session records.

### 5. Factory Pattern
- **Backend & Frontend**: [`StructureFactory.java`](file:///backend/src/main/java/com/shadowpalette/factory/StructureFactory.java) and [`buildStructure.js`](file:///frontend/src/gamemap/buildStructure.js). Dynamically instantiates building entities (`CoinGenerator`, `InkHouse`, `CraftHouse`, `SleepHouse`, `PatrolRobot`) with proper mesh geometries and collision boundaries.

---

## Key Gameplay Systems

### 1. Player login
- A new browser asks for a player name and a PIN (4 or more characters) before the fortress opens. That pair is one player. The same name and PIN on another device load that player's coins, base, and raids.
- A browser that already resumed its player opens straight to Resume. The gear menu shows that name, id, coins, and raids. **Different player** there switches accounts and loads the other save.
- The server stores the fortress on that user as `world_save_json`, and writes coins, ink, chips, and prestige on the user row as well. The id is `20161` or higher.

### 2. Base Building & Color Quotas
- **Isometric Grid**: Build and upgrade structures including Coin Generators (passively accumulate coins), Ink Houses (gather ink energy), Makeup Houses (character customizer), and Searchlight Towers.
- **Camouflage Rule**: Players paint floor and wall tiles with primary and secondary clay pigments. The anti-camo rule mandates that **no single color can exceed 35% of total base tiles**, enforcing tactical defense layouts.

### 3. Co-op / Duo drop
- Open **Co-op / Duo** on the raid radar. Online humans can be invited. You can also invite by the player id shown on their screen.
- Accepting opens a lobby with both characters. The host picks the target base. Both players press **READY**.
- The server locks one `raidId`, one `defenderId`, and one `launchAt`. The lobby stays on screen and counts **DROP IN**. The host cannot pick a second base during that countdown. When the time hits, both clients enter the same base.
- House loot in a duo is split. A wall break and the alarm are shared. A caught player is pinned. The partner can keep moving.

### 4. Voice
- After the friend accepts, a bar appears at the top left. Each player clicks **Click to talk** once and allows the microphone.
- Mic audio is cut into short PCM chunks and published to `/app/voice/{partyId}`. The server relays them on `/topic/voice/{partyId}`.
- The play clock stays short on purpose, so speech does not drift half a second behind. Leaving the party, the base, or the menus stops the microphone.

### 5. Stealth Raids & 12-Second Robot Stun
- **Grayscale Reconnaissance**: Enemy fortresses appear in grayscale; only the raider and searchlight cone display color.
- **Edge-Zone Camouflage**: Matching your camo color to the tile below avoids detection in outer searchlight zones.
- **12-Second Patrol Robot Stun Mechanism**:
  - Raiders in melee range (≤ 2.5 tiles) can strike the patrol robot using **`[F]`**, **`[SPACE]`**, or the on-screen **HIT ROBOT** button.
  - When hit, the robot enters the **`DISABLED`** state for **12 seconds**:
    - Motor freezes (speed = 0), sensor cone shuts down, and the robot tilts into a disabled pose with electric spark VFX.
    - Robot cannot chase, tag, or catch raiders during this 12-second window.
    - Raiders can safely loot Coin Vaults, siphon Ink Houses, channel extraction at the South Gate, or break perimeter walls.
    - An animated HUD badge (`⚡ ROBOT OFFLINE: 12.0s`) counts down the remaining safety window.
    - In Duo Raids, hitting the robot synchronizes over STOMP so both players benefit from the 12-second stun window.
    - After 12 seconds, the robot reboots, reactivates its search sensors, and resumes hunting raiders.
- **Gate Lockdown & Wall Escape**: Searchlight exposure trips the siren, slamming the South Gate. Raiders must either channel silent extraction or perform 4 melee wall hits on emergency escape spots to break out.
- The result card stays until **Return to base**. The server records the outcome the raid ended with (`SILENT`, `ESCAPED`, or `CAUGHT`) and adds that greed loot to the saved wallet. A caught player keeps only what they already stole from houses.

### 6. Live Defense Takeover
- A raid on another player never pops a notification — the owner gets no toast or join prompt. If the owner is on their base, the two players simply see each other: the raider's character appears walking through the base, and the raider sees the owner's character (not a robot) moving in person.
- The owner chases with their own character. Within 2.5 tiles a prompt appears: **Hold F 3s to catch and send to jail**. Holding F for 3 seconds locks the raider in the Base Jail; the server validates the catch distance (`LIVE_CATCH_DISTANCE`).
- That records the raid as `CAUGHT` (loot forfeited, cooldown applied) and opens the jail ransom sequence — intercom voice plus coin offers — on both screens.
- When the raider escapes or extracts instead, the live session closes and the raider vanishes from the owner's base.

### 7. Admin Telemetry Dashboard
- Access `/admin` to view live player metrics, database record counts, active raids, economy controls, and server health.

---

## Database

Normal local and Render boots use the `local` profile. Hibernate updates the H2 file at `backend/data/shadow_palette`. Five faction bot bases (ids 101–105) are seeded on startup. New human accounts start at id `20161`.

Flyway scripts in `backend/src/main/resources/db/migration` describe the same tables (`user`, `plot`, `building`, `lighthouse`, `patrol_robot`, `wall_block`, `raid_log`, plus save JSON on `user`). They run only when `FLYWAY_ENABLED=true`.

On Render's free plan the H2 file lives on the container disk. It is wiped when the service sleeps or redeploys. A reachable MySQL `SPRING_DATASOURCE_URL` is what keeps accounts across restarts. If that hostname does not resolve, `backend/docker-entrypoint.sh` drops the dead URL and boots H2 instead of crash-looping.

---

## Local Development Setup

### Prerequisites
- **JDK 17**
- **Maven 3.9+**
- **Node.js 20+** and npm

MySQL is not required for local play.

### 1. Backend Setup

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

- API Base: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- WebSocket / STOMP Endpoint: `http://localhost:8080/ws`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

- Web App: `http://127.0.0.1:3000`
- Vite automatically proxies `/api` and `/ws` requests to port `8080`.

---

## Cloud Deployment Guide (Render + Vercel)

`render.yaml` is the backend blueprint: Docker, `SPRING_PROFILES_ACTIVE=local`, health check `/api/health`.

### Backend on Render
1. New **Web Service** from this repo. Runtime **Docker**. Dockerfile `./backend/Dockerfile`. Context `./backend`.
2. Set `SPRING_PROFILES_ACTIVE` to `local` and `PORT` to `8080`.
3. Do not leave a `SPRING_DATASOURCE_URL` that points at a deleted host. That was the Aiven `UnknownHostException` crash. Either delete those MySQL variables, or replace them with a host that still resolves.
4. Leave `ALLOWED_ORIGINS` empty unless you want to lock CORS to one Vercel domain. Empty means any origin.
5. Redeploy after env changes. Free-tier sleep wipes the embedded database.

### Frontend on Vercel
1. Root directory `frontend`. Framework Vite. Output `dist`.
2. Set `VITE_API_BASE_URL` to the Render `https` URL with **no trailing slash**, then redeploy. The value is baked in at build time.
3. If that variable is empty, a Vercel hostname falls back to `https://shadow-palette-backend.onrender.com`. Localhost still uses the Vite proxy.

---

## Automated Test Suite

Run the full backend test suite:

```bash
cd backend
mvn test
```

### Test Coverage Highlights
- **`RaidValidatorTest` (16 tests)**: Validates server-side replay logs, verifying legal movement vectors, searchlight cone exposures, and anti-cheat outcome validation.
- **`DuoFlowTest`**: Party invite, accept, shared ready drop (`launchAt` + one `defenderId`), and position sync.
- **`LiveRaidFlowTest` (7 tests)**: Tests live defender invite dispatch, silent join, hold-F catch range validation, jail-drop raid recording, attacker run-end cleanup, and disconnect fallback.
- **`PatrolRobotStateObserverTest` (2 tests)**: Tests the 5-state State Pattern escalation ladder and sensor alert observer dispatch.
- **`ColorCamouflageTest` (5 tests)**: Verifies exact and edge-zone stealth score algorithms.
- **`LighthouseDetectionEngineTest` (5 tests)**: Tests mathematical searchlight cone intersection geometry.

Run the frontend production build verification:

```bash
cd frontend
npm run build
```

---

## Controls Reference

| Key / Action | In Base Builder | In Stealth Raid |
|---|---|---|
| **W, A, S, D / Arrows** | Walk | Walk |
| **Shift (Hold)** | Sprint | Sprint |
| **[E]** | House action (coins, ink, sleep, craft, makeup) | Steal from a house |
| **[F]** | Enter or leave the buggy when you are near it | Hit the patrol robot / gate / wall |
| **Left Click** | Paint or select | Interact |
| **Scroll / +/-** | Zoom | Zoom |

---

## Config notes

| File | Purpose |
|------|---------|
| `backend/src/main/resources/application.yml` | Defaults. H2 unless `SPRING_DATASOURCE_URL` is set. Flyway off. Port `8080`. |
| `backend/src/main/resources/application-local.yml` | File H2, Flyway off. This is the profile Render should use. |
| `backend/docker-entrypoint.sh` | If the configured database host does not resolve, boot H2 instead. |
| `frontend/vite.config.js` | Dev server `3000`, proxies `/api` and `/ws`. |
| `frontend/.env.example` | `VITE_API_BASE_URL` for production. Leave it empty on localhost. |

Open two browsers for a duo test. Each one gets its own `Player #####` from the server. Invite that id. Do not reuse old ids such as `12`. The server only resumes an id at or above `20161` when the device token matches.

---

## Docs

| Doc | Contents |
|-----|----------|
| [`docs/02-game-design-document-v2.md`](docs/02-game-design-document-v2.md) | Economy, stealth, buildings |
| [`docs/05-api-contract-v2.md`](docs/05-api-contract-v2.md) | REST contract |
| [`docs/09-setup-guide.md`](docs/09-setup-guide.md) | Local run, no MySQL required |
| [`docs/duo-raid-testing.md`](docs/duo-raid-testing.md) | Two-browser co-op, drop, and voice |
| [`docs/live-raid-testing.md`](docs/live-raid-testing.md) | Hybrid live defense playbook |
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Production deployment (Render + Vercel) |
| [`docs/deployment-guide-bn.md`](docs/deployment-guide-bn.md) | ডিপ্লয়মেন্ট গাইড (বাংলা) |

---

## License

Developed as part of the **AOOP (Advanced Object-Oriented Programming)** curriculum. All rights reserved.
