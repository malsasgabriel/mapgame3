import { Server, Socket } from 'socket.io';
import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';
import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { AuthenticatePlayer } from '../../domain/use-cases/AuthenticatePlayer';
import { MovePlayer } from '../../domain/use-cases/MovePlayer';
import { SendChat } from '../../domain/use-cases/SendChat';
import { CollectItem } from '../../domain/use-cases/CollectItem';
import { BuyShopItem } from '../../domain/use-cases/BuyShopItem';

export class SocketController {
  // Map socket IDs to player IDs
  private socketToPlayerMap = new Map<string, string>();
  // Map player IDs to socket instances
  private playerToSocketMap = new Map<string, Socket>();

  // Use Cases
  private authenticatePlayer: AuthenticatePlayer;
  private movePlayer: MovePlayer;
  private sendChat: SendChat;
  private collectItem: CollectItem;
  private buyShopItem: BuyShopItem;

  private io!: Server;

  constructor(
    private playerRepo: IPlayerRepository,
    private chatRepo: IChatRepository
  ) {
    this.authenticatePlayer = new AuthenticatePlayer(playerRepo);
    this.movePlayer = new MovePlayer(playerRepo);
    this.sendChat = new SendChat(chatRepo);
    this.collectItem = new CollectItem(playerRepo);
    this.buyShopItem = new BuyShopItem(playerRepo);
  }

  setIo(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket) {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // JOIN EVENT
    socket.on('join', async (data: {
      id: string;
      name: string;
      email: string | null;
      avatarUrl: string;
      googleToken?: string;
      googleClientId?: string;
    }) => {
      try {
        const { player, isNew } = await this.authenticatePlayer.execute({
          id: data.id,
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl,
          googleToken: data.googleToken,
          googleClientId: data.googleClientId,
        });

        // Register session mapping
        this.socketToPlayerMap.set(socket.id, player.id);
        this.playerToSocketMap.set(player.id, socket);

        // Retrieve active players (real users + NPCs active in the last 1 hour)
        const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
        const activePlayers = await this.playerRepo.getActivePlayersSince(oneHourAgo);
        const otherPlayers = activePlayers.filter(p => p.id !== player.id);

        // Fetch recent chat log (up to 30 messages)
        const chatHistory = await this.chatRepo.getRecent(30);

        // Fetch inventory
        const inventory = await this.playerRepo.getInventory(player.id);

        // Confirm join to client
        socket.emit('join_success', {
          player,
          inventory,
          otherPlayers,
          chatHistory,
        });

        // Broadcast to other players
        socket.broadcast.emit('player_joined', player);
        console.log(`[Socket.io] Player joined: ${player.name} (${player.id})`);
      } catch (err: any) {
        console.error('[Socket.io] Error during player join:', err);
        socket.emit('error', { message: 'Failed to join game world: ' + err.message });
      }
    });

    // MOVE EVENT
    socket.on('move', async (data: {
      x: number;
      y: number;
      lat: number;
      lng: number;
      walkKm: number;
      status?: string;
      discovered?: string[];
    }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId) return;

      try {
        const updatedPlayer = await this.movePlayer.execute({
          id: playerId,
          x: data.x,
          y: data.y,
          lat: data.lat,
          lng: data.lng,
          walkKm: data.walkKm,
          status: data.status,
          discovered: data.discovered,
        });

        if (updatedPlayer) {
          // Broadcast movement to all other clients
          socket.broadcast.emit('player_moved', updatedPlayer);
        }
      } catch (err) {
        console.error('[Socket.io] Error handling player move:', err);
      }
    });

    // CHAT EVENT
    socket.on('chat', async (data: {
      id: string;
      text: string;
      x: number | null;
      y: number | null;
    }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId) return;

      try {
        const player = await this.playerRepo.findById(playerId);
        if (!player) return;

        const chatMessage = await this.sendChat.execute({
          id: data.id,
          playerId,
          name: player.name,
          avatarUrl: player.avatarUrl,
          text: data.text,
          x: data.x,
          y: data.y,
        });

        // Update player's status bubble to match chat message
        await this.playerRepo.updateStatus(playerId, data.text);

        // Broadcast chat message globally to all players
        this.io.emit('chat_message', chatMessage);
      } catch (err) {
        console.error('[Socket.io] Error handling chat message:', err);
      }
    });

    // COLLECT ITEM EVENT
    socket.on('collect', async (data: {
      itemId: string;
      itemType: 'coin' | 'heart' | 'gem' | 'coffee' | 'mitten';
    }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId) return;

      try {
        const result = await this.collectItem.execute({
          playerId,
          itemType: data.itemType,
        });

        if (result) {
          // Send HUD update to collector
          socket.emit('hud_update', {
            coins: result.player.coins,
            xp: result.player.xp,
            level: result.player.level,
          });

          // Broadcast collection to all clients to hide the coin on maps
          this.io.emit('item_collected', {
            itemId: data.itemId,
            collectorId: playerId,
          });
        }
      } catch (err) {
        console.error('[Socket.io] Error collecting item:', err);
      }
    });

    // SHOP PURCHASE EVENT
    socket.on('shop_buy', async (data: {
      itemId: string;
      price: number;
      emoji: string;
      itemType: 'hat' | 'acc';
    }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId) return;

      try {
        const result = await this.buyShopItem.execute({
          playerId,
          itemId: data.itemId,
          price: data.price,
          emoji: data.emoji,
          itemType: data.itemType,
        });

        if (result) {
          // Reply to buyer
          socket.emit('shop_success', {
            coins: result.player.coins,
            inventory: result.inventory,
            player: result.player,
          });

          // Broadcast visual update (avatar hat/acc changes) to other players
          this.io.emit('player_updated', result.player);
        }
      } catch (err: any) {
        console.warn('[Socket.io] Shop purchase error:', err.message);
        socket.emit('shop_failed', { message: err.message });
      }
    });

    // WAVE / SOCIAL EVENT
    socket.on('wave', async (data: { targetId: string }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId) return;

      try {
        const sender = await this.playerRepo.findById(playerId);
        if (!sender) return;

        // If target client is active in current socket map, forward wave
        const targetSocket = this.playerToSocketMap.get(data.targetId);
        if (targetSocket) {
          targetSocket.emit('waved_at', {
            senderId: playerId,
            senderName: sender.name,
          });
        }

        // Broadcast a generic wave trigger (for rotational UI anims)
        this.io.emit('player_waved', {
          senderId: playerId,
          targetId: data.targetId,
        });
      } catch (err) {
        console.error('[Socket.io] Wave event error:', err);
      }
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (playerId) {
        console.log(`[Socket.io] Player disconnected: ${playerId}`);
        this.socketToPlayerMap.delete(socket.id);
        this.playerToSocketMap.delete(playerId);

        // Update player's last active stamp in DB
        try {
          const player = await this.playerRepo.findById(playerId);
          if (player && !player.id.startsWith('npc_')) {
            player.updatedAt = new Date();
            await this.playerRepo.save(player);
          }
        } catch (err) {
          console.error('[Socket.io] Error updating disconnect stamp:', err);
        }

        // Broadcast departure to other players
        this.io.emit('player_left', playerId);
      }
    });
  }
}
