import { ChatMessage } from '../entities/ChatMessage';

export interface IChatRepository {
  save(message: ChatMessage): Promise<ChatMessage>;
  getRecent(limit: number): Promise<ChatMessage[]>;
}
