# AGENTS.md — OsloVille

Use this file to stay aligned with the repo’s two-product layout and the multiplayer app’s conventions.

- Static prototype: `index.html`, `style.css`, `app.js`, `assets/`
- Multiplayer app: `osloville-multi/`
  - Backend: Clean-architecture TypeScript in `backend/src/`
  - Frontend: Next.js 14 app in `frontend/`

Read these instead of guessing:
- `README.md` for the dual-app boundary and quick-start overview
- `osloville-multi/README.md` for Docker, local runs, and Google Auth setup
- `osloville-multi/LAUNCH.md` for shipped cycles and run modes
- `osloville-multi/REAL_MAP.md` for map tile/attribution policy

## Repo Ground Rules
- Keep gameplay rules server-true in `backend/src/domain/use-cases/`.
- Keep player-facing text localized through `osloville-multi/frontend/lib/i18n.ts`; avoid hardcoded UI copy.
- Never bypass backend repositories from adapters.
- Do not assume offline safety for map tiles or avatar images in `frontend/`.
- Use `.env.local` for secrets; `.env.local.example` shows canonical keys. Do not commit real secrets.
- Map tiles default to OSM-style attribution; production should use an authorized provider.

## Run Commands
- Static prototype: open `index.html` from the repo root.
- Backend tests:
```bash
cd osloville-multi/backend
npm install
npm run build
node --test dist/tests/*.test.js
npm run dev
```
- Frontend:
```bash
cd osloville-multi/frontend
npm install
npm run dev
```
- Stack tests/lint:
```bash
cd osloville-multi/frontend
npm run lint
```
- Docker multiplayer stack:
```bash
cd osloville-multi
cp .env.local.example .env.local
docker compose up --build -d
```
- Realtime playtest:
```bash
cd osloville-multi/backend
PLAYTEST_URL=http://localhost:8080 npm run playtest:realtime
```

## Edit Boundaries
- Root `app.js` edits stay in the static prototype; do not migrate prototype features into `osloville-multi/` without a clear plan.
- Frontend gameplay state lives heavily in `osloville-multi/frontend/app/page.tsx`; edit component boundaries carefully.
- Backend migrations or schema changes need a path through `backend/src/infrastructure/db/connection.ts`; do not alter DB schema ad hoc.
- `reactStrictMode: false` is intentional in `next.config.mjs`; do not “fix” apparent double-effect behavior without review.
- Reconnect behavior affects presence and rate limiting; preserve intended reconnect semantics.

## Localization
- `LOCALIZATION.md` covers the player-facing localization checklist and supported locales.
- Update strings in `frontend/lib/i18n.ts`; keep server-side domain strings stable.

## Playtest & Review Docs
- `PLAYTEST.md` covers live tester protocol and bug report format.
- `SENIOR_GD_REVIEW.md` covers regression/fix review expectations and build gates.

## When Stuck
- Treat missing `.env` as expected in fresh clones; prefer documenting setup in instructions over inventing credentials.
- If only root `app.js` behavior needs changing, scope there; if multiplayer behavior matches, edit the corresponding backend use case and/or frontend integration.