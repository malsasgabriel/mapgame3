// Privacy-preserving local analytics. Sampling and batched persistence keep
// tracking out of the render/input hot path.
type EventType = 'move' | 'collect' | 'chat' | 'shop_buy' | 'quest_complete' | 'photo_share' | 'landmark_discover';
type EventValue = string | number | boolean | null | Record<string, unknown>;
export type AnalyticsEvent = { type: EventType; value?: EventValue; ts: number; x?: number; y?: number };

const MAX_EVENTS = 500;
const MOVE_SAMPLE_MS = 500;
let events: AnalyticsEvent[] = [];
let lastMoveAt = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof localStorage !== 'undefined') {
  try {
    const stored = JSON.parse(localStorage.getItem('oslo_analytics') || '[]');
    if (Array.isArray(stored)) events = stored.slice(-MAX_EVENTS);
  } catch {
    events = [];
  }
}

function persistSoon() {
  if (saveTimer || typeof localStorage === 'undefined') return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { localStorage.setItem('oslo_analytics', JSON.stringify(events.slice(-MAX_EVENTS))); } catch {}
  }, 1_000);
}

export function track(type: EventType, value?: EventValue, pos?: { x: number; y: number }) {
  const now = Date.now();
  if (type === 'move') {
    if (now - lastMoveAt < MOVE_SAMPLE_MS) return;
    lastMoveAt = now;
  }
  events.push({ type, value, ts: now, x: pos?.x, y: pos?.y });
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  persistSoon();
}

export function getHeatmap() {
  const grid: Record<string, number> = {};
  events.filter(event => event.type === 'move' && typeof event.x === 'number' && typeof event.y === 'number').forEach(event => {
    const key = `${Math.floor(event.x! / 10) * 10},${Math.floor(event.y! / 10) * 10}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  return grid;
}

export function getFunnel() {
  return {
    moves: events.filter(event => event.type === 'move').length,
    collects: events.filter(event => event.type === 'collect').length,
    chats: events.filter(event => event.type === 'chat').length,
    shops: events.filter(event => event.type === 'shop_buy').length,
  };
}
