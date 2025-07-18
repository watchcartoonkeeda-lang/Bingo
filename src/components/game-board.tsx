"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIAdvisor } from "@/components/ai-advisor";
import { cn } from "@/lib/utils";
import { Bot, User, Loader2 } from "lucide-react";

interface GameBoardProps {
  playerBoard: (number | null)[];
  calledNumbers: number[];
  onCallNumber: (num: number) => void;
  currentTurn: "PLAYER" | "AI"; // Represents if it's the local player's turn
  isAiThinking: boolean; // Represents if waiting for the other player
  numbersToCall: (number | null)[];
}

export function GameBoard({ playerBoard, calledNumbers, onCallNumber, currentTurn, isAiThinking, numbersToCall }: GameBoardProps) {
  const isPlayerTurn = currentTurn === 'PLAYER';

  const availableNumbersToCall = numbersToCall.filter(n => n !== null && !calledNumbers.includes(n));

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-2">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Board</CardTitle>
              <CardDescription>
                {isPlayerTurn ? "Your turn! Pick a number to call." : "Waiting for opponent..."}
              </CardDescription>
            </div>
            <div className={cn("flex items-center gap-2 p-2 rounded-lg transition-all", isPlayerTurn ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {isPlayerTurn ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              <span className="font-semibold">{isPlayerTurn ? "Your Turn" : "Opponent's Turn"}</span>
               {isAiThinking && <Loader2 className="h-5 w-5 animate-spin"/>}
            </div>
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
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 dark:bg-gray-800 border-transparent",
                    )}
                    aria-label={`Cell ${index + 1}, number ${num}`}
                  >
                    {isCalled && (
                      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
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
            <CardTitle>Numbers To Call</CardTitle>
            <CardDescription>Click a number to call it on your turn.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="flex flex-wrap gap-2">
                {availableNumbersToCall.map((num) => (
                  <button
                    key={num}
                    disabled={!isPlayerTurn || isAiThinking}
                    onClick={() => onCallNumber(num!)}
                    className={cn(
                      "text-lg font-semibold w-12 h-12 flex items-center justify-center rounded-md transition-colors",
                      "border-2 border-transparent bg-accent text-accent-foreground",
                      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary",
                      "hover:bg-accent/80 hover:border-primary"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Called Numbers</CardTitle>
            <CardDescription>Total: {calledNumbers.length} / 75</CardDescription>
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
