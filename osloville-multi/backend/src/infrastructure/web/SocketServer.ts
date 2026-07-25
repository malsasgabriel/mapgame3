import { Server as HttpServer } from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { SocketController } from '../../adapters/controllers/SocketController';
import { NpcSimulateTick } from '../../domain/use-cases/NpcSimulateTick';
import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';
import { allowedOrigins } from './ExpressServer';

export class SocketServer {
  private io: SocketIoServer;
  private socketController: SocketController;
  private npcSimulateTick: NpcSimulateTick;
  private npcIntervalId: NodeJS.Timeout | null = null;

  constructor(
    httpServer: HttpServer,
    playerRepo: IPlayerRepository,
    socketController: SocketController
  ) {
    this.io = new SocketIoServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60_000,
      maxHttpBufferSize: 32 * 1024
    });
    this.socketController = socketController;
    this.socketController.setIo(this.io);
    this.npcSimulateTick = new NpcSimulateTick(playerRepo);

    this.setupListeners();
  }

  private setupListeners() {
    this.io.on('connection', (socket) => {
      this.socketController.handleConnection(socket);
    });
  }

  async startNpcSimulation() {
    console.log('[NPC Simulation] Populating bots in database...');
    await this.npcSimulateTick.initializeNpcs();
    console.log('[NPC Simulation] Bots generated. Starting loop ticker (4s intervals)...');

    // Ticks every 4 seconds
    this.npcIntervalId = setInterval(async () => {
      try {
        const updatedNpcs = await this.npcSimulateTick.execute();
        
        // Broadcast each updated bot location to all game clients
        for (const npc of updatedNpcs) {
          this.io.emit('player_moved', npc);
        }
      } catch (err) {
        console.error('[NPC Simulation] Tick iteration failed:', err);
      }
    }, 4000);
  }

  stopNpcSimulation() {
    if (this.npcIntervalId) {
      clearInterval(this.npcIntervalId);
      this.npcIntervalId = null;
    }
  }

  getIoServer(): SocketIoServer {
    return this.io;
  }
}
