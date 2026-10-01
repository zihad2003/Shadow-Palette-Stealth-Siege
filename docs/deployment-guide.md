# Deployment Guide

The live game is a Vite frontend on Vercel and a Docker backend on Render. Two players on different networks meet through that backend. Voice uses the same websocket. There is no TURN server.

## What must be true

1. Render is actually running. `GET /api/health` returns `{"status":"ok"}`.
2. The service uses the `local` profile, or a MySQL host that still resolves.
3. The Vercel build has `VITE_API_BASE_URL` set to that Render `https` URL, with no trailing slash.

If the raid screen says `Player 0null` and the target list is empty, the browser never got an account. The API URL is missing, or the backend is down.

## Backend (Render)

`render.yaml` is the blueprint: Docker, context `./backend`, `SPRING_PROFILES_ACTIVE=local`, `PORT=8080`, health check `/api/health`.

1. New **Web Service**, connect this GitHub repo, branch `main`.
2. Runtime **Docker**. Dockerfile path `./backend/Dockerfile`. Docker context `./backend`.
3. Environment:
   - `SPRING_PROFILES_ACTIVE` = `local`
   - `PORT` = `8080`
   - `FLYWAY_ENABLED` = `false`
4. Delete `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SPRING_DATASOURCE_DRIVER` unless you have a database that answers DNS today.
5. Leave `ALLOWED_ORIGINS` empty. Empty allows the Vercel domain. Set it only when you want to lock the API to specific `https://….vercel.app` origins.
6. Deploy. Open `https://<your-service>.onrender.com/api/health`.

`backend/docker-entrypoint.sh` is the safety net. If `SPRING_DATASOURCE_URL` names a host that does not resolve, the container logs that and starts on H2 instead of exiting in Flyway. A host that resolves but refuses connections is not covered. Remove that URL.

### Free plan limits

The embedded database is a file inside the container. Render sleeps the free service and redeploys replace the disk. Accounts, bases, and the five bot seeds come back on the next boot, but player progress does not survive that restart.

To keep progress, point `SPRING_DATASOURCE_URL` at a MySQL server you control, set the username, password, and `SPRING_DATASOURCE_DRIVER=com.mysql.cj.jdbc.Driver`, and do not set `SPRING_PROFILES_ACTIVE=local` for that boot. The host must resolve from inside Render.

## Frontend (Vercel)

1. Import the repo. Root directory `frontend`. Framework Vite.
2. Build command `npm run build`. Output directory `dist`.
3. Environment variable, set before the build:

```text
VITE_API_BASE_URL=https://<your-service>.onrender.com
```

No trailing slash. Vite inlines this at build time. Changing it later requires another deploy.

If the variable is missing on a `vercel.app` host, the client falls back to `https://shadow-palette-backend.onrender.com`. That name only works when that exact Render service exists. Localhost never uses the fallback. It uses the Vite proxy.

## After deploy

1. Open the Vercel site, reach the raid radar, and confirm the account line is `Player` plus a number, not `Player 0null`. If the radar says the server is still waking up, wait and press **Try again**.
2. The five faction bases should be listed (Crimson Citadel through Amethyst Sanctum).
3. From a second device, open **Co-op / Duo**, invite the first player's id, accept, and click **Click to talk** on both sides.
4. Both press **READY**. The lobby stays up and counts **DROP IN**, then both should enter the same base. After a solo escape, the result card stays until **Return to base**.

## When it breaks

| What you see | What to change |
|---|---|
| Render log: `UnknownHostException` and a MySQL hostname | Delete the datasource env vars, set `SPRING_PROFILES_ACTIVE=local`, redeploy |
| `No active profile set` and Flyway opens MySQL | Same as above. The dashboard env is overriding `render.yaml` |
| Raid radar empty, `Player 0null` | Backend down, or Vercel built without `VITE_API_BASE_URL` |
| Friend never appears | Both must be on the raid screen. The free backend must be awake |
| Voice is silent | Each player clicks **Click to talk** and allows the mic |
| One player enters the raid and the other stays in the lobby | Redeploy the backend and frontend that share `launchAt` |

## Local versus production

| | Local | Production |
|---|---|---|
| Site | `http://127.0.0.1:3000` | Vercel |
| API | Vite proxy to `localhost:8080` | `VITE_API_BASE_URL` |
| Data | `backend/data/shadow_palette` | H2 on the container, unless MySQL is set |
| Profile | `local` | `local`, unless a real MySQL URL is set |
