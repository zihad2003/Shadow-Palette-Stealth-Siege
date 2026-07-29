# Personal Setup Guide — Shadow Palette: Stealth & Siege

## 1. Tools to install first

| Tool | Purpose | Notes |
|---|---|---|
| **Java JDK 17** (LTS) | Backend runtime | Use Temurin/Adoptium build |
| **Maven** | Backend build tool | Usually bundled with Antigravity/IDE, but install standalone too |
| **MySQL Server 8.x** | Database | Or run via Docker if you don't want a local install (see below) |
| **Node.js 20 LTS + npm** | Frontend tooling | For Vite dev server |
| **Git** | Version control | You already have a GitHub account (zihad2003) |
| **Google Antigravity** | Your coding IDE/agent | Download from antigravity.google, sign in with your Google account |
| **Postman** (optional) | Manual API testing | Useful alongside the Antigravity agent for spot-checking endpoints |
| **DBeaver or MySQL Workbench** (optional) | Database GUI | Handy for inspecting tables while developing |

## 2. Antigravity setup notes
- On first launch it asks you to pick a **development mode**: Autopilot (full auto), Review-driven (asks before every action), or **Agent-assisted** (recommended — you stay in control, agent handles safe automations).
- It's **project-centric** — open the folder containing both `/backend` and `/frontend` as one Antigravity project so the agent has full context.
- Use **Plan mode** for anything beyond a trivial fix — it generates a Plan Artifact you can review/edit before it executes, which matters a lot for a multi-phase project like this.

## 3. Backend packages (Spring Boot, Maven)
Add these dependencies (Phase 0 prompt already asks Antigravity to set this up, but for reference):
- `spring-boot-starter-web` — REST controllers
- `spring-boot-starter-data-jpa` — JPA/Hibernate
- `mysql-connector-j` — MySQL driver (note: newer artifact name, not `mysql-connector-java`)
- `spring-boot-starter-validation` — request validation (`@Valid`, etc.)
- `lombok` — cuts entity/DTO boilerplate (`@Getter`, `@Builder`, etc.)
- `spring-boot-devtools` — hot reload during development
- `springdoc-openapi-starter-webmvc-ui` — auto-generated Swagger UI at `/swagger-ui.html`, useful for manually testing endpoints as you build them
- `spring-boot-starter-test` — included by default, keep it for basic tests

## 4. Frontend packages (npm)
Minimal by design — this is plain Canvas/JS, not a framework app:
- `vite` — dev server + build tool (scaffolded via `npm create vite@latest`)
- Nothing else is required to start. Add later only if needed:
  - `axios` — optional, `fetch()` is enough for this project's API calls

## 5. Database setup
**Option A — local install:** install MySQL Server 8.x, then:
```sql
CREATE DATABASE shadow_palette;
```

**Option B — Docker (simpler, no system-wide install):**
```bash
docker run --name shadow-palette-db -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=shadow_palette -p 3306:3306 -d mysql:8
```

## 6. Project init script
Run this once to scaffold both projects (or hand it to Antigravity as the Phase 0 prompt does):

```bash
#!/bin/bash
set -e

# --- Backend: Spring Boot via Spring Initializr ---
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,mysql,validation,lombok,devtools \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.3.0 \
  -d baseDir=backend \
  -d groupId=com.shadowpalette \
  -d artifactId=shadow-palette-backend \
  -d name=ShadowPalette \
  -d packageName=com.shadowpalette \
  -o backend.zip
unzip backend.zip -d backend
rm backend.zip

# --- Frontend: Vite + vanilla JS ---
npm create vite@latest frontend -- --template vanilla
cd frontend && npm install && cd ..

echo "Done. Backend in ./backend, Frontend in ./frontend"
echo "Next: add MySQL connection details to backend/src/main/resources/application.yml"
```

## 7. `application.yml` starting point (backend)
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/shadow_palette
    username: root
    password: yourpassword
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
server:
  port: 8080
```

## 8. Quick sanity checklist before Phase 1 starts
- [ ] `mvn spring-boot:run` starts the backend without errors
- [ ] `npm run dev` starts the frontend dev server
- [ ] MySQL is reachable and `shadow_palette` database exists
- [ ] Antigravity project is opened at the repo root (sees both `/backend` and `/frontend`)
- [ ] Git repo initialized and first commit pushed
