"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIAdvisor } from "@/components/ai-advisor";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface GameBoardProps {
  playerBoard: (number | null)[];
  calledNumbers: number[];
  onCallNumber: (num: number) => void;
  currentTurn: "PLAYER" | "AI";
  isAiThinking: boolean;
}

export function GameBoard({ playerBoard, calledNumbers, onCallNumber, currentTurn, isAiThinking }: GameBoardProps) {
  const isPlayerTurn = currentTurn === 'PLAYER';

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-2">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Board</CardTitle>
              <CardDescription>
                {isPlayerTurn ? "Your turn! Call a number." : "Waiting for AI..."}
              </CardDescription>
            </div>
            <div className={cn("flex items-center gap-2 p-2 rounded-lg transition-all", isPlayerTurn ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {isPlayerTurn ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              <span className="font-semibold">{isPlayerTurn ? "Your Turn" : "AI's Turn"}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 aspect-square">
              {playerBoard.map((num, index) => {
                const isCalled = num !== null && calledNumbers.includes(num);
                const canCall = isPlayerTurn && !isCalled && !isAiThinking;

                return (
                  <button
                    key={index}
                    onClick={() => num && canCall && onCallNumber(num)}
                    disabled={!canCall}
                    className={cn(
                      "flex items-center justify-center text-xl font-bold rounded-md border-2 transition-all duration-200 aspect-square relative overflow-hidden",
                      "disabled:cursor-not-allowed",
                      isCalled
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 dark:bg-gray-800 border-transparent hover:border-primary",
                      canCall && "cursor-pointer hover:scale-105 hover:shadow-lg"
                    )}
                    aria-label={`Cell ${index + 1}, number ${num}`}
                  >
                    {isCalled && (
                      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                    <span className="relative z-10">{num}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Called Numbers</CardTitle>
            <CardDescription>Total: {calledNumbers.length} / 25</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="flex flex-wrap gap-2">
                {calledNumbers.map((num) => (
                  <Badge key={num} variant="secondary" className="text-lg font-semibold w-12 h-12 flex items-center justify-center bg-accent text-accent-foreground">
                    {num}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <AIAdvisor
            playerBoard={playerBoard}
            calledNumbers={calledNumbers}
            disabled={!isPlayerTurn || isAiThinking}
          />
        </div>
      </div>
    </div>
  );
}
