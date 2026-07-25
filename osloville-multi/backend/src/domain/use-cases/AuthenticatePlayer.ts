import { IPlayerRepository } from '../repositories/IPlayerRepository';
import { Player } from '../entities/Player';
import { OAuth2Client } from 'google-auth-library';

export interface AuthenticatePlayerParams {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string;
  googleToken?: string;
  googleClientId?: string;
}

export class AuthenticatePlayer {
  private oauthClient = new OAuth2Client();

  constructor(private playerRepo: IPlayerRepository) {}

  async execute(params: AuthenticatePlayerParams): Promise<{ player: Player; isNew: boolean }> {
    let email = params.email;
    let name = params.name;
    let avatarUrl = params.avatarUrl;
    let id = params.id;

    if (params.googleToken) {
      try {
        if (params.googleClientId && !params.googleClientId.startsWith('1087815734233-xyz')) {
          const ticket = await this.oauthClient.verifyIdToken({
            idToken: params.googleToken,
            audience: params.googleClientId,
          });
          const payload = ticket.getPayload();
          if (payload) {
            id = payload.sub;
            email = payload.email || null;
            name = payload.name || payload.given_name || 'Google User';
            avatarUrl = payload.picture || '';
          }
        } else {
          // Parse token payload for demo credentials without verify check
          const decoded = this.insecureDecodeJwt(params.googleToken);
          if (decoded) {
            id = decoded.sub || id;
            email = decoded.email || email;
            name = decoded.name || decoded.given_name || name;
            avatarUrl = decoded.picture || avatarUrl;
          }
        }
      } catch (err) {
        console.warn('[AuthenticatePlayer] JWT verification failed, using provided client parameters:', err);
      }
    }

    let player = await this.playerRepo.findById(id);
    let isNew = false;

    if (!player) {
      isNew = true;
      player = {
        id,
        email,
        name,
        avatarUrl,
        x: 950 + Math.random() * 200,
        y: 800 + Math.random() * 200,
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
      // Create starting inventory
      await this.playerRepo.updateInventory(id, { hat_beanie: 1, acc_coffee: 1 });
    } else {
      player.name = name;
      player.avatarUrl = avatarUrl;
      player.updatedAt = new Date();
      player = await this.playerRepo.save(player);
    }

    return { player, isNew };
  }

  private insecureDecodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
