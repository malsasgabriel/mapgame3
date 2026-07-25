export type CollectibleType = 'coin' | 'heart' | 'gem' | 'coffee' | 'mitten';

export type WorldCollectible = {
  id: string;
  x: number;
  y: number;
  icon: string;
  type: CollectibleType;
};

export type WorldLandmark = {
  id: string;
  x: number;
  y: number;
};

export const WORLD_LANDMARKS: readonly WorldLandmark[] = [
  { id: 'opera', x: 1380, y: 1220 },
  { id: 'palace', x: 620, y: 520 },
  { id: 'vigeland', x: 380, y: 680 },
  { id: 'akershus', x: 1020, y: 1020 },
  { id: 'akerbrygge', x: 800, y: 1100 },
  { id: 'karljohan', x: 900, y: 780 },
  { id: 'holmenkollen', x: 420, y: 220 },
  { id: 'gruner', x: 1280, y: 580 },
] as const;

const COLLECTIBLE_TYPES: Array<Pick<WorldCollectible, 'icon' | 'type'>> = [
  { icon: '🪙', type: 'coin' },
  { icon: '💖', type: 'heart' },
  { icon: '💎', type: 'gem' },
  { icon: '☕', type: 'coffee' },
  { icon: '🧤', type: 'mitten' },
];

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function hash(seed: string): number {
  let value = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6D2B79F5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Daily, deterministic world pickups. Both the API and collect validation use
 * this generator so a browser can only claim a real nearby item. */
export function getWorldCollectibles(date = new Date()): WorldCollectible[] {
  const random = mulberry32(hash(`osloville:${dateKey(date)}`));
  return Array.from({ length: 22 }, (_, index) => {
    const base = COLLECTIBLE_TYPES[Math.floor(random() * COLLECTIBLE_TYPES.length)];
    return {
      id: `c${index}`,
      x: 100 + random() * 2200,
      y: 100 + random() * 1600,
      ...base,
    };
  });
}

export function getWorldCollectible(itemId: string): WorldCollectible | null {
  return getWorldCollectibles().find(item => item.id === itemId) ?? null;
}
