import { createServer } from 'http';
import { initDatabase } from './infrastructure/db/connection';
import { PostgreSQLPlayerRepository } from './adapters/repositories/PostgreSQLPlayerRepository';
import { PostgreSQLChatRepository } from './adapters/repositories/PostgreSQLChatRepository';
import { PostgreSQLPlaytestReportRepository } from './adapters/repositories/PostgreSQLPlaytestReportRepository';
import { PostgreSQLWorldPickupRepository } from './adapters/repositories/PostgreSQLWorldPickupRepository';
import { HttpController } from './adapters/controllers/HttpController';
import { SocketController } from './adapters/controllers/SocketController';
import { ExpressServer } from './infrastructure/web/ExpressServer';
import { SocketServer } from './infrastructure/web/SocketServer';

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  try {
    console.log('[Bootstrap] Starting OsloVille Game Server...');

    // 1. Verify connection and run DB schema migrations
    await initDatabase();

    // 2. Instantiate Repositories (Data Access Layer)
    const playerRepo = new PostgreSQLPlayerRepository();
    const chatRepo = new PostgreSQLChatRepository();
    const playtestReportRepo = new PostgreSQLPlaytestReportRepository();
    const worldPickupRepo = new PostgreSQLWorldPickupRepository();

    // 3. Instantiate Controllers (Adapter Layer)
    const httpController = new HttpController(playerRepo, playtestReportRepo, worldPickupRepo);
    const socketController = new SocketController(playerRepo, chatRepo, playtestReportRepo, worldPickupRepo);

    // 4. Instantiate Web Servers (Infrastructure Layer)
    const expressServer = new ExpressServer(httpController);
    const httpServer = createServer(expressServer.getApp());
    const socketServer = new SocketServer(httpServer, playerRepo, socketController);

    // 5. Start HTTP/WS Listener
    httpServer.listen(PORT, () => {
      console.log(`[Bootstrap] Realtime game server successfully listening on port ${PORT}`);
    });

    // 6. Start background AI NPC simulation ticks
    await socketServer.startNpcSimulation();

  } catch (err) {
    console.error('[Bootstrap] Severe error during game server startup:', err);
    process.exit(1);
  }
}

bootstrap();
