import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';

export interface CollectItemParams {
  playerId: string;
  itemType: 'coin' | 'heart' | 'gem' | 'coffee' | 'mitten';
}

export class CollectItem {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: CollectItemParams): Promise<{ player: Player; inventory: Record<string, number> } | null> {
    const player = await this.playerRepo.findById(params.playerId);
    if (!player) return null;

    let coinsAdded = 0;
    let xpAdded = 15;

    switch (params.itemType) {
      case 'coin':
        coinsAdded = 20;
        break;
      case 'heart':
        coinsAdded = 40;
        break;
      case 'gem':
        coinsAdded = 80;
        break;
      case 'coffee':
        coinsAdded = 30;
        break;
      case 'mitten':
        coinsAdded = 25;
        break;
      default:
        coinsAdded = 20;
    }

    player.coins += coinsAdded;
    player.xp += xpAdded;

    // Starting level is 5, increments every 1000 XP
    const calculatedLevel = Math.floor(player.xp / 1000) + 5;
    if (calculatedLevel > player.level) {
      player.level = calculatedLevel;
    }

    player.updatedAt = new Date();
    const savedPlayer = await this.playerRepo.save(player);
    const inventory = await this.playerRepo.getInventory(params.playerId);
    return {
      player: savedPlayer,
      inventory,
    };
  }
}
