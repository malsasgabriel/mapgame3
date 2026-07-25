import { Server, Socket } from 'socket.io';
import { IPlayerRepository } from '../../domain/repositories/IPlayerRepository';
import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { AuthenticatePlayer } from '../../domain/use-cases/AuthenticatePlayer';
import { MovePlayer } from '../../domain/use-cases/MovePlayer';
import { SendChat } from '../../domain/use-cases/SendChat';
import { CollectItem } from '../../domain/use-cases/CollectItem';
import { BuyShopItem } from '../../domain/use-cases/BuyShopItem';
import { getWorldCollectible } from '../../domain/world';
import { IPlaytestReportRepository } from '../../domain/repositories/IPlaytestReportRepository';
import { PlaytestSeverity } from '../../domain/entities/PlaytestReport';
import { IWorldPickupRepository } from '../../domain/repositories/IWorldPickupRepository';

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
  private eventWindows = new Map<string, number[]>();
  private claimedCollectibles = new Set<string>();

  private allowEvent(socket: Socket, event: string, limit: number, intervalMs: number): boolean {
    // Once authenticated, limits are keyed by player identity rather than a
    // transport ID so reconnecting cannot reset a spam/abuse budget.
    const identity = this.socketToPlayerMap.get(socket.id) || socket.id;
    const key = `${identity}:${event}`;
    const now = Date.now();
    if (this.eventWindows.size > 2_000) {
      for (const [windowKey, timestamps] of this.eventWindows) {
        const active = timestamps.filter(timestamp => now - timestamp < 60_000);
        if (active.length) this.eventWindows.set(windowKey, active);
        else this.eventWindows.delete(windowKey);
      }
    }
    const recent = (this.eventWindows.get(key) || []).filter(timestamp => now - timestamp < intervalMs);
    if (recent.length >= limit) {
      this.eventWindows.set(key, recent);
      socket.emit('action_rejected', { event, code: 'RATE_LIMITED' });
      return false;
    }
    recent.push(now);
    this.eventWindows.set(key, recent);
    return true;
  }

  constructor(
    private playerRepo: IPlayerRepository,
    private chatRepo: IChatRepository,
    private playtestReports: IPlaytestReportRepository,
    private worldPickups: IWorldPickupRepository,
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
    }) => {
      if (!this.allowEvent(socket, 'join', 3, 60_000)) return;
      try {
        const { player } = await this.authenticatePlayer.execute({
          id: data.id,
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl,
          googleToken: data.googleToken,
        });

        // One active socket owns a player session. A reconnection replaces an
        // older transport without allowing the old disconnect to emit a false
        // `player_left` event or continue to submit actions.
        const previousSocket = this.playerToSocketMap.get(player.id);
        if (previousSocket && previousSocket.id !== socket.id) {
          this.socketToPlayerMap.delete(previousSocket.id);
          previousSocket.emit('session_replaced');
          previousSocket.disconnect(true);
        }
        this.socketToPlayerMap.set(socket.id, player.id);
        this.playerToSocketMap.set(player.id, socket);

        // Retrieve active players (real users + NPCs active in the last 1 hour)
        const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
        const activePlayers = await this.playerRepo.getActivePlayersSince(oneHourAgo);
        // The database retains progress, but it is not a presence source. Only
        // active sockets (and server-controlled NPCs) appear in the live list.
        const otherPlayers = activePlayers.filter(p =>
          p.id !== player.id && (p.id.startsWith('npc_') || this.playerToSocketMap.has(p.id)),
        );

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
        // Clients need this snapshot after reconnecting; it is read from the
        // durable daily claim ledger rather than process-local memory.
        const day = new Date().toISOString().slice(0, 10);
        const claimedItemIds = await this.worldPickups.getClaimedItemIds(day);
        claimedItemIds.forEach(itemId => this.claimedCollectibles.add(`${day}:${itemId}`));
        socket.emit('world_state', { claimedItemIds });

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
      if (!playerId || !this.allowEvent(socket, 'move', 12, 1_000)) return;

      try {
        const result = await this.movePlayer.execute({
          id: playerId,
          x: data.x,
          y: data.y,
          status: data.status,
        });

        if (result) {
          // Sender gets authoritative progression, while other clients only
          // need the updated presence snapshot.
          socket.emit('hud_update', {
            coins: result.player.coins,
            xp: result.player.xp,
            level: result.player.level,
          });
          if (result.discoveries.length) {
            socket.emit('discovery_unlocked', { landmarkIds: result.discoveries });
          }
          socket.broadcast.emit('player_moved', result.player);
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
      if (!playerId || !this.allowEvent(socket, 'chat', 6, 10_000)) return;

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

        // Keep every map bubble in sync with the server-normalized message.
        await this.playerRepo.updateStatus(playerId, chatMessage.text);
        player.status = chatMessage.text;

        // Broadcast chat and the updated presence snapshot globally.
        this.io.emit('chat_message', chatMessage);
        this.io.emit('player_updated', player);
      } catch (err) {
        console.error('[Socket.io] Error handling chat message:', err);
      }
    });

    // COLLECT ITEM EVENT
    socket.on('collect', async (data: { itemId: string }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      const collectible = typeof data.itemId === 'string' ? getWorldCollectible(data.itemId) : null;
      if (!playerId || !collectible || !this.allowEvent(socket, 'collect', 12, 10_000)) return;

      const day = new Date().toISOString().slice(0, 10);
      const claimKey = `${day}:${collectible.id}`;
      if (this.claimedCollectibles.has(claimKey)) {
        socket.emit('action_rejected', { event: 'collect', code: 'ALREADY_COLLECTED', itemId: collectible.id });
        return;
      }

      let claimedByThisPlayer = false;
      try {
        const player = await this.playerRepo.findById(playerId);
        if (!player || Math.hypot(player.x - collectible.x, player.y - collectible.y) > 190) {
          socket.emit('action_rejected', { event: 'collect', code: 'TOO_FAR_AWAY', itemId: collectible.id });
          return;
        }

        // The DB unique key is the final arbiter when two players collect in
        // the same frame, and preserves the result across backend restarts.
        const claimed = await this.worldPickups.claim(day, collectible.id, playerId);
        if (!claimed) {
          this.claimedCollectibles.add(claimKey);
          socket.emit('action_rejected', { event: 'collect', code: 'ALREADY_COLLECTED', itemId: collectible.id });
          return;
        }
        claimedByThisPlayer = true;
        this.claimedCollectibles.add(claimKey);
        const result = await this.collectItem.execute({
          playerId,
          itemType: collectible.type,
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
        } else {
          await this.worldPickups.release(day, collectible.id);
          this.claimedCollectibles.delete(claimKey);
        }
      } catch (err) {
        if (claimedByThisPlayer) {
          this.claimedCollectibles.delete(claimKey);
          await this.worldPickups.release(day, collectible.id).catch(() => undefined);
        }
        console.error('[Socket.io] Error collecting item:', err);
      }
    });

    // SHOP PURCHASE EVENT
    socket.on('shop_buy', async (data: { itemId: string }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId || !this.allowEvent(socket, 'shop_buy', 8, 10_000)) return;

      try {
        const result = await this.buyShopItem.execute({
          playerId,
          itemId: data.itemId,
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
      if (!playerId || !this.allowEvent(socket, 'wave', 12, 10_000) || typeof data.targetId !== 'string') return;

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

    // REAL-TIME PLAYTEST REPORT
    socket.on('playtest_report', async (data: {
      category?: string;
      severity?: PlaytestSeverity;
      title?: string;
      reproduction?: string;
      diagnostics?: Record<string, unknown>;
    }) => {
      const playerId = this.socketToPlayerMap.get(socket.id);
      if (!playerId || !this.allowEvent(socket, 'playtest_report', 6, 60_000)) return;
      const severity: PlaytestSeverity = ['blocker', 'major', 'minor', 'idea'].includes(data.severity || '')
        ? data.severity as PlaytestSeverity
        : 'minor';
      const title = typeof data.title === 'string' ? data.title.trim().slice(0, 140) : '';
      if (!title) {
        socket.emit('action_rejected', { event: 'playtest_report', code: 'TITLE_REQUIRED' });
        return;
      }

      try {
        const player = await this.playerRepo.findById(playerId);
        if (!player) return;
        const diagnostics = data.diagnostics && typeof data.diagnostics === 'object'
          ? JSON.parse(JSON.stringify(data.diagnostics).slice(0, 4_000)) as Record<string, unknown>
          : {};
        const report = await this.playtestReports.create({
          id: `report_${Date.now()}_${socket.id}`.slice(0, 100),
          playerId,
          playerName: player.name,
          category: (typeof data.category === 'string' ? data.category : 'gameplay').trim().slice(0, 48) || 'gameplay',
          severity,
          title,
          reproduction: (typeof data.reproduction === 'string' ? data.reproduction : '').trim().slice(0, 1200),
          diagnostics,
          status: 'new',
          createdAt: new Date(),
        });
        socket.emit('playtest_reported', { id: report.id, createdAt: report.createdAt });
      } catch (err) {
        console.error('[Socket.io] Playtest report error:', err);
        socket.emit('action_rejected', { event: 'playtest_report', code: 'REPORT_UNAVAILABLE' });
      }
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      // Authenticated player windows deliberately survive a reconnect; only
      // pre-auth socket windows can be discarded here.
      for (const key of this.eventWindows.keys()) {
        if (key.startsWith(`${socket.id}:`)) this.eventWindows.delete(key);
      }
      const playerId = this.socketToPlayerMap.get(socket.id);
      this.socketToPlayerMap.delete(socket.id);
      const isCurrentSession = playerId && this.playerToSocketMap.get(playerId)?.id === socket.id;
      if (playerId && isCurrentSession) {
        console.log(`[Socket.io] Player disconnected: ${playerId}`);
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
