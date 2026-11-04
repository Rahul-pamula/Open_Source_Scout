import React, { useState, useEffect } from 'react';

export const STICKER_SLIDES = [
  {
    prefix: 'Boost Your',
    highlight: 'OPEN SOURCE CONTRIBUTION 10X 🏷️',
    caption: 'by Connecting to High-Signal Uncontested Issues',
  },
  {
    prefix: 'Boost Your',
    highlight: 'AI MODEL 10X BY SCOUT MCP ⚡',
    caption: 'with Worktree Sandboxing and Test Verification',
  },
  {
    prefix: 'Centralised Hub of',
    highlight: 'DAILY USE APPS & SECURED PASSWORDS 🔐',
    caption: 'with Zero-Knowledge Client-Side AES-256 Encryption',
  },
];

/** Closes #836: Tilted sticker badge with green theme */
export const RotatingStickerBadge: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STICKER_SLIDES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const slide = STICKER_SLIDES[index];

  return (
    <div className="inline-flex flex-col items-center mb-6 select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold mb-1.5">
        {slide.prefix}
      </div>
      <div className="px-5 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm md:text-base shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] border-2 border-emerald-700 transform -rotate-1 hover:rotate-0 transition-transform duration-200">
        {slide.highlight}
      </div>
      <div className="text-[11px] text-zinc-500 font-medium mt-1.5">{slide.caption}</div>
    </div>
  );
};
