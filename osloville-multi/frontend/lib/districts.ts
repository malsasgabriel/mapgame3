export const DISTRICTS: Record<string, { name: string; color: string; loot: string; vibe: string }> = {
  opera: { name: 'Bjørvika • Opera', color: '#7DD8C6', loot: 'gem', vibe: 'Sunset roof walks' },
  palace: { name: 'Slottsparken', color: '#A78BFA', loot: 'heart', vibe: 'Royal guards & picnics' },
  vigeland: { name: 'Frogner • Vigeland', color: '#60A5FA', loot: 'heart', vibe: 'Sculptures in snow' },
  akershus: { name: 'Kvadraturen', color: '#FBBF24', loot: 'coin', vibe: 'Fortress history' },
  akerbrygge: { name: 'Aker Brygge', color: '#34D399', loot: 'coin', vibe: 'Fjord saunas' },
  karljohan: { name: 'Sentrum • Karl Johan', color: '#F472B6', loot: 'coin', vibe: 'Main street buzz' },
  holmenkollen: { name: 'Holmenkollen', color: '#93C5FD', loot: 'gem', vibe: 'Ski jump epic' },
  gruner: { name: 'Grünerløkka', color: '#F472B6', loot: 'coffee', vibe: 'Third-wave coffee' },
};

export function getDistrictForPosition(x: number, y: number) {
  // simple nearest landmark
  const LANDMARKS_POS = [
    { id: 'opera', x: 1594, y: 1406 },
    { id: 'palace', x: 1291, y: 1193 },
    { id: 'vigeland', x: 960, y: 968 },
    { id: 'akershus', x: 1404, y: 1418 },
    { id: 'akerbrygge', x: 1224, y: 1395 },
    { id: 'karljohan', x: 1428, y: 1283 },
    { id: 'holmenkollen', x: 576, y: 158 },
    { id: 'gruner', x: 1644, y: 1058 },
  ];
  let best = LANDMARKS_POS[0], bestDist = Infinity;
  for (const l of LANDMARKS_POS) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bestDist) { bestDist = d; best = l; }
  }
  return { id: best.id, ...DISTRICTS[best.id], dist: bestDist };
}
