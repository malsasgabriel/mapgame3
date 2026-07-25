# OSLOVILLE — Live Map Social (FarmVille + Oslo + Supabase)

Two versions inside this workspace:

### 1) Static AAA Prototype (ready now)
- File: `/index.html` + `style.css` + `app.js` + `assets/`
- Runs offline, no backend needed, Google Identity mock + demo login
- Features: storybook map, player pins with speech bubbles, quests, shop, bag, snow, night aurora, tutorial
- Open `index.html` in preview or browser

### 2) Next.js + Supabase Multiplayer (new)
- Folder: `/osloville-multi`
- `npm install && npm run dev` on localhost:3000
- Real-time multiplayer via Supabase Realtime (players + chat)
- Google Auth via Supabase Auth (OAuth)
- Offline fallback to bot mode if env vars missing
- See `/osloville-multi/README.md` + `supabase.sql` for setup (5 min)

**Google Auth**:
- Static: uses GIS library, paste Client ID in settings
- Next.js: enable Google provider in Supabase Auth settings

Enjoy exploring Oslo — Hei! 👋
