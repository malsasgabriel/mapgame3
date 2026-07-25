import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { ChatMessage } from '../../domain/entities/ChatMessage';
import * as db from '../../infrastructure/db/connection';

export class PostgreSQLChatRepository implements IChatRepository {
  private mapRowToChatMessage(row: any): ChatMessage {
    return {
      id: row.id,
      playerId: row.player_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      text: row.text,
      x: row.x !== null ? parseFloat(row.x) : null,
      y: row.y !== null ? parseFloat(row.y) : null,
      createdAt: new Date(row.created_at),
    };
  }

  async save(message: ChatMessage): Promise<ChatMessage> {
    const queryStr = `
      INSERT INTO chat_messages (id, player_id, name, avatar_url, text, x, y, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      message.id,
      message.playerId,
      message.name,
      message.avatarUrl,
      message.text,
      message.x,
      message.y,
      message.createdAt,
    ];
    const res = await db.query(queryStr, values);
    return this.mapRowToChatMessage(res.rows[0]);
  }

  async getRecent(limit: number): Promise<ChatMessage[]> {
    // Select the latest N first, then restore chronological order for the UI.
    // `ORDER BY created_at ASC LIMIT N` incorrectly returned the oldest chat
    // messages in a long-running world.
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const res = await db.query(
      `SELECT * FROM (
        SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT $1
      ) recent ORDER BY created_at ASC`,
      [safeLimit],
    );
    return res.rows.map(row => this.mapRowToChatMessage(row));
  }
}
