import { Request, Response, Router } from 'express';
import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';

export class HttpController {
  public router = Router();

  constructor(private playerRepo: IPlayerRepository) {
    this.router.get('/health', this.healthCheck.bind(this));
    this.router.get('/config', this.getConfig.bind(this));
    this.router.post('/cleanup', this.cleanup.bind(this));
  }

  private healthCheck(req: Request, res: Response) {
    res.json({ 
      status: 'ok', 
      service: 'osloville-backend',
      timestamp: new Date().toISOString() 
    });
  }

  private getConfig(req: Request, res: Response) {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || '1087815734233-xyz.apps.googleusercontent.com'
    });
  }

  private async cleanup(req: Request, res: Response) {
    try {
      const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2);
      // Retain NPCs, only delete real players inactive for 2+ hours
      await this.playerRepo.deleteOldPlayers(twoHoursAgo);
      res.json({ success: true, message: 'Cleaned up old players' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
