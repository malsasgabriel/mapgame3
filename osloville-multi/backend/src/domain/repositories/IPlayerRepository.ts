import { Player } from '../entities/Player';

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByEmail(email: string): Promise<Player | null>;
  save(player: Player): Promise<Player>;
  getActivePlayersSince(since: Date): Promise<Player[]>;
  updateCoinsAndXp(id: string, coins: number, xp: number, level: number): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  updateInventory(id: string, items: Record<string, number>): Promise<void>;
  getInventory(id: string): Promise<Record<string, number>>;
  deleteOldPlayers(before: Date): Promise<void>;
}
