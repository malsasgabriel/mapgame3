import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { CollectibleType, COLLECTIBLE_REWARDS, COLLECT_XP } from '../world';

export interface CollectItemParams {
  playerId: string;
  itemType: CollectibleType;
}

export class CollectItem {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: CollectItemParams): Promise<{ player: Player; inventory: Record<string, number> } | null> {
    const player = await this.playerRepo.findById(params.playerId);
    if (!player) return null;

    // Rewards come from the authoritative catalog, never from the caller. An
    // unrecognized type falls back to the coin payout instead of NaN.
    const coinsAdded = COLLECTIBLE_REWARDS[params.itemType] ?? COLLECTIBLE_REWARDS.coin;

    player.coins += coinsAdded;
    player.xp += COLLECT_XP;

    // Starting level is 5, increments every 1000 XP. Level never decreases.
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
