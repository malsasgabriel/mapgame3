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
    const chatMsg: ChatMessage = {
      id: params.id,
      playerId: params.playerId,
      name: params.name,
      avatarUrl: params.avatarUrl,
      text: params.text.slice(0, 120), // DB constraint: <= 120 chars
      x: params.x,
      y: params.y,
      createdAt: new Date(),
    };
    
    return await this.chatRepo.save(chatMsg);
  }
}
