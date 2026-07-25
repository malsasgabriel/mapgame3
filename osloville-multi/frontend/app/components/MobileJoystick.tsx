'use client';
import React, { useEffect, useRef, useState } from 'react';

export function MobileJoystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const startRef = useRef<{x:number,y:number} | null>(null);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    const handleStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const rect = base.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right || t.clientY < rect.top || t.clientY > rect.bottom) return;
      setActive(true);
      startRef.current = { x: t.clientX, y: t.clientY };
    };
    const handleMove = (e: TouchEvent) => {
      if (!active || !startRef.current) return;
      const t = e.touches[0];
      const dx = (t.clientX - startRef.current.x) / 30;
      const dy = (t.clientY - startRef.current.y) / 30;
      setPos({ x: dx * 20, y: dy * 20 });
      onMove(dx, dy);
    };
    const handleEnd = () => {
      setActive(false); setPos({ x: 0, y: 0 }); startRef.current = null; onMove(0, 0);
    };
    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [active, onMove]);

  return (
    <div ref={baseRef} style={{ position: 'absolute', left: 20, bottom: 90, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)', zIndex: 8, display: active ? 'block' : 'none', touchAction: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, borderRadius: '50%', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`, transition: active ? 'none' : 'transform 0.2s' }} />
    </div>
  );
}
