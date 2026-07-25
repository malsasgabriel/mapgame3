# EN / RU localization quality gate

OSLOVILLE currently supports **English (`en`)** and **Russian (`ru`)**. The locale is deliberately a frontend presentation setting: player IDs, item IDs, QA categories and server events stay stable across languages.

## Behaviour

- First visit: Russian is selected when the browser language begins with `ru`; otherwise English is selected.
- Explicit choice: the `RU` / `EN` switch is available **before login** and in the in-game header. The choice is persisted as `oslo_lang` in local storage.
- Runtime: changing language updates visible UI immediately and sets `<html lang="en|ru">` for assistive technology.
- Number/date formatting uses `en-GB` or `ru-RU`.
- The translated surface includes login, loading, HUD, landmarks, districts, quests, shop, bag, photo mode, settings, feedback form, notices, accessibility labels, offline bots and rule-based NPC responses.

## Intentionally not translated

- Player names, player-authored bubbles and chat messages: translating them would change the speaker’s content and create moderation ambiguity.
- Oslo proper names and real business names, such as `Aker Brygge` and `Tim Wendelboe`: their explanatory text is localized, but names remain recognisable.
- Server protocol values (`gameplay`, `major`, item IDs) remain stable. Their labels are localized in the player UI.

## Review checklist

Before calling a localization release ready:

```bash
cd osloville-multi/frontend
npm run build
```

Then perform this manual smoke pass in both languages:

1. Open a new browser profile with `navigator.language` set to `ru-RU`; verify Russian before login.
2. Switch `RU → EN` on the login card, then enter the world. Switch back in the header without reloading.
3. Check all modal paths: shop, bag, customizer, photo mode, feedback and settings.
4. Trigger a pickup rejection, landmark discovery, quest completion and QA report acknowledgment; verify system notices use the selected locale.
5. Visit Grünerløkka and chat with an NPC in both languages.
6. Test keyboard focus and screen-reader labels on the map controls and language button.

The source of truth is `frontend/lib/i18n.ts`. New player-visible text must be added there in **both** locales in the same change; direct hard-coded UI copy is not accepted in review.
