// Seeded daily shop + coin juice
export type ShopRotationItem = { id: string; price: number };

export function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getDailySeed() {
  const date = new Date();
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Returns a stable rotation with no duplicate legendary card. */
export function getDailyShop<T extends ShopRotationItem>(items: readonly T[]) {
  const seed = getDailySeed();
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededRandom(seed + index) * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  const legendary = copy.find(item => item.price > 300) || copy[0];
  const rotation = copy.filter(item => item.id !== legendary?.id);
  return {
    rare: rotation.slice(0, 3),
    common: rotation.slice(3, 6),
    legendary,
    seed,
  };
}

export function coinPopAnimation(value: number) {
  const element = document.createElement('div');
  element.textContent = `${value >= 0 ? '+' : ''}${value} 🪙`;
  element.style.cssText = `position:fixed;left:50%;top:60%;transform:translate(-50%,-50%);background:#fffbe0;border:1px solid #f5d77a;padding:6px 12px;border-radius:999px;font-weight:800;font-size:18px;z-index:99;pointer-events:none;animation:coinPop 0.8s cubic-bezier(.16,1,.3,1) forwards;box-shadow:0 8px 24px rgba(233,196,106,0.5)`;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 800);
  if (!document.getElementById('coinPopStyle')) {
    const style = document.createElement('style');
    style.id = 'coinPopStyle';
    style.textContent = `@keyframes coinPop{0%{transform:translate(-50%,-20%) scale(0.8);opacity:0}20%{transform:translate(-50%,-50%) scale(1.3);opacity:1}100%{transform:translate(-50%,-120%) scale(1);opacity:0}}`;
    document.head.appendChild(style);
  }
}
