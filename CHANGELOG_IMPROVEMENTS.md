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
- 2026-08-07: critic/tester pass — extracted an authoritative `COLLECTIBLE_REWARDS`/`COLLECT_XP` table in `backend/src/domain/world.ts` and removed the silent reward default from `CollectItem`.
- 2026-08-07: added backend domain tests covering `CollectItem` rewards, the XP→level boundary (level never regresses), and reward-table completeness (5→8 tests).
- 2026-08-07: wired the real `PerformanceMonitor` into `frontend/app/page.tsx` so the HUD/diagnostics FPS readout is live instead of a hardcoded 60.
- 2026-08-07: hydrated server-authoritative `discovered` landmarks and `status` on `join_success` so returning players see the correct N/8 discovery count.
- 2026-08-07: added `.github/workflows/ci.yml` to enforce the backend build+tests and frontend production build gates on every push/PR.
