# OsloVille Browser Playtest Checklist

Use this checklist when verifying gameplay changes in a real browser.

## Environments
- Static prototype: open `index.html` directly.
- Multiplayer: `npm run dev` in `osloville-multi/backend` and `osloville-multi/frontend`, then visit `http://localhost:3000`.

## Core Flows
- [ ] Static login UI renders; demo/mock login succeeds and transitions into the game.
- [ ] Multiplayer Google Auth/login state changes without full-page reload.
- [ ] Map controls are usable: pan, zoom, and player movement feel responsive.
- [ ] Speech bubble updates immediately after changing status.
- [ ] Opening a player profile or chat does not crash or desync.
- [ ] Quests/leaderboard/events UI reflects expected state after actions.

## Realtime / Socket Behavior
- [ ] Presence updates correctly when another player joins or leaves.
- [ ] Reconnecting does not duplicate or incorrectly show players.
- [ ] Shop/collectible actions reflect server warnings when offline or delayed.

## Visual + Assets
- [ ] Map tiles show attribution correctly.
- [ ] Avatar/image fallbacks are visible when external assets are missing.
- [ ] Night/weather/juice effects run smoothly without major jank.

## Mobile / Resize
- [ ] Mobile layout remains usable at narrow widths.
- [ ] Orientation changes do not break map controls or input overlays.
