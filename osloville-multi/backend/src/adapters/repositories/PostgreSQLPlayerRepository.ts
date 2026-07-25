import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';
import { Player } from '../../domain/entities/Player';
import * as db from '../../infrastructure/db/connection';

export class PostgreSQLPlayerRepository implements IPlayerRepository {
  private mapRowToPlayer(row: any): Player {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      x: parseFloat(row.x),
      y: parseFloat(row.y),
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      status: row.status,
      hat: row.hat,
      acc: row.acc,
      color: row.color,
      coins: parseInt(row.coins),
      xp: parseInt(row.xp),
      level: parseInt(row.level),
      walkKm: parseFloat(row.walk_km),
      discovered: Array.isArray(row.discovered) ? row.discovered : JSON.parse(row.discovered || '[]'),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<Player | null> {
    const res = await db.query('SELECT * FROM players WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToPlayer(res.rows[0]);
  }

  async findByEmail(email: string): Promise<Player | null> {
    const res = await db.query('SELECT * FROM players WHERE email = $1', [email]);
    if (res.rows.length === 0) return null;
    return this.mapRowToPlayer(res.rows[0]);
  }

  async save(player: Player): Promise<Player> {
    const queryStr = `
      INSERT INTO players (
        id, email, name, avatar_url, x, y, lat, lng, status, hat, acc, color, coins, xp, level, walk_km, discovered, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        x = EXCLUDED.x,
        y = EXCLUDED.y,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        status = EXCLUDED.status,
        hat = EXCLUDED.hat,
        acc = EXCLUDED.acc,
        color = EXCLUDED.color,
        coins = EXCLUDED.coins,
        xp = EXCLUDED.xp,
        level = EXCLUDED.level,
        walk_km = EXCLUDED.walk_km,
        discovered = EXCLUDED.discovered,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const values = [
      player.id,
      player.email,
      player.name,
      player.avatarUrl,
      player.x,
      player.y,
      player.lat,
      player.lng,
      player.status,
      player.hat,
      player.acc,
      player.color,
      player.coins,
      player.xp,
      player.level,
      player.walkKm,
      JSON.stringify(player.discovered),
      player.updatedAt,
    ];

    const res = await db.query(queryStr, values);
    return this.mapRowToPlayer(res.rows[0]);
  }

  async getActivePlayersSince(since: Date): Promise<Player[]> {
    const res = await db.query('SELECT * FROM players WHERE updated_at >= $1', [since]);
    return res.rows.map(row => this.mapRowToPlayer(row));
  }

  async updateCoinsAndXp(id: string, coins: number, xp: number, level: number): Promise<void> {
    await db.query(
      'UPDATE players SET coins = $1, xp = $2, level = $3, updated_at = NOW() WHERE id = $4',
      [coins, xp, level, id]
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await db.query(
      'UPDATE players SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
  }

  async updateInventory(id: string, items: Record<string, number>): Promise<void> {
    await db.query(
      `INSERT INTO inventories (player_id, items, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (player_id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()`,
      [id, JSON.stringify(items)]
    );
  }

  async getInventory(id: string): Promise<Record<string, number>> {
    const res = await db.query('SELECT items FROM inventories WHERE player_id = $1', [id]);
    if (res.rows.length === 0) return {};
    return typeof res.rows[0].items === 'string'
      ? JSON.parse(res.rows[0].items)
      : res.rows[0].items || {};
  }

  async deleteOldPlayers(before: Date): Promise<void> {
    await db.query('DELETE FROM players WHERE updated_at < $1', [before]);
  }
}
