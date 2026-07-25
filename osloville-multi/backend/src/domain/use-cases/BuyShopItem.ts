import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { getShopItem } from '../gameCatalog';

export interface BuyShopItemParams {
  playerId: string;
  itemId: string;
}

export class BuyShopItem {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: BuyShopItemParams): Promise<{ player: Player; inventory: Record<string, number> } | null> {
    const item = getShopItem(params.itemId);
    if (!item) throw new Error('UNKNOWN_SHOP_ITEM');

    const player = await this.playerRepo.findById(params.playerId);
    if (!player) return null;

    const inventory = await this.playerRepo.getInventory(params.playerId);

    // Equipping an owned item is free, but its slot and emoji are still
    // resolved by the server catalog rather than browser supplied data.
    if (inventory[item.id]) {
      if (item.slot === 'hat') player.hat = item.emoji;
      else player.acc = item.emoji;
      player.updatedAt = new Date();
      return { player: await this.playerRepo.save(player), inventory };
    }

    if (player.coins < item.price) throw new Error('INSUFFICIENT_COINS');

    player.coins -= item.price;
    if (item.slot === 'hat') player.hat = item.emoji;
    else player.acc = item.emoji;

    inventory[item.id] = 1;
    player.updatedAt = new Date();

    const savedPlayer = await this.playerRepo.save(player);
    await this.playerRepo.updateInventory(params.playerId, inventory);
    return { player: savedPlayer, inventory };
  }
}
