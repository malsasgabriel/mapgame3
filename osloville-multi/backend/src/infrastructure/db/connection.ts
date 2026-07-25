import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'osloville',
  max: 20, // Max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(dbConfig);

// Database initialization schema query
const SCHEMA_SQL = `
  -- Create players table
  CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    x DOUBLE PRECISION DEFAULT 1000,
    y DOUBLE PRECISION DEFAULT 900,
    lat DOUBLE PRECISION DEFAULT 59.9139,
    lng DOUBLE PRECISION DEFAULT 10.7522,
    status TEXT DEFAULT 'Hei Oslo! 👋',
    hat VARCHAR(50) DEFAULT '🧶',
    acc VARCHAR(50) DEFAULT '☕',
    color VARCHAR(50) DEFAULT '#2A9D8F',
    coins INT DEFAULT 1240,
    xp INT DEFAULT 620,
    level INT DEFAULT 5,
    walk_km DOUBLE PRECISION DEFAULT 2.4,
    discovered JSONB DEFAULT '["palace","karljohan"]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Create inventories table
  CREATE TABLE IF NOT EXISTS inventories (
    player_id VARCHAR(100) PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    items JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Create chat messages table
  CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    player_id VARCHAR(100) REFERENCES players(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    text VARCHAR(255) NOT NULL,
    x DOUBLE PRECISION,
    y DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Shared daily world pickup ownership. The primary key makes collection
  -- atomic even when two sockets reach the same item simultaneously.
  CREATE TABLE IF NOT EXISTS world_pickup_claims (
    world_day DATE NOT NULL,
    item_id VARCHAR(32) NOT NULL,
    collector_id VARCHAR(100) REFERENCES players(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_day, item_id)
  );

  -- Playtest feedback: a durable queue for human test sessions and QA agents.
  CREATE TABLE IF NOT EXISTS playtest_reports (
    id VARCHAR(100) PRIMARY KEY,
    player_id VARCHAR(100) REFERENCES players(id) ON DELETE SET NULL,
    player_name VARCHAR(255) NOT NULL,
    category VARCHAR(48) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('blocker', 'major', 'minor', 'idea')),
    title VARCHAR(140) NOT NULL,
    reproduction VARCHAR(1200) NOT NULL DEFAULT '',
    diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'fixed', 'wont_fix')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexing for speed
  CREATE INDEX IF NOT EXISTS idx_players_updated_at ON players(updated_at);
  CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);
  CREATE INDEX IF NOT EXISTS idx_playtest_reports_created_at ON playtest_reports(created_at DESC);
`;

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[PostgreSQL] Initializing schema...');
    await client.query(SCHEMA_SQL);
    console.log('[PostgreSQL] Database schema verified successfully.');
  } catch (err) {
    console.error('[PostgreSQL] Error initializing database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
