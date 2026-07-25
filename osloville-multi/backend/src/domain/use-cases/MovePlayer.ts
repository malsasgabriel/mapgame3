import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';

export interface MovePlayerParams {
  id: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  walkKm: number;
  status?: string;
  discovered?: string[];
}

export class MovePlayer {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: MovePlayerParams): Promise<Player | null> {
    const player = await this.playerRepo.findById(params.id);
    if (!player) return null;

    player.x = params.x;
    player.y = params.y;
    player.lat = params.lat;
    player.lng = params.lng;
    player.walkKm = params.walkKm;
    
    if (params.status !== undefined) {
      player.status = params.status;
    }
    if (params.discovered !== undefined) {
      player.discovered = Array.from(new Set([...player.discovered, ...params.discovered]));
    }
    
    player.updatedAt = new Date();
    return await this.playerRepo.save(player);
  }
}
