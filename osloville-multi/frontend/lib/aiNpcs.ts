import { Lang } from './i18n';

// Rule-based NPC conversations stay local/offline and are authored in both
// supported game languages. Player text may still contain Norwegian keywords.
export const NPCS = [
  { id: 'barista', name: 'Lars the Barista', emoji: '☕', x: 1280, y: 580, district: 'gruner', personality: 'cozy coffee nerd' },
  { id: 'opera', name: 'Ingrid the Singer', emoji: '🎤', x: 1380, y: 1220, district: 'opera', personality: 'dramatic opera singer' },
  { id: 'ski', name: 'Olav the Instructor', emoji: '⛷️', x: 420, y: 220, district: 'holmenkollen', personality: 'energetic ski instructor' },
] as const;

const LINES = {
  en: {
    greeting: ['Hei, {name}! What brew today? ☕', 'Welcome, {name}! Tim Wendelboe beans just arrived!', 'Need a boller with that coffee, {name}? 🍩'],
    coffee: ['Ah, you know coffee! Try our light Yirgacheffe roast.', 'Coffee is my love language. Want to learn pour-over?', 'This coffee tastes like blueberries — enjoy!'],
    quest: ['Can you bring me 3 boller from Sentrum? I’ll reward you with a beanie 🧶', 'Could you help find my lost mitten near Frogner?'],
    opera: ['🎵 LaaAAAaa~ I’m rehearsing for tonight! Visit the roof at sunset.', 'Welcome to the Opera! The acoustics here… *sings* 🎤✨'],
    ski: ['Ski time! ⛷️ Did you wax your skis? Holmenkollen is icy today!', 'A good lesson starts with warm mittens and a brave first turn.'],
  },
  ru: {
    greeting: ['Hei, {name}! Какой кофе сегодня? ☕', 'Добро пожаловать, {name}! Только что привезли зёрна Tim Wendelboe.', 'К кофе булочку, {name}? 🍩'],
    coffee: ['Вы разбираетесь в кофе! Попробуйте лёгкую обжарку из Йиргачеффа.', 'Кофе — мой язык любви. Научить вас пуроверу?', 'У этого кофе черничные ноты — наслаждайтесь!'],
    quest: ['Принесёте мне 3 булочки из Сентрума? Награжу вас шапкой 🧶', 'Поможете найти потерянную варежку возле Фрогнера?'],
    opera: ['🎵 Лааа~ Я репетирую на вечер! Загляните на крышу на закате.', 'Добро пожаловать в Оперу! Какая здесь акустика… *поёт* 🎤✨'],
    ski: ['Пора кататься! ⛷️ Вы уже смазали лыжи? В Холменколлене сегодня лёд!', 'Хороший урок начинается с тёплых варежек и смелого первого поворота.'],
  },
} as const;

function pick(lines: readonly string[]) { return lines[Math.floor(Math.random() * lines.length)]; }
function withName(line: string, playerName: string) { return line.replace('{name}', playerName); }

export function getNpcResponse(npcId: string, playerText: string, playerName: string, lang: Lang = 'en') {
  const lower = playerText.toLowerCase();
  const lines = LINES[lang];
  if (npcId === 'barista') {
    if (/(coffee|kaffe|кофе)/.test(lower)) return pick(lines.coffee);
    if (/(boller|quest|help|булоч|задан|помо)/.test(lower)) return pick(lines.quest);
    return withName(pick(lines.greeting), playerName);
  }
  if (npcId === 'opera') return lower.includes('sing') || lower.includes('opera') || lower.includes('пой') || lower.includes('опер') ? lines.opera[0] : lines.opera[1];
  if (npcId === 'ski') return pick(lines.ski);
  return lang === 'ru' ? `Hei, ${playerName}! Рада видеть вас в Осло.` : `Hei ${playerName}! Nice to see you in Oslo!`;
}

export function getNearbyNpc(x: number, y: number) {
  return NPCS.find(npc => Math.hypot(npc.x - x, npc.y - y) < 140) || null;
}
