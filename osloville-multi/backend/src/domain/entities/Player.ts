export interface Player {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  status: string;
  hat: string;
  acc: string;
  color: string;
  coins: number;
  xp: number;
  level: number;
  walkKm: number;
  discovered: string[]; // Landmark IDs
  updatedAt: Date;
}
