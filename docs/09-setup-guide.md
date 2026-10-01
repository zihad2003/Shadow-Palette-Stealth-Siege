# Local setup

The repo already contains the Spring Boot backend and the React frontend. You do not scaffold it again, and you do not need MySQL to play.

## Install

| Tool | Why |
|---|---|
| JDK 17 | Backend |
| Maven 3.9+ | `mvn spring-boot:run` |
| Node.js 20+ and npm | Vite |
| Git | This repo |

## Run

Terminal 1:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Wait until the log says the application started. API: `http://localhost:8080`. Health: `http://localhost:8080/api/health`. Swagger: `http://localhost:8080/swagger-ui.html`.

Terminal 2:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`. Vite sends `/api` and `/ws` to port 8080. Leave `VITE_API_BASE_URL` empty on your machine.

## What you should see

- The title waits for a click. It does not skip itself.
- The raid radar shows a real `Player #####`, not `Player 0null`. If it says the raid server is still waking up, wait and press **Try again**.
- Five bot bases are listed. They are seeded as users 101–105.
- Your account id is `20161` or higher. The browser stores `sp_userId`, `sp_jwt`, and `sp_device_token`.

The H2 file is `backend/data/shadow_palette`. Deleting those files starts a fresh world the next boot.

## Two players on one computer

Use a normal window and a private window. Each gets its own account. On the raid screen, open **Co-op / Duo** and invite the other window's player id. Both click **Click to talk**, then both press **READY**. The drop countdown should take both into the same base.

Do not force `?userId=12`. Ids below `20161` are not resumed unless the device token matches, and `12` never matches a guest account.

## Optional MySQL

Only if you already have a server that accepts connections. Set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SPRING_DATASOURCE_DRIVER=com.mysql.cj.jdbc.Driver`, and do not use the `local` profile for that run. If the host does not resolve, the app should not point at it.

## Checks

```bash
cd backend
mvn test

cd frontend
npm run build
```

More play steps: [duo-raid-testing.md](duo-raid-testing.md) and [live-raid-testing.md](live-raid-testing.md). Deploy steps: [deployment-guide.md](deployment-guide.md).
