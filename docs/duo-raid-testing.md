# Duo voice + co-op raid — local testing

Invite an online friend, open a WebRTC audio call (signaled over STOMP), then both attack the same base as independent characters. Alarm is shared; catch and extract are per-player; greed loot is half for each duo member.

## Prerequisites

- Backend: `http://localhost:8080` with H2 local profile  
  `mvn spring-boot:run -Dspring-boot.run.profiles=local`
- Frontend Vite: `http://127.0.0.1:3000` (proxies `/api` and `/ws`)
- Two browsers (or one normal + one Incognito) with mic permission
- Same Wi‑Fi / localhost first (no TURN yet)

## Two-browser manual test

1. **Window A** → `http://127.0.0.1:3000/?userId=12`  
   Finish intro / reach Raid Finder so presence heartbeats run.

2. **Window B** → `http://127.0.0.1:3000/?userId=34` (Incognito)  
   Same — open Raid Finder.

3. **Invite**  
   On A, open **Duo** on Raid Finder → Invite player 34.  
   B shows “wants a duo raid” → **Accept**.  
   Both should see the bottom **Duo** voice bar; allow mic; status → `connected`.

4. **Raid**  
   Host (A) picks any target (e.g. North Citadel). Guest is pulled into the same raid.  
   Each should see the other move on the grayscale map.

5. **Expected**  
   - One enters the searchlight → both get siren / gate lock.  
   - One caught by patrol → only that client ends CAUGHT; partner can keep raiding.  
   - Successful extract → greed loot is **half** of the solo payout for that member.

## Curl smoke (invite without UI)

```bash
# Heartbeat both users
curl -s -X POST http://127.0.0.1:8080/api/presence \
  -H 'Content-Type: application/json' \
  -d '{"userId":12,"username":"Host12","characterModel":1,"camoColor":"BLUE"}'
curl -s -X POST http://127.0.0.1:8080/api/presence \
  -H 'Content-Type: application/json' \
  -d '{"userId":34,"username":"Guest34","characterModel":1,"camoColor":"RED"}'

# Invite
curl -s -X POST http://127.0.0.1:8080/api/duo/invite \
  -H 'Content-Type: application/json' \
  -d '{"hostId":12,"guestId":34,"hostName":"Host12"}'
```

## Automated backend test

```bash
cd backend
mvn -q test -Dtest=DuoFlowTest
```

Covers: offline guest reject, invite → accept → start raid → position + shared alarm latch.

## Notes

- STOMP: `/topic/duo-invite/{userId}`, `/topic/duo/{partyId}/state`, `/topic/duo/{partyId}/signal`  
  App destinations: `/app/duo/{partyId}/position`, `/app/duo/{partyId}/signal`
- Duo skips the solo live-defender invite path for that raid.
- Voice is audio-only WebRTC; hard NAT may need TURN later.
