"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const CONFETTI_COLORS = ['bg-primary', 'bg-accent', 'bg-pink-500', 'bg-green-500', 'bg-blue-500'];
const CONFETTI_COUNT = 100;

export function Confetti() {
  const [pieces, setPieces] = useState<{ id: number; style: React.CSSProperties; color: string }[]>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      };
      return { id: i, style, color };
    });
    setPieces(newPieces);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {pieces.map(({ id, style, color }) => (
        <div
          key={id}
          className={cn("absolute w-2 h-4 top-[-20px] animate-fall", color)}
          style={style}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall 5s linear infinite;
        }
      `}</style>
    </div>
  );
}
