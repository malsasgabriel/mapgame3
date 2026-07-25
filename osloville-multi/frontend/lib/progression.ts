export const BADGES = [
  { id: 'explorer', name: 'Explorer', icon: '🗺️', desc: 'Discover 5 landmarks', check: (d: Set<string>) => d.size >= 5 },
  { id: 'barista', name: 'Barista Friend', icon: '☕', desc: 'Visit Grüner 3 times', check: (visits: Record<string,number>) => (visits.gruner||0) >=3 },
  { id: 'aurora', name: 'Aurora Chaser', icon: '🌌', desc: 'See northern lights night', check: (night: boolean) => night },
  { id: 'boller', name: 'Boller Hunter', icon: '🍩', desc: 'Collect 20 boller', check: (inv: Record<string,number>) => (inv.coin||0)+(inv.coin_collected||0) >=20 },
  { id: 'social', name: 'Social Butterfly', icon: '🦋', desc: 'Wave to 10 people', check: (waves: number) => waves >=10 },
  { id: 'photographer', name: 'Photographer', icon: '📸', desc: 'Take 5 photos', check: (photos: number) => photos >=5 },
];

export const SEASON_1 = {
  name: 'Winter in Oslo ❄️',
  tiers: Array.from({length:30}, (_,i)=>({
    level: i+1,
    reward: i%5===4 ? { type:'legendary', emoji:'👑', name:'Viking Crown' } : i%3===0 ? { type:'coins', amount: 100+ i*10 } : { type:'item', emoji:['🧶','🧣','☕','🎧','🧤'][i%5] },
    xpRequired: 300 + i*80
  }))
};

export function xpToLevel(xp: number) {
  let level = 1, remaining = xp, req = 300;
  while (remaining >= req && level < 100) { remaining -= req; level++; req = 300 + (level-1)*80; }
  return { level, progress: remaining, nextReq: req };
}
