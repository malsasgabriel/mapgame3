export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  text: string;
  x: number | null;
  y: number | null;
  createdAt: Date;
}
