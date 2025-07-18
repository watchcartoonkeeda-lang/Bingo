
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Timer } from 'lucide-react';

interface SetupTimerProps {
  duration: number; // in seconds
  onTimerEnd: () => void;
}

export function SetupTimer({ duration, onTimerEnd }: SetupTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimerEnd();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, onTimerEnd]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const timeColor = timeLeft <= 30 ? 'text-destructive' : 'text-primary';

  return (
    <Card className="w-full max-w-sm mx-auto text-center border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-center gap-2">
            <Timer className={`h-6 w-6 ${timeColor}`} />
            <CardTitle>Board Setup Time</CardTitle>
        </div>
        <CardDescription>
          Confirm your board before the timer runs out, or it will be randomized for you!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${timeColor}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </CardContent>
    </Card>
  );
}

    