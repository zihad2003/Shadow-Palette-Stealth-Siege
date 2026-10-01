# Live Raid Hybrid — local testing

Default raids stay fully async (sessionLog → `RaidValidator`). Live takeover is **optional**: if the defender is online when a raid starts, they get a 15s STOMP invite to manually drive the PatrolRobot.

## Prerequisites

- Backend on `http://localhost:8080` with the H2 `local` profile:
  `mvn spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend Vite on `http://127.0.0.1:3000` (proxies `/api` and `/ws`)
- Two browsers. Each keeps the account the server assigns (`Player #####`, id `20161` or higher). Do not assume ids `12` and `34`.

## Two-browser manual test

1. **Window A (defender)** — normal browser → `http://127.0.0.1:3000`
   - Finish intro and enter the base so presence heartbeats run.
   - Stay on Base or the raid radar (not the splash).
   - Note the `Player #####` id on Co-op / Duo. That id is the defender.

2. **Window B (attacker)** — a private window → `http://127.0.0.1:3000`
   - This window gets a different account.
   - Open the raid radar and raid A's base. A human base appears when that player has a plot and the session is live.

3. **Expected**
   - Attacker’s `POST /api/raid/start` sees defender online → STOMP `/topic/raid-invite/{defenderId}`.
   - Window A shows “Someone is raiding your base — Join?” with countdown.
   - **Join** within 15s → Window A mounts live defense; Window B toast “A live defender has joined!”; robot follows defender WASD; attacker position syncs.
   - If defender catches (server distance ≤ `ROBOT_CATCH_DISTANCE`) → both get terminal `CAUGHT`; loot 0 + cooldown via `RaidService.completeLiveCaught`.
   - If defender ignores / disconnects → invite expires or `DEFENDER_LEFT`; attacker keeps AI patrol (no raid abort).

## API notes

`POST /api/session/start` is public and returns a JWT. Presence, raid start, and the online list need `Authorization: Bearer <jwt>`. A heartbeat that only sends `userId: 12` does not create that player. Use the two-browser steps above.

The invite frame is `/topic/raid-invite/{defenderId}`. STOMP connect also needs that JWT.

## Automated backend test

```bash
cd backend
mvn -q test -Dtest=LiveRaidFlowTest
```

Covers: offline skip, invite+join+catch → `completeLiveCaught`, speed reject helpers, defender disconnect → AI fallback (`joined=false`).

## Notes

- Server catch is authoritative; clients must not invent CAUGHT.
- SockJS endpoint: `/ws` (proxied by Vite). STOMP destinations: `/app/live-raid/{id}/join|position`, topics `/topic/live-raid/{id}/state` and `/topic/raid-invite/{userId}`.
