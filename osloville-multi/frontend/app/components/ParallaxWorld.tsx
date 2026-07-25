'use client';
import React, { useEffect, useRef } from 'react';

export function ParallaxWorld({ offset, scale }: { offset: {x:number,y:number}, scale: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const clouds = ref.current.querySelectorAll('.parallax-cloud');
    clouds.forEach((c: any, i: number) => {
      c.style.transform = `translate(${offset.x * (0.02 + i*0.01)}px, ${offset.y * (0.02 + i*0.01)}px) scale(${scale})`;
    });
  }, [offset, scale]);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
      <div className="parallax-cloud" style={{ position: 'absolute', left: '10%', top: '15%', fontSize: 40, opacity: 0.6 }}>☁️</div>
      <div className="parallax-cloud" style={{ position: 'absolute', left: '70%', top: '25%', fontSize: 30, opacity: 0.5 }}>☁️</div>
      <div className="parallax-cloud" style={{ position: 'absolute', left: '45%', top: '8%', fontSize: 20, opacity: 0.4 }}>🕊️</div>
      <div className="parallax-fjord" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'linear-gradient(180deg, transparent, rgba(42,157,143,0.18))', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 300px at 80% 10%, rgba(233,196,106,0.12), transparent)', pointerEvents: 'none' }} />
    </div>
  );
}
