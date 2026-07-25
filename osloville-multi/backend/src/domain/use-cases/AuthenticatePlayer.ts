import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { OAuth2Client } from 'google-auth-library';

export interface AuthenticatePlayerParams {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string;
  googleToken?: string;
}

const DEMO_CLIENT_ID = '1087815734233-xyz.apps.googleusercontent.com';

function cleanText(value: string, fallback: string, max: number): string {
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, max);
  return cleaned || fallback;
}

export class AuthenticatePlayer {
  private oauthClient = new OAuth2Client();

  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: AuthenticatePlayerParams): Promise<{ player: Player; isNew: boolean }> {
    let email = params.email;
    let name = cleanText(params.name, 'Explorer', 48);
    let avatarUrl = typeof params.avatarUrl === 'string' ? params.avatarUrl.slice(0, 2048) : '';
    let id = cleanText(params.id, '', 100);

    if (params.googleToken) {
      const configuredClientId = process.env.GOOGLE_CLIENT_ID;
      // The placeholder client id is deliberately only for the offline demo.
      // Never decode a browser JWT as identity in a deployed environment.
      if (!configuredClientId || configuredClientId === DEMO_CLIENT_ID) {
        throw new Error('GOOGLE_AUTH_NOT_CONFIGURED');
      }

      const ticket = await this.oauthClient.verifyIdToken({
        idToken: params.googleToken,
        audience: configuredClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error('INVALID_GOOGLE_TOKEN');

      id = payload.sub;
      email = payload.email || null;
      name = cleanText(payload.name || payload.given_name || 'Google User', 'Google User', 48);
      avatarUrl = (payload.picture || '').slice(0, 2048);
    }

    // Anonymous demo identities remain available for local/offline play, but
    // still receive normalized, bounded fields before persistence.
    if (!id || !/^[a-zA-Z0-9_.:-]+$/.test(id)) throw new Error('INVALID_PLAYER_ID');

    let player = await this.playerRepo.findById(id);
    let isNew = false;

    if (!player) {
      isNew = true;
      player = {
        id,
        email,
        name,
        avatarUrl,
        // Spawn around Sentrum / Karl Johan on the real city map.
        x: 1320 + Math.random() * 220,
        y: 1180 + Math.random() * 180,
        lat: 59.9139,
        lng: 10.7522,
        status: 'Just arrived! Hei Oslo! 👋',
        hat: '🧶',
        acc: '☕',
        color: '#2A9D8F',
        coins: 1240,
        xp: 620,
        level: 5,
        walkKm: 2.4,
        discovered: ['palace', 'karljohan'],
        updatedAt: new Date(),
      };
      player = await this.playerRepo.save(player);
      await this.playerRepo.updateInventory(id, { hat_beanie: 1, acc_coffee: 1 });
    } else {
      player.name = name;
      if (avatarUrl) player.avatarUrl = avatarUrl;
      player.updatedAt = new Date();
      player = await this.playerRepo.save(player);
    }

    return { player, isNew };
  }
}
