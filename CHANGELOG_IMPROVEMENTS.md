# CHANGELOG_IMPROVEMENTS.md

- 2026-08-05: added `AGENTS.md` for repo conventions and run commands.
- 2026-08-05: added `.github/agents/mapgame-reviewer.agent.md`.
- 2026-08-05: added `.github/instructions/browser-playtest-checklist.instructions.md`.
- 2026-08-05: added `.github/agents/oslobrowser-tester.agent.md`.
- 2026-08-05: fixed backend `CollectItem.execute()` return contract to `{ player, inventory }` in `backend/src/domain/use-cases/CollectItem.ts`.
- 2026-08-05: updated `backend/src/adapters/controllers/SocketController.ts` to emit `inventory_update` on collect.
- 2026-08-05: updated `frontend/app/page.tsx` socket handlers to listen/unlisten `inventory_update`.
- 2026-08-05: tightened `next.config.mjs` image remotePatterns.
- 2026-08-05: reduced duplicate GSI init warnings in static `app.js`.
- 2026-08-05: fixed winter walk quest gating and added leaderboard determinism.
- 2026-08-05: added safer avatar fallback handling in player/leaderboard rendering.
