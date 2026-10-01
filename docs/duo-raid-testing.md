# Duo raid and voice — how to test

Two browsers party up, talk through the game server, ready on one target, and drop into that base together.

## Before you start

- Backend: `mvn spring-boot:run -Dspring-boot.run.profiles=local` so `http://localhost:8080/api/health` is ok.
- Frontend: `http://127.0.0.1:3000` (proxies `/api` and `/ws`).
- Two browsers, or one normal window and one private window.
- Each window shows its own `Player #####` on **Co-op / Duo**. Invite that number. Do not type `12` or `34`.

## Steps

1. Both windows finish the intro and open the raid radar so presence heartbeats run.
2. Window A opens **Co-op / Duo** and invites B's player id. B accepts.
3. Both should see the lobby and a voice bar at the top left. Each clicks **Click to talk** and allows the microphone. The dot turns green when that mic is live.
4. The host picks a faction base. Both press **READY**.
5. The lobby stays up and counts **DROP IN**. The host cannot switch bases during that countdown. When it hits zero, both enter that same base. Neither player should remain on the lobby while the other is already inside.
6. Walk. Each client should see the partner move. One searchlight hit raises the alarm for both. One player caught stays pinned. The other can keep going. House loot is split.

## If someone is left outside

- The account line must be a real player id. `Player 0null` means the session never started.
- Both must be in the lobby when they press ready. The server sets one `defenderId`, one `raidId`, and one `launchAt`.
- A client that missed the socket update still polls `/api/duo/user/{id}` and uses the same `launchAt`.
- Camo has to be one of the game colors or that client refuses to enter. Fix the color and ready again.

## Voice

- Room: `/app/voice/{partyId}` up, `/topic/voice/{partyId}` down.
- Audio is 16 kHz PCM, about 20 ms per message. The receiver does not build a long delay buffer.
- The mic stops when the party ends or the player leaves the raid screens.
- Jail intercom uses a different room, `jail_{smallerId}_{largerId}`.

## Sockets

- Invite: `/topic/duo-invite/{userId}`
- Party: `/topic/duo/{partyId}/state`
- Signals (loot, wall): `/topic/duo/{partyId}/signal`
- Position: `/app/duo/{partyId}/position`

Duo raids do not also send the solo live-defender invite.

## Automated test

```bash
cd backend
mvn -q test -Dtest=DuoFlowTest
```

That test checks invite, accept, a shared ready drop (same raid id, same target, `launchAt` still in the future), and position sync.
