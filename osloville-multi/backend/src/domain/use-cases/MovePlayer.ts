import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { LANDMARK_IDS } from '../gameCatalog';

const MAP = { minX: 40, maxX: 2360, minY: 40, maxY: 1760 };
const MAX_STEP_DISTANCE = 220;
const PIXELS_PER_KM = 900;
const MAX_STATUS_LENGTH = 80;

export interface MovePlayerParams {
  id: string;
  x: number;
  y: number;
  // Lat/Lng and walkKm are accepted for backwards compatible clients, but
  // position-derived values are always authoritative on the server.
  lat?: number;
  lng?: number;
  walkKm?: number;
  status?: string;
  discovered?: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class MovePlayer {
  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: MovePlayerParams): Promise<Player | null> {
    if (!Number.isFinite(params.x) || !Number.isFinite(params.y)) throw new Error('INVALID_POSITION');

    const player = await this.playerRepo.findById(params.id);
    if (!player) return null;

    let targetX = clamp(params.x, MAP.minX, MAP.maxX);
    let targetY = clamp(params.y, MAP.minY, MAP.maxY);
    const requestedDistance = Math.hypot(targetX - player.x, targetY - player.y);

    // A client can send a new movement packet only after a small bounded move.
    // This makes teleports and client-provided distance awards ineffective.
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
    if (Array.isArray(params.discovered)) {
      const validDiscoveries = params.discovered.filter((id): id is string => typeof id === 'string' && LANDMARK_IDS.has(id));
      player.discovered = Array.from(new Set([...player.discovered, ...validDiscoveries]));
    }

    player.updatedAt = new Date();
    return this.playerRepo.save(player);
  }
}
