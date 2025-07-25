// src/components/game-board.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, PartyPopper } from "lucide-react";
import { PlayerClock } from "./player-clock";
import { TurnTimer } from "./turn-timer";
import type { User } from "firebase/auth";

interface Player {
  id: string;
  name: string;
  board: number[];
  isBoardReady: boolean;
  isBot: boolean;
}

interface GameBoardProps {
  playerBoard: (number | null)[];
  calledNumbers: number[];
  onCallNumber: (num: number) => void;
  onBingoCall: () => void;
  currentTurnId: string | null;
  localPlayerId: string;
  allPlayers: { [key: string]: Player };
  allNumbers: number[];
  completedLines: number;
  linesToWin: number;
  playerTimes: { [key: string]: number };
  turnStartTime: any | null;
  turnTimeLimit: number;
}

export function GameBoard({ 
  playerBoard, 
  calledNumbers, 
  onCallNumber, 
  onBingoCall, 
  currentTurnId, 
  localPlayerId, 
  allPlayers, 
  allNumbers, 
  completedLines, 
  linesToWin,
  playerTimes,
  turnStartTime,
  turnTimeLimit,
}: GameBoardProps) {
  const isPlayerTurn = currentTurnId === localPlayerId;
  const currentTurnPlayer = allPlayers[currentTurnId || ''];
  
  const turnText = isPlayerTurn ? "Your turn! Pick a number to call." : `Waiting for ${currentTurnPlayer?.name || 'opponent'}'s turn...`;

  const canCallBingo = completedLines >= linesToWin;

  const otherPlayerIds = Object.keys(allPlayers).filter(id => id !== localPlayerId);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader>
              <div className="flex justify-between items-start gap-4">
                {Object.values(allPlayers).map(player => (
                    <PlayerClock 
                        key={player.id}
                        playerName={player.name}
                        isLocalPlayer={player.id === localPlayerId}
                        isTurn={player.id === currentTurnId}
                        timeRemaining={playerTimes[player.id]}
                        turnStartTime={player.id === currentTurnId ? turnStartTime : null}
                    />
                ))}
            </div>
            {currentTurnId && (
                 <TurnTimer
                    key={currentTurnId} // Force re-render on turn change
                    turnStartTime={turnStartTime}
                    timeLimit={turnTimeLimit}
                />
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 aspect-square">
              {playerBoard.map((num, index) => {
                const isCalled = num !== null && calledNumbers.includes(num);
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-center text-xl font-bold rounded-md border-2 transition-all duration-200 aspect-square relative overflow-hidden",
                      isCalled
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-secondary/50 dark:bg-gray-800 border-transparent",
                    )}
                    aria-label={`Cell ${index + 1}, number ${num}`}
                  >
                    {isCalled && (
                      <div className="absolute inset-0 bg-accent/80 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-8 h-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                    <span className="relative z-10">{num}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Number Bank</CardTitle>
            <CardDescription>{turnText}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-5 gap-2">
                {allNumbers.map((num) => {
                  const isCalled = calledNumbers.includes(num);
                  return (
                    <button
                      key={num}
                      disabled={!isPlayerTurn || isCalled}
                      onClick={() => onCallNumber(num!)}
                      className={cn(
                        "text-base font-semibold w-12 h-12 flex items-center justify-center rounded-md transition-colors",
                        isCalled
                          ? "bg-primary text-primary-foreground opacity-50 cursor-not-allowed"
                          : "border-2 border-transparent bg-secondary text-secondary-foreground",
                        !isCalled && isPlayerTurn && "hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer",
                        !isCalled && !isPlayerTurn && "cursor-not-allowed opacity-70",
                      )}
                    >
                      {num}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
             <Button 
                onClick={onBingoCall} 
                size="lg" 
                className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!canCallBingo}
             >
                <PartyPopper className="mr-2 h-5 w-5" />
                Bingo! ({completedLines}/{linesToWin} Lines)
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Called Numbers</CardTitle>
            <CardDescription>Total: {calledNumbers.length} / {allNumbers.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <div className="flex flex-wrap gap-2">
                {calledNumbers.slice().reverse().map((num) => (
                  <Badge key={num} variant="secondary" className="text-base font-semibold w-10 h-10 flex items-center justify-center">
                    {num}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
