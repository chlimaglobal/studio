'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  size?: number; // px
  floating?: boolean;
  onClick?: () => void;
};

export default function AvatarPremium({ size = 88, floating = true, onClick }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // small float parity tweak for performance
    const el = wrapperRef.current;
    if (!el || !floating) return;
    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 0.01;
      el.style.transform = `translateY(${Math.sin(t) * 6}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [floating]);

  return (
    <div
      ref={wrapperRef}
      onClick={onClick}
      className={cn(
        'relative select-none',
        'w-[var(--avatar-size)] h-[var(--avatar-size)]',
        'flex items-center justify-center'
      )}
      style={{ ['--avatar-size' as any]: `${size}px` }}
      aria-hidden
    >
      {/* 3D Sphere (gold) */}
      <div
        className="absolute inset-0 rounded-full shadow-2xl ring-1 ring-white/10"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #fff8dc 5%, #f6d365 20%, #c99a2a 65%, #8a5f12 100%)',
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.35))',
          transformStyle: 'preserve-3d',
        }}
      />

      {/* rotating energy rings */}
      <div className="pointer-events-none absolute -inset-2 rounded-full animate-spin-slow opacity-40" 
           style={{ background: 'conic-gradient(from 0deg, rgba(255,255,255,0.08), transparent 30%)', mixBlendMode: 'overlay' }} />

      {/* holographic face projection */}
      <div
        className="absolute -bottom-8 w-[160%] pointer-events-none select-none"
        style={{ transform: 'translateZ(0)', perspective: 800 }}
      >
        <div className="mx-auto w-full max-w-[240px] h-[120px] rounded-lg bg-[linear-gradient(90deg,#0ea5a5aa,#60a5fa44)] backdrop-blur-sm shadow-xl transform-gpu -rotate-2 animate-holo-fade">
          {/* Minimal face: use inline SVG for crispness */}
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <g fill="none" stroke="#cffafe" strokeWidth="1.6" opacity="0.95" strokeLinecap="round" strokeLinejoin="round">
              <path d="M30 60c18-22 46-22 70-6s34 24 60 6" opacity="0.9" stroke="#bbf7d0" />
              <circle cx="70" cy="40" r="4" fill="#bfdbfe" stroke="none" />
              <circle cx="120" cy="40" r="4" fill="#bfdbfe" stroke="none" />
              <path d="M80 60c10 6 25 6 35 0" />
            </g>
          </svg>
        </div>
      </div>

      {/* subtle particle layer (CSS) */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="particle-layer" />
      </div>
    </div>
  );
}
