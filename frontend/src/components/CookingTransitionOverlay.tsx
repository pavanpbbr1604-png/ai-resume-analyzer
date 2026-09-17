import React, { useState, useEffect } from 'react';

interface CookingTransitionOverlayProps {
  onComplete: () => void;
}

export const CookingTransitionOverlay: React.FC<CookingTransitionOverlayProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'close' | 'hold' | 'reveal'>('close');

  useEffect(() => {
    // Phase 1: Close shutters & show laser line (100ms)
    const t1 = setTimeout(() => {
      setPhase('hold');
    }, 150);

    // Phase 2: Hold horizon line & text pulse (450ms)
    const t2 = setTimeout(() => {
      setPhase('reveal');
    }, 600);

    // Phase 3: Complete transition to workspace (850ms)
    const t3 = setTimeout(() => {
      onComplete();
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* TOP SHUTTER CURTAIN */}
      <div
        className={`absolute top-0 left-0 right-0 h-1/2 bg-[#121416] border-b border-[#ff5722]/50 shadow-[0_10px_30px_rgba(255,87,34,0.3)] transition-transform duration-500 ease-out z-20 ${
          phase === 'close'
            ? '-translate-y-full'
            : phase === 'hold'
            ? 'translate-y-0'
            : '-translate-y-full'
        }`}
      />

      {/* BOTTOM SHUTTER CURTAIN */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1/2 bg-[#121416] border-t border-[#ff5722]/50 shadow-[0_-10px_30px_rgba(255,87,34,0.3)] transition-transform duration-500 ease-out z-20 ${
          phase === 'close'
            ? 'translate-y-full'
            : phase === 'hold'
            ? 'translate-y-0'
            : 'translate-y-full'
        }`}
      />

      {/* CENTER HORIZON LASER LINE & BRANDING */}
      <div
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center transition-opacity duration-300 ${
          phase === 'hold' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Glowing Orange Horizon Ray */}
        <div className="w-full max-w-2xl h-[2px] bg-[#ff5722] shadow-[0_0_20px_#ff5722] mb-6 animate-pulse" />

        <div className="text-center flex flex-col items-center gap-2">
          <span className="text-[#ff5722] font-label-caps text-xs tracking-[0.25em] font-bold glow-orange">
            EXECUTIVE RESUME ENGINE
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight text-glow"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            START COOKING<span className="text-[#ff5722]">...</span>
          </h1>
        </div>

        {/* Glowing Bottom Horizon Ray */}
        <div className="w-full max-w-2xl h-[2px] bg-[#ff5722] shadow-[0_0_20px_#ff5722] mt-6 animate-pulse" />
      </div>
    </div>
  );
};
