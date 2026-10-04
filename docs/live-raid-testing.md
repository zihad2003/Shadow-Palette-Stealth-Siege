# Live Raid Hybrid — local testing

Default raids stay fully async (sessionLog → `RaidValidator`). Live defense is **silent**: when the defender is online, their client auto-joins the session without any toast or popup. The owner defends in person with their own character — there is no robot takeover.

## Prerequisites

- Backend on `http://localhost:8080` with the H2 `local` profile:
  `mvn spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend Vite on `http://127.0.0.1:3000` (proxies `/api` and `/ws`)
- Two browsers. Each signs in as its own player (name and PIN, id `20161` or higher). Do not assume ids `12` and `34`.

## Two-browser manual test

1. **Window A (defender)** — normal browser → `http://127.0.0.1:3000`
   - Finish intro and stay on the Base Builder screen so presence heartbeats run and the base view can auto-join.
   - Note the `Player #####` id on Co-op / Duo. That id is the defender.

2. **Window B (attacker)** — a private window → `http://127.0.0.1:3000`
   - This window gets a different account.
   - Open the raid radar and raid A's base. A human base appears when that player has a plot and the session is live.

3. **Expected**
   - Attacker’s `POST /api/raid/start` sees defender online → STOMP `/topic/raid-invite/{defenderId}`.
   - Window A shows **no notification**. Its Base Builder auto-joins as DEFENDER and the raider's character appears walking in the base.
   - Window B toast “A live defender has joined!” and the owner's character (model + camo, not a robot) appears chasing.
   - Window A walks within 2.5 tiles of the raider → prompt `Hold F 3s to catch and send to jail`. Holding F for 3 seconds locks them in jail; the server validates distance ≤ `LIVE_CATCH_DISTANCE` (`CATCH` + `CAUGHT_IN_JAIL`).
   - The server records the raid via `RaidService.completeLiveCaught` (loot 0 + cooldown + jail stay) and both windows enter the ransom sequence.
   - If the raider escapes or extracts first, the attacker publishes `RAID_ENDED` and the raider vanishes from Window A.
   - If defender never enters the base / disconnects → invite expires or `DEFENDER_LEFT`; attacker keeps AI patrol (no raid abort).

## API notes

`POST /api/session/start` is public and returns a JWT. Presence, raid start, and the online list need `Authorization: Bearer <jwt>`. A heartbeat that only sends `userId: 12` does not create that player. Use the two-browser steps above.

The invite frame is `/topic/raid-invite/{defenderId}`. STOMP connect also needs that JWT.

## Automated backend test

```bash
cd backend
mvn -q test -Dtest=LiveRaidFlowTest
```

Covers: silent live session for a human even without a heartbeat, join, CATCH range rejection, hold-F catch → jail (`completeLiveCaught`), attacker `RAID_ENDED` cleanup, speed reject helpers, defender disconnect → AI fallback (`joined=false`).

## Notes

- The catch is defender-initiated: proximity alone never ends the raid. The server validates the `CATCH` distance; clients must not invent `CAUGHT`.
- SockJS endpoint: `/ws` (proxied by Vite). STOMP destinations: `/app/live-raid/{id}/join|position`, topics `/topic/live-raid/{id}/state` and `/topic/raid-invite/{userId}`.
