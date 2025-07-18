
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/game-logic';
import { User, Bot, Clock } from 'lucide-react';

interface PlayerClockProps {
    playerName: string;
    isLocalPlayer: boolean;
    isTurn: boolean;
    timeRemaining: number;
    turnStartTime: any | null;
}

export function PlayerClock({ playerName, isLocalPlayer, isTurn, timeRemaining, turnStartTime }: PlayerClockProps) {
    const [displayTime, setDisplayTime] = useState(timeRemaining);

    useEffect(() => {
        if (isTurn && turnStartTime) {
            const interval = setInterval(() => {
                const startTime = (turnStartTime.toDate() as Date).getTime();
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startTime) / 1000);
                const newTime = Math.max(0, timeRemaining - elapsedSeconds);
                setDisplayTime(newTime);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setDisplayTime(timeRemaining);
        }
    }, [isTurn, timeRemaining, turnStartTime]);

    return (
        <Card className={cn(
            "w-full p-3 transition-all duration-300",
            isTurn ? "bg-primary text-primary-foreground shadow-lg scale-105" : "bg-secondary text-secondary-foreground"
        )}>
            <CardContent className="p-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isLocalPlayer ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                    <span className="font-semibold">{isLocalPlayer ? "You" : playerName}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-lg font-bold">
                    <Clock className="h-5 w-5" />
                    {formatTime(displayTime)}
                </div>
            </CardContent>
        </Card>
    );
}
