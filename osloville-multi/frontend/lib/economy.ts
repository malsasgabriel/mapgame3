// Seeded daily shop + coin juice
export function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
export function getDailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
export function getDailyShop(items: any[]) {
  const seed = getDailySeed();
  const copy = [...items];
  // Fisher-Yates seeded
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const rare = copy.slice(0, 3);
  const common = copy.slice(3, 6);
  const legendary = copy.find(c => c.price > 300) || copy[0];
  return { rare, common, legendary, seed };
}
export function coinPopAnimation(value: number) {
  const el = document.createElement('div');
  el.textContent = `+${value} 🪙`;
  el.style.cssText = `position:fixed;left:50%;top:60%;transform:translate(-50%,-50%);background:#fffbe0;border:1px solid #f5d77a;padding:6px 12px;border-radius:999px;font-weight:800;font-size:18px;z-index:99;pointer-events:none;animation:coinPop 0.8s cubic-bezier(.16,1,.3,1) forwards;box-shadow:0 8px 24px rgba(233,196,106,0.5)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
  if (!document.getElementById('coinPopStyle')) {
    const s = document.createElement('style'); s.id = 'coinPopStyle';
    s.textContent = `@keyframes coinPop{0%{transform:translate(-50%,-20%) scale(0.8);opacity:0}20%{transform:translate(-50%,-50%) scale(1.3);opacity:1}100%{transform:translate(-50%,-120%) scale(1);opacity:0}}`;
    document.head.appendChild(s);
  }
}
