-- OSLOVILLE Multiplayer Schema
-- Run this in Supabase SQL editor

-- Enable UUID
create extension if not exists "uuid-ossp";

-- Players table (live positions)
create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  email text,
  name text not null,
  avatar_url text,
  x float8 default 1000,
  y float8 default 900,
  lat float8 default 59.9139,
  lng float8 default 10.7522,
  status text default 'Hei Oslo! 👋',
  hat text default '🧶',
  acc text default '☕',
  color text default '#2A9D8F',
  coins int default 1240,
  xp int default 620,
  level int default 5,
  walk_km float8 default 2.4,
  discovered jsonb default '["palace","karljohan"]'::jsonb,
  updated_at timestamptz default now()
);

-- Chat table
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references public.players(id) on delete cascade,
  name text not null,
  avatar_url text,
  text text not null check (char_length(text) <= 120),
  x float8,
  y float8,
  created_at timestamptz default now()
);

-- Inventory (simple key/value per player)
create table if not exists public.inventories (
  player_id uuid references public.players(id) on delete cascade primary key,
  items jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.chat_messages;

-- RLS
alter table public.players enable row level security;
alter table public.chat_messages enable row level security;
alter table public.inventories enable row level security;

-- Policies: allow anon read, authenticated or anon write (for demo; tighten in prod)
create policy "Allow all read players" on public.players for select using (true);
create policy "Allow all insert/update players" on public.players for all using (true) with check (true);

create policy "Allow all read chat" on public.chat_messages for select using (true);
create policy "Allow all insert chat" on public.chat_messages for insert with check (true);
create policy "Allow all delete own chat" on public.chat_messages for delete using (true);

create policy "Allow all inventories" on public.inventories for all using (true) with check (true);

-- Function to cleanup offline players (optional cron)
create or replace function delete_old_players() returns void as $$
  delete from public.players where updated_at < now() - interval '2 hours';
$$ language sql;

-- Insert some landmarks reference (optional)
create table if not exists public.landmarks (
  id text primary key,
  name text,
  emoji text,
  x int,
  y int,
  lat float8,
  lng float8
);
insert into public.landmarks (id,name,emoji,x,y,lat,lng) values
('opera','Opera House','🎭',1380,1220,59.9075,10.7528),
('palace','Royal Palace','🏰',620,520,59.9170,10.7276),
('vigeland','Vigeland Park','🌳',380,680,59.927,10.700),
('akershus','Akershus Fortress','⚔️',1020,1020,59.907,10.737),
('akerbrygge','Aker Brygge','⛵',800,1100,59.908,10.722),
('karljohan','Karl Johan Gate','🛍️',900,780,59.913,10.739),
('holmenkollen','Holmenkollen','⛷️',420,220,59.963,10.668),
('gruner','Grünerløkka','☕',1280,580,59.923,10.757)
on conflict (id) do nothing;
