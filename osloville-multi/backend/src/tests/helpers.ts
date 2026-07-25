import { Player } from '../domain/entities/Player';
import { IPlayerRepository } from '../domain/repositories/IPlayerRepository';

export const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'test-player', email: null, name: 'Test Explorer', avatarUrl: '',
  x: 1000, y: 900, lat: 59.9139, lng: 10.7522, status: 'Hei',
  hat: '🧶', acc: '☕', color: '#2A9D8F', coins: 1240, xp: 620, level: 5,
  walkKm: 2.4, discovered: [], updatedAt: new Date('2026-07-26T00:00:00.000Z'),
  ...overrides,
});

export class MemoryPlayerRepository implements IPlayerRepository {
  public players = new Map<string, Player>();
  public inventories = new Map<string, Record<string, number>>();

  constructor(players: Player[] = []) { players.forEach(player => this.players.set(player.id, structuredClone(player))); }

  async findById(id: string) { return this.players.get(id) ? structuredClone(this.players.get(id)!) : null; }
  async findByEmail(email: string) {
    const player = [...this.players.values()].find(entry => entry.email === email);
    return player ? structuredClone(player) : null;
  }
  async save(player: Player) { const saved = structuredClone(player); this.players.set(player.id, saved); return structuredClone(saved); }
  async getActivePlayersSince(_since: Date) { return [...this.players.values()].map(player => structuredClone(player)); }
  async updateCoinsAndXp(id: string, coins: number, xp: number, level: number) {
    const player = this.players.get(id); if (!player) return;
    player.coins = coins; player.xp = xp; player.level = level;
  }
  async updateStatus(id: string, status: string) { const player = this.players.get(id); if (player) player.status = status; }
  async updateInventory(id: string, items: Record<string, number>) { this.inventories.set(id, structuredClone(items)); }
  async getInventory(id: string) { return structuredClone(this.inventories.get(id) || {}); }
  async deleteOldPlayers(_before: Date) {}
}
