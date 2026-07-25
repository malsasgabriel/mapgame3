import { Request, Response, Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';
import { getWorldCollectibles } from '../../domain/world';
import { IPlaytestReportRepository } from '../../domain/repositories/IPlaytestReportRepository';

export class HttpController {
  public router = Router();

  constructor(
    private playerRepo: IPlayerRepository,
    private playtestReports: IPlaytestReportRepository,
  ) {
    this.router.get('/health', this.healthCheck.bind(this));
    this.router.get('/config', this.getConfig.bind(this));
    this.router.get('/world', this.getWorld.bind(this));
    this.router.get('/playtest-reports', this.getPlaytestReports.bind(this));
    this.router.post('/cleanup', this.cleanup.bind(this));
  }

  private healthCheck(_req: Request, res: Response) {
    res.json({
      status: 'ok',
      service: 'osloville-backend',
      timestamp: new Date().toISOString(),
    });
  }

  private getConfig(_req: Request, res: Response) {
    // This is a public browser configuration endpoint. A Google OAuth client id
    // is intentionally public; it is never an OAuth secret.
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
  }

  private getWorld(_req: Request, res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ day: new Date().toISOString().slice(0, 10), collectibles: getWorldCollectibles() });
  }

  private isAuthorized(req: Request): boolean {
    const expected = process.env.ADMIN_API_KEY;
    const provided = req.header('x-admin-key') || '';
    if (!expected || !provided || expected.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  private async getPlaytestReports(req: Request, res: Response) {
    if (!this.isAuthorized(req)) {
      res.status(404).json({ success: false });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const reports = await this.playtestReports.getRecent(Number.isFinite(rawLimit) ? rawLimit : 50);
    res.json({ reports });
  }

  private async cleanup(req: Request, res: Response) {
    if (!this.isAuthorized(req)) {
      res.status(404).json({ success: false });
      return;
    }

    try {
      const twoHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 2);
      await this.playerRepo.deleteOldPlayers(twoHoursAgo);
      res.json({ success: true, message: 'Cleaned up old players' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown cleanup failure';
      res.status(500).json({ success: false, error: message });
    }
  }
}
