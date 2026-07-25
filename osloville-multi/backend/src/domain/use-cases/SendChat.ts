import { IChatRepository } from '../repositories/IChatRepository';
import { ChatMessage } from '../entities/ChatMessage';

export interface SendChatParams {
  id: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  text: string;
  x: number | null;
  y: number | null;
}

export class SendChat {
  constructor(private chatRepo: IChatRepository) {}

  async execute(params: SendChatParams): Promise<ChatMessage> {
    const text = params.text.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!text) throw new Error('EMPTY_CHAT_MESSAGE');

    const chatMsg: ChatMessage = {
      id: params.id.slice(0, 100),
      playerId: params.playerId,
      name: params.name,
      avatarUrl: params.avatarUrl,
      text,
      x: Number.isFinite(params.x) ? params.x : null,
      y: Number.isFinite(params.y) ? params.y : null,
      createdAt: new Date(),
    };

    return this.chatRepo.save(chatMsg);
  }
}
