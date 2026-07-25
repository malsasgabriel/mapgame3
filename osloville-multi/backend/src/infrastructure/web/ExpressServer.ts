import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { HttpController } from '../../adapters/controllers/HttpController';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

export class ExpressServer {
  private app: Express;

  constructor(httpController: HttpController) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes(httpController);
  }

  private setupMiddleware() {
    this.app.disable('x-powered-by');
    this.app.use(cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
      maxAge: 86_400,
    }));
    this.app.use(express.json({ limit: '32kb' }));
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  private setupRoutes(httpController: HttpController) {
    this.app.use('/api', httpController.router);
  }

  getApp(): Express {
    return this.app;
  }
}

export { allowedOrigins };
