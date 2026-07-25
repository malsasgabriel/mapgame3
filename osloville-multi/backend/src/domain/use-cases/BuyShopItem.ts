import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';

export interface BuyShopItemParams {
  playerId: string;
  itemId: string;
  price: number;
  emoji: string;
  itemType: 'hat' | 'acc';
}

export class BuyShopItem {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: BuyShopItemParams): Promise<{ player: Player; inventory: Record<string, number> } | null> {
    const player = await this.playerRepo.findById(params.playerId);
    if (!player) return null;

    const inventory = await this.playerRepo.getInventory(params.playerId);

    // If item is already owned, we equip it directly without spending coins
    if (inventory[params.itemId]) {
      if (params.itemType === 'hat') {
        player.hat = params.emoji;
      } else {
        player.acc = params.emoji;
      }
      
      player.updatedAt = new Date();
      const savedPlayer = await this.playerRepo.save(player);
      return { player: savedPlayer, inventory };
    }

    if (player.coins < params.price) {
      throw new Error('INSUFFICIENT_COINS');
    }

    player.coins -= params.price;
    if (params.itemType === 'hat') {
      player.hat = params.emoji;
    } else {
      player.acc = params.emoji;
    }

    inventory[params.itemId] = 1;
    player.updatedAt = new Date();

    const savedPlayer = await this.playerRepo.save(player);
    await this.playerRepo.updateInventory(params.playerId, inventory);

    return {
      player: savedPlayer,
      inventory,
    };
  }
}
