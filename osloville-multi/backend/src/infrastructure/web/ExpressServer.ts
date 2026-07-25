import express, { Express } from 'express';
import cors from 'cors';
import { HttpController } from '../../adapters/controllers/HttpController';

export class ExpressServer {
  private app: Express;

  constructor(httpController: HttpController) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes(httpController);
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: '*', // Allow all client connections (Next.js is typically at port 3000)
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.app.use(express.json());
  }

  private setupRoutes(httpController: HttpController) {
    this.app.use('/api', httpController.router);
  }

  getApp(): Express {
    return this.app;
  }
}
