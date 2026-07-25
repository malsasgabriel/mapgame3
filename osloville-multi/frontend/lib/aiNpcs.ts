// Rule-based AI NPCs (offline, no LLM key needed)
export const NPCS = [
  { id: 'barista', name: 'Lars the Barista', emoji: '☕', x: 1280, y: 580, district: 'gruner', personality: 'cozy coffee nerd' },
  { id: 'opera', name: 'Ingrid the Singer', emoji: '🎤', x: 1380, y: 1220, district: 'opera', personality: 'dramatic opera singer' },
  { id: 'ski', name: 'Olav the Instructor', emoji: '⛷️', x: 420, y: 220, district: 'holmenkollen', personality: 'energetic ski instructor' },
];

const BARISTA_LINES = {
  greeting: ["Hei! What brew today? ☕", "Velkommen! Tim Wendelboe beans just arrived!", "Need a boller with that coffee? 🍩"],
  coffee: ["Ah, you know coffee! Try our light roast from Yirgacheffe.", "Coffee is my love language. Want to learn pour-over?", "This coffee was picked at 1800m, tastes like blueberries!"],
  quest: ["Can you bring me 3 boller from Sentrum? I'll give you a beanie 🧶", "Help me find my lost mitten near Frogner?"],
  bye: ["Kos deg! Enjoy Oslo! ☀️", "See you at Grüner!"]
};

export function getNpcResponse(npcId: string, playerText: string, playerName: string) {
  const lower = playerText.toLowerCase();
  if (npcId === 'barista') {
    if (lower.includes('coffee') || lower.includes('kaffe')) return BARISTA_LINES.coffee[Math.floor(Math.random()*BARISTA_LINES.coffee.length)];
    if (lower.includes('boller') || lower.includes('quest') || lower.includes('help')) return BARISTA_LINES.quest[Math.floor(Math.random()*BARISTA_LINES.quest.length)];
    if (lower.includes('hei') || lower.includes('hi') || lower.includes('hello')) return BARISTA_LINES.greeting[Math.floor(Math.random()*BARISTA_LINES.greeting.length)].replace('!', `, ${playerName}!`);
    return BARISTA_LINES.greeting[Math.floor(Math.random()*BARISTA_LINES.greeting.length)];
  }
  if (npcId === 'opera') {
    if (lower.includes('sing') || lower.includes('opera')) return `🎵 LaaAAAaa~ I'm rehearsing for tonight! Come to the roof at sunset 🌅`;
    return `Welcome to Opera! The acoustics here... *sings* 🎤✨`;
  }
  if (npcId === 'ski') {
    return `Ski time! ⛷️ Did you wax? Holmenkollen is icy today! Want a lesson?`;
  }
  return `Hei ${playerName}! Nice to see you in ${npcId}!`;
}
export function getNearbyNpc(x:number,y:number) {
  for (const npc of NPCS) if (Math.hypot(npc.x-x, npc.y-y) < 140) return npc;
  return null;
}
