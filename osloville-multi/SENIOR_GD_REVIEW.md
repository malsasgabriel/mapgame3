# Senior game-dev + professional-player review — 10 recursive rounds

Каждый раунд ниже — не список желаний, а конкретная проверка gameplay/realtime риска, изменение кода и regression gate. Это первая «дотошная» серия перед внешним playtest.

| # | Роль ревью | Найденный риск | Исправление | Проверка |
|---|---|---|---|---|
| 1 | Progression designer | UI считал XP от level 1, сервер — от level 5; level-up и season tier расходились | Единая формула: старт `Lv 5`, `1,000 XP` на уровень в `lib/progression.ts` | Backend + frontend build |
| 2 | Economy / anti-cheat | Браузер сам добавлял landmark coins/XP и мог прислать любые `discovered` IDs | Landmark proximity, reward, XP и level теперь вычисляет server `MovePlayer` | `gameRules.test.ts` |
| 3 | Multiplayer engineer | Reconnect давал connected UI без server join; старый socket мог выбросить игрока из presence | Session rejoin, replacement старого socket, защита от ложного `player_left` | QA swarm reconnect case |
| 4 | MMO presence reviewer | Join показывал игроков, которые были offline до часа | В live list остаются только active sockets и NPC | QA swarm presence/reconnect case |
| 5 | Gameplay systems designer | Pickup мог засчитаться до server response, а после reconnect/рестарта визуально возвращался | Authoritative collect ack, reject rollback/cooldown, `world_state` и durable daily claim ledger в PostgreSQL | QA swarm collect + reconnect snapshot |
| 6 | Network/security engineer | Rate-limit был привязан к socket ID, поэтому reconnect сбрасывал ограничение | После join quota ключуется player ID; stale windows очищаются bounded pruning | Socket controller review + build |
| 7 | Performance engineer | Каждый movement tick синхронно писал analytics в localStorage | Move events sampled 500ms, persistence batched раз в секунду, capped 500 events | frontend build |
| 8 | Navigation designer | Navmesh генерировался через `Math.random()`: у игроков были разные маршруты и diagonal clipping | Детерминированная water mask, nearest walkable target, no corner-cut A* | frontend build |
| 9 | Accessibility/mobile specialist | Документированные WASD отсутствовали; offline сессия была пустой | Keyboard movement/focus ring, offline social bot fallback при socket failure | frontend build |
| 10 | QA automation lead | Не было repeatable rules regression suite | Node test suite для move/discovery, catalog purchase и daily world + расширенный 3-player realtime swarm | `npm test`, `playtest:realtime` |

## Gates

```bash
cd osloville-multi/backend
npm test                    # deterministic domain rules
PLAYTEST_URL=http://localhost:8080 npm run playtest:realtime

cd ../frontend
npm run build
```

`playtest:realtime` требует поднятый PostgreSQL + backend stack. Он проверяет join, presence, server movement, pickup/HUD, server discovery, chat, shop, report queue, reconnect и world-state recovery. Для человеческих сессий используйте [PLAYTEST.md](PLAYTEST.md).

## Следующий рекурсивный вход

После появления первых 10+ реальных report из `playtest_reports` агент должен брать не «самую красивую» задачу, а top blocker/major по следующей формуле:

`impact × frequency × reproducibility ÷ fix risk`.

Каждый fix возвращается в domain test либо realtime swarm, затем повторно подтверждается тем же профессиональным тестером на staging.
