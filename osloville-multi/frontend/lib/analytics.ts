// Local analytics, no tracking, self-learning
type EventType = 'move' | 'collect' | 'chat' | 'shop_buy' | 'quest_complete' | 'photo_share' | 'landmark_discover';
export type AnalyticsEvent = { type: EventType; value?: any; ts: number; x?: number; y?: number };

let events: AnalyticsEvent[] = [];
if (typeof localStorage !== 'undefined') {
  try { events = JSON.parse(localStorage.getItem('oslo_analytics') || '[]'); } catch {}
}
function save() { try { localStorage.setItem('oslo_analytics', JSON.stringify(events.slice(-500))); } catch {} }

export function track(type: EventType, value?: any, pos?: {x:number,y:number}) {
  const e: AnalyticsEvent = { type, value, ts: Date.now(), x: pos?.x, y: pos?.y };
  events.push(e); save();
  // console for dev
  // console.log('[Analytics]', e);
}
export function getHeatmap() {
  // returns grid of move counts
  const grid: Record<string, number> = {};
  events.filter(e=>e.type==='move' && e.x).forEach(e=>{ const key=`${Math.floor(e.x!/10)*10},${Math.floor(e.y!/10)*10}`; grid[key]=(grid[key]||0)+1; });
  return grid;
}
export function getFunnel() {
  return {
    moves: events.filter(e=>e.type==='move').length,
    collects: events.filter(e=>e.type==='collect').length,
    chats: events.filter(e=>e.type==='chat').length,
    shops: events.filter(e=>e.type==='shop_buy').length,
  };
}
