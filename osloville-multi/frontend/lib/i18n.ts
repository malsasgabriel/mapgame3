export type Lang = 'en' | 'no';
const dict: Record<Lang, Record<string,string>> = {
  en: {
    'be_on_map': 'Be on the map. Literally.',
    'live_in_oslo': 'LIVE IN OSLO',
    'quests': 'TODAY\'S QUESTS',
    'landmarks': 'LANDMARKS',
    'chat': 'NEARBY CHAT',
    'collect_boller': 'Collect boller',
    'say_hei': 'Say hei to locals',
    'shop': 'Oslo Shop',
    'bag': 'Your Bag',
    'photo': 'Photo mode',
    'night': 'Night mode',
    'snow': 'Snow',
  },
  no: {
    'be_on_map': 'Vær på kartet. Bokstavelig.',
    'live_in_oslo': 'LIVE I OSLO',
    'quests': 'DAGENS OPPDRAG',
    'landmarks': 'LANDMERKER',
    'chat': 'PRAT I NÆRHETEN',
    'collect_boller': 'Samle boller',
    'say_hei': 'Si hei til folk',
    'shop': 'Oslo Butikk',
    'bag': 'Sekken din',
    'photo': 'Foto modus',
    'night': 'Natt modus',
    'snow': 'Snø',
  }
};
export function t(key: string, lang: Lang = 'en') { return dict[lang][key] || dict.en[key] || key; }
export function detectLang(): Lang {
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('no')) return 'no';
  if (typeof localStorage !== 'undefined' && localStorage.getItem('oslo_lang') === 'no') return 'no';
  return 'en';
}
