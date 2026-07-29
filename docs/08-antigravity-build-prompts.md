# Antigravity Build Prompts — Shadow Palette: Stealth & Siege

How to use this file: Antigravity is project-centric and works best when it can see your whole repo plus a clear goal per task. Open Antigravity, select **Plan mode** for each phase below (it drafts a Plan Artifact before touching files — review/edit the plan before letting it execute). Use **Agent-assisted** mode overall so you stay in control of terminal commands and file changes rather than full Autopilot. Paste one phase prompt at a time — don't paste all phases at once, since each depends on the previous phase's output existing in the repo.

Attach the relevant doc(s) from this project (master-plan-v2, ER diagram, UML diagram, API contract, color palette) to each prompt's context where noted, so the agent grounds its code in your actual spec instead of inventing its own.

---

## Phase 0 — Project Scaffold
**Attach:** master-plan-v2.md, setup-guide.md

```
Set up two projects in this workspace:
1. A Spring Boot backend in /backend using Maven, Java 17, with dependencies:
   spring-boot-starter-web, spring-boot-starter-data-jpa, mysql-connector-j,
   spring-boot-starter-validation, lombok, spring-boot-devtools,
   springdoc-openapi-starter-webmvc-ui.
   Base package: com.shadowpalette
2. A vanilla JS + HTML5 Canvas frontend in /frontend, scaffolded with Vite
   (vanilla template), no framework — plain JS modules.

Create an application.yml for the backend pointing to a local MySQL database
named shadow_palette on localhost:3306. Set up a basic health-check endpoint
GET /api/health returning {"status":"ok"}. Confirm both projects run locally
(mvn spring-boot:run and npm run dev) before finishing.
```

---

## Phase 1 — Database Entities & Schema
**Attach:** er-diagram-v2.md

```
Using the ER diagram in er-diagram-v2.md, create JPA entities in
com.shadowpalette.entity for: User, Plot, Building (abstract, JOINED
inheritance) with subclasses CraftHouse, InkHouse, SleepHouse,
CoinGenerator, Lighthouse, PatrolRobot, WallBlock, and RaidLog.

Follow the field names and types exactly as specified in the diagram.
Add a @Version field on Plot for optimistic locking. Add a unique
constraint ensuring only one Lighthouse and one PatrolRobot per plotId.
Generate Spring Data JPA repositories for each entity. Do not write
any controller or service logic yet — this phase is entities + repos only.
Verify the app starts and Hibernate creates the schema correctly against
the local MySQL database.
```

---

## Phase 2 — Core REST APIs (Plot, Building, Player Setup)
**Attach:** api-contract-v2.md

```
Implement these endpoints exactly as specified in api-contract-v2.md,
including the exact request/response JSON shapes and error codes:
- POST /api/player/setup
- GET /api/map
- POST /api/plot/claim  (must be transactional and race-safe using the
  Plot entity's @Version field — reject with PLOT_ALREADY_OWNED on conflict)
- POST /api/building/place  (enforce the 35% color quota rule from
  color-palette-v2.md — reject with COLOR_QUOTA_EXCEEDED if violated)
- POST /api/building/upgrade

Write a Postman collection or an OpenAPI test file covering each success
and error case listed in the contract. Use the springdoc-openapi Swagger
UI to manually verify each endpoint responds correctly.
```

---

## Phase 3 — Defense Placement & Factory Pattern
**Attach:** uml-class-diagram-v2.md

```
Implement BuildingFactory and DefenseFactory as described in
uml-class-diagram-v2.md — BuildingFactory produces CraftHouse/InkHouse/
SleepHouse/CoinGenerator, DefenseFactory produces Lighthouse/PatrolRobot.
Wire these into the /api/building/place and a new POST /api/defense/place
endpoint (see api-contract-v2.md for its exact request/response shape,
including the LIGHTHOUSE_ALREADY_PLACED and PATROLROBOT_NOT_UNLOCKED
error cases). PatrolRobot placement must check the user has at least 3
successful RaidLog entries with outcome != CAUGHT before allowing it.
```

---

## Phase 4 — Frontend: World Map & Base Builder Canvas
**Attach:** master-plan-v2.md, asset-list-v2.md

