'use client';
import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };

/** Touch-only movement control. It stays mounted (and therefore reachable),
 * tracks one touch identifier, and uses a callback ref to avoid installing
 * window listeners on every world render. */
export function MobileJoystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);
  const touchIdRef = useRef<number | null>(null);
  const originRef = useRef<Point | null>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  useEffect(() => {
    const findTouch = (touches: TouchList) => {
      for (let index = 0; index < touches.length; index += 1) {
        if (touches[index].identifier === touchIdRef.current) return touches[index];
      }
      return null;
    };

    const handleMove = (event: TouchEvent) => {
      const touch = findTouch(event.touches);
      const origin = originRef.current;
      if (!touch || !origin) return;
      event.preventDefault();
      const rawX = touch.clientX - origin.x;
      const rawY = touch.clientY - origin.y;
      const distance = Math.hypot(rawX, rawY);
      const cap = 42;
      const factor = distance > cap ? cap / distance : 1;
      const x = rawX * factor;
      const y = rawY * factor;
      setPosition({ x, y });
      onMoveRef.current(x / cap, y / cap);
    };

    const handleEnd = () => {
      if (touchIdRef.current === null) return;
      touchIdRef.current = null;
      originRef.current = null;
      setActive(false);
      setPosition({ x: 0, y: 0 });
      onMoveRef.current(0, 0);
    };

    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: true });
    window.addEventListener('touchcancel', handleEnd, { passive: true });
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, []);

  const start = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    touchIdRef.current = touch.identifier;
    originRef.current = { x: touch.clientX, y: touch.clientY };
    setActive(true);
  };

  return (
    <div
      ref={baseRef}
      aria-label="Movement joystick"
      onTouchStart={start}
      style={{
        position: 'absolute', left: 18, bottom: 22, width: 116, height: 116, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.38)' : 'rgba(38,70,83,0.18)',
        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.55)', zIndex: 8,
        touchAction: 'none', display: 'none',
      }}
      className="mobile-joystick"
    >
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, borderRadius: '50%',
        background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        transition: active ? 'none' : 'transform 160ms ease-out',
      }} />
    </div>
  );
}
