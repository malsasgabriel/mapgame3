import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { WORLD_LANDMARKS } from '../world';

const MAP = { minX: 40, maxX: 2360, minY: 40, maxY: 1760 };
const MAX_STEP_DISTANCE = 220;
const PIXELS_PER_KM = 900;
const MAX_STATUS_LENGTH = 80;
const LANDMARK_DISCOVERY_RADIUS = 120;
const LANDMARK_REWARD = { coins: 30, xp: 50 };

export interface MovePlayerParams {
  id: string;
  x: number;
  y: number;
  // Legacy fields are ignored. Position, distance, discovery and reward state
  // are derived on the authoritative server.
  lat?: number;
  lng?: number;
  walkKm?: number;
  status?: string;
  discovered?: string[];
}

export interface MovePlayerResult {
  player: Player;
  discoveries: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class MovePlayer {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: MovePlayerParams): Promise<MovePlayerResult | null> {
    if (!Number.isFinite(params.x) || !Number.isFinite(params.y)) throw new Error('INVALID_POSITION');

    const player = await this.playerRepo.findById(params.id);
    if (!player) return null;

    let targetX = clamp(params.x, MAP.minX, MAP.maxX);
    let targetY = clamp(params.y, MAP.minY, MAP.maxY);
    const requestedDistance = Math.hypot(targetX - player.x, targetY - player.y);

    // A client can send only a small bounded move. This makes teleports and
    // client-provided walk-distance awards ineffective.
    if (requestedDistance > MAX_STEP_DISTANCE) {
      const ratio = MAX_STEP_DISTANCE / requestedDistance;
      targetX = player.x + (targetX - player.x) * ratio;
      targetY = player.y + (targetY - player.y) * ratio;
    }

    const distance = Math.hypot(targetX - player.x, targetY - player.y);
    player.x = targetX;
    player.y = targetY;
    player.lng = 10.68 + (player.x / 2400) * 0.12;
    player.lat = 59.965 - (player.y / 1800) * 0.08;
    player.walkKm += distance / PIXELS_PER_KM;

    if (typeof params.status === 'string') player.status = params.status.trim().slice(0, MAX_STATUS_LENGTH);

    const discoveries = WORLD_LANDMARKS
      .filter(landmark => !player.discovered.includes(landmark.id))
      .filter(landmark => Math.hypot(player.x - landmark.x, player.y - landmark.y) <= LANDMARK_DISCOVERY_RADIUS)
      .map(landmark => landmark.id);

    if (discoveries.length) {
      player.discovered = [...player.discovered, ...discoveries];
      player.coins += discoveries.length * LANDMARK_REWARD.coins;
      player.xp += discoveries.length * LANDMARK_REWARD.xp;
      player.level = Math.floor(player.xp / 1000) + 5;
    }

    player.updatedAt = new Date();
    return { player: await this.playerRepo.save(player), discoveries };
  }
}
