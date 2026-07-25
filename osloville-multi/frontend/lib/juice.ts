// Juice helpers
export function screenShake(intensity = 4) {
  const el = document.querySelector('.map-viewport') as HTMLElement;
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([
    { transform: `translate(${intensity}px, ${intensity}px)` },
    { transform: `translate(${-intensity}px, ${-intensity}px)` },
    { transform: `translate(${intensity/2}px, 0)` },
    { transform: `translate(0, 0)` },
  ], { duration: 180, easing: 'cubic-bezier(.36,.07,.19,.97)' });
}
export function popScale(el: HTMLElement, scale = 1.4) {
  el.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
}
export function slowMo(duration = 200) {
  // fake slow-mo via rAF throttle: we can't slow time, but we can add overlay
  const ov = document.createElement('div');
  ov.style.cssText = `position:fixed;inset:0;background:rgba(255,255,255,0.15);z-index:99;pointer-events:none;backdrop-filter:blur(1px)`;
  document.body.appendChild(ov);
  setTimeout(()=>ov.remove(), duration);
}
