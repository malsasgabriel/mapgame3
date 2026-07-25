export type CosmeticSlot = 'hat' | 'acc';

export type ShopCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  slot: CosmeticSlot;
};

/**
 * Authoritative cosmetic catalog. Prices and cosmetic payloads never come from
 * the browser: the server resolves an item by id before a purchase is applied.
 */
export const SHOP_CATALOG: Readonly<Record<string, ShopCatalogItem>> = {
  hat_beanie: { id: 'hat_beanie', name: 'Wool Beanie', emoji: '🧶', price: 80, slot: 'hat' },
  hat_cap: { id: 'hat_cap', name: 'Oslo Cap', emoji: '🧢', price: 120, slot: 'hat' },
  hat_crown: { id: 'hat_crown', name: 'Viking Crown', emoji: '👑', price: 800, slot: 'hat' },
  hat_helmet: { id: 'hat_helmet', name: 'Ski Helmet', emoji: '⛑️', price: 150, slot: 'hat' },
  hat_bow: { id: 'hat_bow', name: 'Cute Bow', emoji: '🎀', price: 90, slot: 'hat' },
  acc_coffee: { id: 'acc_coffee', name: 'Takeaway Coffee', emoji: '☕', price: 60, slot: 'acc' },
  acc_scarf: { id: 'acc_scarf', name: 'Knitted Scarf', emoji: '🧣', price: 100, slot: 'acc' },
  acc_headphones: { id: 'acc_headphones', name: 'Headphones', emoji: '🎧', price: 180, slot: 'acc' },
  acc_mitten: { id: 'acc_mitten', name: 'Mittens', emoji: '🧤', price: 85, slot: 'acc' },
};

export function getShopItem(itemId: string): ShopCatalogItem | null {
  return SHOP_CATALOG[itemId] ?? null;
}
