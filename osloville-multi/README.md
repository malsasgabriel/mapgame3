# OSLOVILLE — Containerized Next.js + PostgreSQL + Socket.io (Clean Architecture)

**For real-time professional tester sessions:** read [PLAYTEST.md](PLAYTEST.md). It includes the live bug-report queue and the three-client automated QA gate. The completed 10-round senior review is documented in [SENIOR_GD_REVIEW.md](SENIOR_GD_REVIEW.md).

OsloVille is a FarmVille-style cozy social map game centered on **real Oslo** with real-time multiplayer coordination, persistent player statistics, dynamic weather, custom cosmetics, and local/Google authentication.

This version replaces the cloud-dependent Supabase backend with a fully self-hosted, Dockerized architecture suitable for native WSL execution.

---

## Architecture Overview

OsloVille is structured as a monorepo with three containerized services:
1. **Frontend (`frontend/`)**: Next.js (App Router, React, TypeScript, Leaflet) exposed on `http://localhost:3000`.
2. **Backend (`backend/`)**: Node.js TypeScript server running Express (REST) and Socket.io (WebSockets) on `http://localhost:8080`.
3. **Database (`db/`)**: PostgreSQL 16 image exposed on `http://localhost:5432` with a persistent Docker volume (`pgdata`).

```
+------------------+             +--------------------+
|  Next.js client  |<=== (WS) ===>| Node WebSocket Srv |
|  (Port 3000)     |              | (Port 8080)        |
+------------------+              +----------+---------+
                                             |
                                           (SQL)
                                             v
                                  +----------+---------+
                                  |    PostgreSQL      |
                                  |    (Port 5432)     |
                                  +--------------------+
```

---

## Clean Architecture (Backend)

The backend is built following **Clean Architecture** principles to separate business rules from transport frameworks and databases:

- **Domain Layer (`src/domain/`)**:
  - **Entities**: Pure data models (`Player`, `ChatMessage`, `Collectible`) representing core game objects.
  - **Repositories (Ports)**: Interfaces defining database boundaries (`IPlayerRepository`, `IChatRepository`) that the use cases rely on.
- **Use Case Layer (`src/domain/use-cases/`)**:
  - Implements orchestrating business logic (e.g., `AuthenticatePlayer`, `MovePlayer`, `SendChat`, `CollectItem`, `BuyShopItem`, and `NpcSimulateTick`). These contain no references to database systems or HTTP/Socket frameworks.
- **Adapter Layer (`src/adapters/`)**:
  - **Controllers**: Entry ports from outer layers (`HttpController` for REST endpoints, `SocketController` for WebSocket events).
  - **Repository Implementations**: Database logic matching repository ports (`PostgreSQLPlayerRepository`, `PostgreSQLChatRepository`) using standard SQL queries.
- **Infrastructure Layer (`src/infrastructure/`)**:
  - Concrete drivers and frameworks (`ExpressServer` for Express initialization, `SocketServer` for Socket.io, and `db/connection` for Postgres pg-pool configuration).

---

## Quick Start (WSL Native Docker)

The entire project is pre-configured to be plug-and-play. On start, the backend automatically runs migrations to initialize the database tables if they do not exist.

### 1. Build and Launch
Navigate to the project root and spin up the Docker Compose stack:
```bash
cd osloville-multi
docker compose up --build -d
```

### 2. Play
Open `http://localhost:3000` in your web browser.
- Open multiple tabs or different browsers to test the real-time coordination!
- Click anywhere on the map to walk (autocals paths using A* pathfinding).
- Send chats to display bubbles above your avatar and update the global feed.
- Collect stars/coins on the map to earn XP and level up.
- Enter the Shop modal to purchase new accessories using your coins.

### 3. Check Logs
To monitor real-time server activity, database logs, or NPC simulation ticks:
```bash
docker compose logs -f
```

---

## Realtime Synchronization & Engine

- **Coordination**: Player movements, chats, collectibles, and visual customization are updated on the WebSocket layer via low-latency Socket.io events.
- **Server NPC Simulation**: The server runs an autonomous tick loop (every 4 seconds) using `NpcSimulateTick`. It calculates movements and status updates for 8 bot NPCs, writing positions directly to PostgreSQL and broadcasting updates so bots behave consistently for all connected players.
- **Zero-Config Migrations**: The database connection pool (`connection.ts`) runs automatic table schemas at startup, verifying indices and constraints.
- **Cosmetics Persistence**: Purchases made in the Shop modal are verified by the backend (deducting coins) and persisted directly to the user's inventory record in Postgres.

---

## Google Auth Setup

1. Create a Web application client ID on the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add authorized JavaScript origins: `http://localhost:3000`
3. Set your client ID:
   - **Environment Variable**: Set `GOOGLE_CLIENT_ID` in `docker-compose.yml` (or copy `.env` from template).
   - **In-Game Settings**: You can also override the Client ID in real-time in the game's **Settings panel** ⚙️. The client dynamically loads it and initializes Google One-tap/Sign-In buttons.
4. When signed in, the client sends the ID JWT token to the backend, which verifies the token via `google-auth-library` and retrieves or establishes user data.
5. If no client ID is set, the login screen automatically falls back to a custom-styled demo account chooser or a quick anonymous login option.
