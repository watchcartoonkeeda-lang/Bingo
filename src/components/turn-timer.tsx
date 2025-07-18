
"use client";

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

interface TurnTimerProps {
  turnStartTime: any | null;
  timeLimit: number;
}

export function TurnTimer({ turnStartTime, timeLimit }: TurnTimerProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!turnStartTime) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      const startTime = (turnStartTime.toDate() as Date).getTime();
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const newProgress = Math.max(0, ((timeLimit - elapsed) / timeLimit) * 100);
      setProgress(newProgress);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [turnStartTime, timeLimit]);

  return (
    <div className="w-full mt-2">
      <Progress value={progress} className="h-2 transition-all duration-100 ease-linear" />
    </div>
  );
}