```
In the /frontend Vite project, build:
1. A world map screen (Canvas) that fetches GET /api/map and renders
   plots + roads. Clicking an unclaimed plot calls POST /api/plot/claim.
2. A base builder screen (Canvas) for the player's own 20x20 tile grid,
   with a 5-color palette tool (White/Yellow/Green/Red/Blue) for painting
   floor tiles and building faces, and a placement menu for the 4 building
   types + Lighthouse + PatrolRobot (if unlocked).

Use placeholder colored rectangles for any sprite not yet available —
reference asset-list-v2.md for the full sprite list to swap in later.
Call the backend endpoints from Phase 2/3 for every action; no game state
should live only in the frontend.
```

---

## Phase 5 — Lighthouse Cone & Camouflage Strategy
**Attach:** game-design-document-v2.md, uml-class-diagram-v2.md

```
Implement the CamouflageStrategy interface with 5 concrete strategies
(White/Red/Green/Blue/Yellow), each returning a fixed luminance band per
color-palette-v2.md. Assign a player's strategy once at /api/player/setup
time and never change it afterward.

Implement the Lighthouse's cone-beam detection logic per the formulas in
game-design-document-v2.md section 6-7: cone_angle 45-60deg, cone_range
6-8 tiles, clockwise sweep with random vertical oscillation, core-zone
always-detect vs edge-zone shade-matching. This logic should run
client-side during a raid simulation (see Phase 7), but write it as a
shared, unit-testable module so backend validation (Phase 7) can reuse
the exact same rules.
```

---

## Phase 6 — Guard AI State Machine & Observer Alarm System
**Attach:** uml-class-diagram-v2.md, game-design-document-v2.md

```
Implement the PatrolRobot's 5-state State pattern (Patrol, Suspicious,
Alert, Chasing, Searching) per uml-class-diagram-v2.md and the trigger
thresholds in game-design-document-v2.md section 8. Implement the
Observer pattern: a SensorSubject that, on detection, notifies four
observers simultaneously — Siren, AlertLight, GateLock (locks the
WallBlock marked isGate=true), and a PatrolRobotAlertListener that
flips PatrolRobot into ChasingState. Write this as client-side logic
for the raid simulation, structured so it's easy to port into the
server-side validator in Phase 7.
```

---

## Phase 7 — Raid Flow End-to-End + Server-Side Validation
**Attach:** api-contract-v2.md, er-diagram-v2.md

```
Implement GET /api/raid/target/{userId} and POST /api/raid/complete
exactly per api-contract-v2.md. The frontend raid screen should:
fetch the defender's snapshot, render it in grayscale, let the player
move/paint-match/break walls using the Phase 5-6 logic, then submit
the full sessionLog to /api/raid/complete.

On the backend, write a RaidValidator service that replays the
sessionLog against the same detection rules from Phase 5-6 (do not
trust the client's clientReportedOutcome at face value) and returns
OUTCOME_MISMATCH if they disagree, otherwise persists a RaidLog with
the validated outcome and awards chips per the loot multipliers in
game-design-document-v2.md section 10.
```

---

## Phase 8 — Escape Mechanic: Wall Break + Kite Loop
**Attach:** game-design-document-v2.md section 9, er-diagram-v2.md

```
Implement wall-breaking on the frontend: holding an action on a
WallBlock adds progress toward its breakProgress field (4 hits total,
~2 sec each), persisted and never decayed even if interrupted. Give
the player a run speed 1.25x the PatrolRobot's ChasingState speed.
When an alarm fires, increase the Lighthouse's sweepSpeed by 25% and
coneRange by 1 tile for the remainder of that raid instance. Sync
breakProgress to the backend via the wallBreakEvents field in the
POST /api/raid/complete payload from Phase 7.
```

---

## Phase 9 — Polish, Penalties, Prestige
**Attach:** game-design-document-v2.md sections 11-12

```
Implement the capture penalty: on a CAUGHT outcome, zero out loot,
do not increment the user's successful-raid counter, and set a
5-minute cooldown (store as a timestamp field) before /api/raid/target
can be called again. Implement the Prestige check: when all of a
user's buildings and defenses are at Level 3, expose an endpoint to
reset their base and apply a permanent stealth bonus per section 12.
```

---

## General tips for prompting Antigravity on this project
- Keep each phase prompt scoped to one phase — large multi-phase prompts make the agent's Plan Artifact harder to review and increase the chance of it improvising outside your spec.
- Always attach the specific doc(s) noted above as context rather than describing the schema/formulas from memory in the prompt — Antigravity follows attached source-of-truth files more reliably than restated prose.
- After each phase, ask Antigravity to summarize what it changed and run the relevant tests/build before moving to the next phase.
- If a phase's plan diverges from the spec (e.g., it invents a different field name), reject the plan and point it back at the specific doc section before it starts executing.
