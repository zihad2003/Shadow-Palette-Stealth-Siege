# Shadow Palette: Stealth & Siege

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160+-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com/)
[![Flyway](https://img.shields.io/badge/Flyway-Migration-red.svg)](https://flywaydb.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Voice%20Chat-teal.svg)](https://webrtc.org/)

**Shadow Palette: Stealth & Siege** is a full-stack, tactical 3D isometric stealth fortress and raid game. Players construct and customize clay fortresses with color-coded defenses, station searchlights, and deploy autonomous patrol robots. Raiders infiltrate enemy grayscale strongholds using dynamic color camouflage to blend with floor tiles, disable security systems, strike and stun patrol robots, and extract with greed-scaled loot.

The game supports **asynchronous raids** (with deterministic server-side replay validation), **live two-player defense takeovers**, and **co-op duo raids** complete with dual 3D character lobby previews and low-latency **WebRTC voice chat** powered by STUN and Open Relay TURN.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [AOOP & Software Engineering Design Patterns](#aoop--software-engineering-design-patterns)
3. [Key Gameplay Systems](#key-gameplay-systems)
   - [Persistent Save & PIN Authentication](#1-persistent-save--pin-authentication)
   - [Base Building & Color Quotas](#2-base-building--color-quotas)
   - [Tactical Duo Lobby & Ready Sync](#3-tactical-duo-lobby--ready-sync)
   - [Low-Latency WebRTC Voice Chat](#4-low-latency-webrtc-voice-chat)
   - [Stealth Raids & 12-Second Robot Stun](#5-stealth-raids--12-second-robot-stun)
   - [Live Defense Takeover](#6-live-defense-takeover)
   - [Admin Telemetry Dashboard](#7-admin-telemetry-dashboard)
4. [Database Schema & Migrations](#database-schema--migrations)
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
                   │ HTTPS / REST                    │ STOMP (SockJS) / WebRTC
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Spring Boot 3.3.4 Backend                         │
│  Controllers · LiveRaid & Duo STOMP · RaidValidator · PresenceService   │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ Spring Data JPA + Flyway Migrations
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MySQL 8.0+ Database / H2                          │
│  `user` · `plot` · `building` · `patrol_robot` · `lighthouse` · `raid` │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Single-page application built with React 18, Vite, Three.js (custom isometric camera, raycasting, soft clay shading, procedural mesh decors), and Framer Motion.
- **Backend**: Spring Boot 3.3.4 utilizing Spring MVC for REST endpoints, Spring WebSocket with STOMP messaging for sub-second multiplayer synchronization, and Spring Data JPA.
- **Database**: Relational MySQL with automated Flyway schema versioning (`classpath:db/migration`) and optional in-memory H2 profile for zero-config local testing.
- **Audio & Networking**: WebRTC peer-to-peer audio channels supplemented by Open Relay TURN fallback servers to guarantee connectivity across NATs, mobile networks, and restrictive firewalls.

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

### 1. Persistent Save & PIN Authentication
- **Onboarding Modal**: First-time players provide a unique username, agree to game terms via interactive checkboxes, and set a 4-digit security PIN.
- **Resume Session**: Returning players enter their username and PIN to instantly restore their base fortress, painted tiles, economy balances, and customized 3D character model.
- **Database Backed**: Saved states are stored in the `world_save_json` column of the MySQL `user` table.

### 2. Base Building & Color Quotas
- **Isometric Grid**: Build and upgrade structures including Coin Generators (passively accumulate coins), Ink Houses (gather ink energy), Makeup Houses (character customizer), and Searchlight Towers.
- **Camouflage Rule**: Players paint floor and wall tiles with primary and secondary clay pigments. The anti-camo rule mandates that **no single color can exceed 35% of total base tiles**, enforcing tactical defense layouts.

### 3. Tactical Duo Lobby & Ready Sync
- **Online Presence**: Real-time lobby displays available online players. Players can send instant duo raid invites over `/topic/duo-invite/{userId}`.
- **Dual 3D Character Previews**: Both Host and Guest characters are rendered in real-time 3D, showing character models, customized colors, and animated idle stances side-by-side.
- **Synchronized Ready Check**: Host and Guest must both click **READY** before the Host's "START RAID" button unlocks.

### 4. Low-Latency WebRTC Voice Chat
- **Seamless Peer-to-Peer Voice**: Built-in voice channel between duo teammates with mic and sound toggles.
- **TURN Fallback**: Uses Google/Twilio STUN plus Open Relay TURN fallback (`turn:openrelay.metered.ca`) to ensure voice connectivity across all network topologies.
- **Autoplay Handling**: Integrated user-gesture unlock listener handles browser autoplay restrictions on laptops and mobile devices.
- **Strict Session Teardown**: Voice connection immediately stops and releases browser microphone hardware when leaving the lobby, raid, or party (*"er theke ber hoye gele ar kotha bola jabe na"*).

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

### 6. Live Defense Takeover
- If the defender is online when an attack begins, they receive an on-screen siren prompt offering a 15-second window to join as the **Live Defender**.
- When accepted, the defender manually steers the patrol robot over STOMP to actively hunt the attacker in real time.

### 7. Admin Telemetry Dashboard
- Access `/admin` to view live player metrics, database record counts, active raids, economy controls, and server health.

---

## Database Schema & Migrations

The backend utilizes **Flyway** for database migrations located in `backend/src/main/resources/db/migration`:

### Migration History
1. **`V1__baseline.sql`**: Baseline table schema:
   - `user`: Player identity, currency (`coins`, `ink_energy`, `chips`), character model, camo color, prestige.
   - `plot`: World coordinate tiles and ownership.
   - `building`: Base building entity using `JOINED` inheritance for `coin_generator`, `ink_house`, `craft_house`, `sleep_house`.
   - `lighthouse`: Searchlight tower range, cone angle, and rotation speed.
   - `patrol_robot`: Defense bot state and base movement speed.
   - `wall_block`: Defensive perimeter blocks, gate status, and break progress.
   - `raid_log`: Historical raid session outcomes and stolen resources.
2. **`V2__add_user_save_and_auth.sql`**: Extends `user` table with:
   - `password`: 4-digit PIN for session security.
   - `world_save_json`: Full JSON serialized fortress state for cross-device resume.
   - `terms_accepted`: Bit flag recording user agreement to game terms.

---

## Local Development Setup

### Prerequisites
- **JDK 17+**
- **Maven 3.9+**
- **Node.js 20+** and npm
- **MySQL 8.0+** (or use the in-memory H2 profile)

### 1. Backend Setup

```bash
cd backend

# Option A: Run with MySQL (configure credentials in application.yml)
mvn spring-boot:run

# Option B: Run with in-memory H2 database (zero configuration required)
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

### Backend Deployment on Render
1. Create a new **Web Service** on [Render](https://render.com) pointing to the GitHub repository.
2. Root Directory: `backend`
3. Environment: `Docker` or `Java`
4. Build Command: `mvn clean package -DskipTests`
5. Start Command: `java -jar target/shadow-palette-backend-0.0.1-SNAPSHOT.jar`
6. Environment Variables:
   - `SPRING_DATASOURCE_URL`: JDBC connection string for your cloud MySQL (Aiven, Neon, or Railway)
   - `SPRING_DATASOURCE_USERNAME`: Database username
   - `SPRING_DATASOURCE_PASSWORD`: Database password
   - `PORT`: `8080`

### Frontend Deployment on Vercel
1. Create a new Project on [Vercel](https://vercel.com) pointing to the repository.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Configure `VITE_API_URL` and `VITE_WS_URL` to point to your live Render backend URL.

---

## Automated Test Suite

Run the full backend test suite:

```bash
cd backend
mvn test
```

### Test Coverage Highlights
- **`RaidValidatorTest` (16 tests)**: Validates server-side replay logs, verifying legal movement vectors, searchlight cone exposures, and anti-cheat outcome validation.
- **`DuoFlowTest` (2 tests)**: Validates two-player party creation, real-time STOMP position broadcasting, ready synchronization, and clean teardown.
- **`LiveRaidFlowTest` (4 tests)**: Tests live defender invite dispatch, 15-second acceptance timeout, and robot takeover messaging.
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
| **W, A, S, D / Arrows** | Camera Pan | Character Movement |
| **Shift (Hold)** | — | Sprint |
| **[E]** | Inspect / Upgrade | Steal from Coin Vault or Ink House |
| **[F]** or **[SPACE]** | — | **HIT ROBOT (Stun for 12s)** / Channel Gate / Hit Wall |
| **Left Click** | Paint Tile / Select | Trigger Interaction / Click Stun Prompt |
| **Scroll / +/-** | Zoom In / Out | Zoom In / Out |

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
| [`docs/deployment-guide.md`](docs/deployment-guide.md) | Production deployment (Render + Vercel) |
| [`docs/deployment-guide-bn.md`](docs/deployment-guide-bn.md) | ডিপ্লয়মেন্ট গাইড (বাংলা) |

---

## License

Developed as part of the **AOOP (Advanced Object-Oriented Programming)** curriculum. All rights reserved.
