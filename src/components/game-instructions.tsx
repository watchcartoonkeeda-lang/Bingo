
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListChecks, Target, PartyPopper } from "lucide-react";

export function GameInstructions() {
  return (
    <Card className="w-full max-w-4xl bg-secondary/30 border-primary/20">
      <CardHeader>
        <CardTitle>How to Play BingoBoardBlitz</CardTitle>
        <CardDescription>
          Follow these simple steps to start playing and claim your victory!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ListChecks className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">1. Set Up Your Board</h3>
              <p className="text-muted-foreground">
                Click on a cell on your board, then choose a number from the
                Number Bank to place it. Fill all 25 cells to complete your
                unique board. Use the "Randomize" button for a quick start!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">2. Play Your Turn</h3>
              <p className="text-muted-foreground">
                When it's your turn, call a number from the Number Bank. The
                number will be marked on everyone's board. A good strategy is
                to call numbers that help you complete your lines.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">3. Win the Game</h3>
              <p className="text-muted-foreground">
                The goal is to complete 5 lines (horizontal, vertical, or
                diagonal). Once you have 5 lines, the "Bingo!" button will
                activate. Click it to win the game!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
