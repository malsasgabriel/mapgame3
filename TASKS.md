# TASKS.md

- [x] Run backend tests/build (8 domain tests green via `node --test dist/tests/*.test.js`).
- [x] Run frontend production build in `osloville-multi/frontend` (`npm run build` compiles + type-checks).
- [x] Validate the game shell in a headless browser (offline fallback): login, customizer, HUD, and live FPS confirmed.
- [x] Add CI to enforce backend build+tests and frontend build gates (`.github/workflows/ci.yml`).
- [x] Fix landmark discovery hydration on join (returning players now see the correct N/8 count).
- [ ] Configure ESLint so `npm run lint` runs non-interactively (currently prompts for setup).
- [ ] Fix mobile joystick/collectible/landmark discovery in multiplayer against a live backend.
- [ ] Review and fix static prototype chat/avatar/leaderboard edge cases.
- [ ] Update docs to match current stack and run commands.
