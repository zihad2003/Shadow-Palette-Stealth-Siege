# Live Raid Hybrid — local testing

Default raids stay fully async (sessionLog → `RaidValidator`). Live takeover is **optional**: if the defender is online when a raid starts, they get a 15s STOMP invite to manually drive the PatrolRobot.

## Prerequisites

- Backend on `http://localhost:8080`
  - MySQL (default `application.yml`), **or**
  - H2 smoke profile: `mvn spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend Vite on `http://127.0.0.1:3000` (proxies `/api` and `/ws`)
- Two user ids that exist or will be auto-created (defaults: attacker `12`, defender e.g. `34`)

## Two-browser manual test

1. **Window A (defender)** — normal Chrome profile → `http://127.0.0.1:3000`
   - Finish intro / enter base so presence heartbeats run (`GameStateContext` posts `/api/presence` every 8s).
   - Stay on Base / Raid finder / any authenticated view (not splash).
   - Optionally set `userId` to `34` via Options / admin if your build exposes it; otherwise use whatever id the heartbeats send and raid *that* id from the attacker.

2. **Window B (attacker)** — Incognito (or second browser) → `http://127.0.0.1:3000`
   - Log in / play as a **different** `userId` (e.g. `12`).
   - Open Raid finder and raid the defender’s base id (must match the presence heartbeat userId of Window A).

3. **Expected**
   - Attacker’s `POST /api/raid/start` sees defender online → STOMP `/topic/raid-invite/{defenderId}`.
   - Window A shows “Someone is raiding your base — Join?” with countdown.
   - **Join** within 15s → Window A mounts live defense; Window B toast “A live defender has joined!”; robot follows defender WASD; attacker position syncs.
   - If defender catches (server distance ≤ `ROBOT_CATCH_DISTANCE`) → both get terminal `CAUGHT`; loot 0 + cooldown via `RaidService.completeLiveCaught`.
   - If defender ignores / disconnects → invite expires or `DEFENDER_LEFT`; attacker keeps AI patrol (no raid abort).

## Curl smoke: mark defender online without a browser

```bash
# Heartbeat defender 34 (TTL 20s — repeat if needed)
curl -s -X POST http://127.0.0.1:8080/api/presence \
  -H 'Content-Type: application/json' \
  -d '{"userId":34,"username":"Defender34","characterModel":1,"camoColor":"BLUE"}'

# Confirm online list
curl -s 'http://127.0.0.1:8080/api/presence/online?userId=12'

# Start raid as attacker 12 → should return liveInviteSent:true
curl -s -X POST http://127.0.0.1:8080/api/raid/start \
  -H 'Content-Type: application/json' \
  -d '{"attackerId":12,"defenderId":34,"raidId":"smoke-1","attackerName":"Raider12"}'
```

Invite is pushed on `/topic/raid-invite/34` (needs a STOMP client subscribed to observe the frame). The JSON response alone proves the presence hook fired.

## Automated backend test

```bash
cd backend
mvn -q test -Dtest=LiveRaidFlowTest
```

Covers: offline skip, invite+join+catch → `completeLiveCaught`, speed reject helpers, defender disconnect → AI fallback (`joined=false`).

## Notes

- Server catch is authoritative; clients must not invent CAUGHT.
- SockJS endpoint: `/ws` (proxied by Vite). STOMP destinations: `/app/live-raid/{id}/join|position`, topics `/topic/live-raid/{id}/state` and `/topic/raid-invite/{userId}`.
