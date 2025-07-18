"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BoardSetupProps {
  board: (number | null)[];
  onPlaceNumber: (index: number, num: number) => void;
  onRandomize: () => void;
  numbersToUse: number[];
}

export function BoardSetup({ board, onPlaceNumber, numbersToUse }: BoardSetupProps) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const handleCellClick = (index: number) => {
    setSelectedCell(index);
  };

  const handleNumberClick = (num: number) => {
    if (selectedCell !== null) {
      onPlaceNumber(selectedCell, num);
      // Keep cell selected to allow rapid placement
      // setSelectedCell(null);
    }
  };
  
  const placedNumbers = board.filter(n => n !== null);
  const availableNumbers = numbersToUse.filter(n => !board.includes(n));


  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Set Up Your Bingo Board</CardTitle>
            <CardDescription>
              Click a cell, then pick a number. You need 25 unique numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 aspect-square">
              {board.map((num, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={cn(
                    "flex items-center justify-center text-lg md:text-xl font-bold rounded-md border-2 transition-all duration-200 aspect-square",
                    "hover:border-primary",
                    selectedCell === index
                      ? "bg-accent text-accent-foreground border-accent ring-2 ring-accent"
                      : "bg-secondary/50 dark:bg-gray-800",
                    num ? "border-transparent" : "border-dashed"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Number Bank</CardTitle>
           <CardDescription>
              Placed: {placedNumbers.length} / 25
            </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <div className="grid grid-cols-4 gap-2">
              {numbersToUse.map((num) => {
                const isPlaced = board.includes(num);
                return (
                  <Button
                    key={num}
                    variant={isPlaced ? "secondary" : "outline"}
                    disabled={isPlaced || selectedCell === null}
                    onClick={() => handleNumberClick(num)}
                    className={cn(
                      "aspect-square h-auto text-base font-semibold transition-all",
                      isPlaced ? "opacity-30" : "hover:bg-accent hover:text-accent-foreground",
                       selectedCell !== null && !isPlaced ? "animate-pulse" : ""
                    )}
                  >
                    {num}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
