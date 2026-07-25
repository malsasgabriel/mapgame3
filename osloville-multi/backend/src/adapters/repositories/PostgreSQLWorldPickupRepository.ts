import { IWorldPickupRepository } from '../../domain/repositories/IWorldPickupRepository';
import * as db from '../../infrastructure/db/connection';

export class PostgreSQLWorldPickupRepository implements IWorldPickupRepository {
  async claim(day: string, itemId: string, playerId: string): Promise<boolean> {
    const result = await db.query(
      `INSERT INTO world_pickup_claims (world_day, item_id, collector_id, claimed_at)
       VALUES ($1::date, $2, $3, NOW())
       ON CONFLICT (world_day, item_id) DO NOTHING
       RETURNING item_id`,
      [day, itemId, playerId],
    );
    return result.rowCount === 1;
  }

  async release(day: string, itemId: string): Promise<void> {
    await db.query('DELETE FROM world_pickup_claims WHERE world_day = $1::date AND item_id = $2', [day, itemId]);
  }

  async getClaimedItemIds(day: string): Promise<string[]> {
    const result = await db.query(
      'SELECT item_id FROM world_pickup_claims WHERE world_day = $1::date ORDER BY item_id ASC',
      [day],
    );
    return result.rows.map(row => String(row.item_id));
  }
}
