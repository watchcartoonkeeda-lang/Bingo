// src/components/game-over-dialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Confetti } from "./confetti";

interface GameOverDialogProps {
  isOpen: boolean;
  winnerName: string | null;
  isPlayerWinner: boolean;
  onPlayAgain: () => void;
  onGoToLobby: () => void;
}

export function GameOverDialog({ isOpen, winnerName, isPlayerWinner, onPlayAgain, onGoToLobby }: GameOverDialogProps) {
  const title =
    winnerName === 'DRAW'
      ? "🤝 It's a Draw! 🤝"
      : `${winnerName} Won!`;

  const description =
    winnerName === 'DRAW'
      ? "An intense match! No winner this time."
      : isPlayerWinner
      ? "Congratulations! Your strategic board setup paid off."
      : "Better luck next time!";

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="overflow-hidden">
        {isPlayerWinner && <Confetti />}
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl font-bold text-center">
             {isPlayerWinner && '🎉'} {title} {isPlayerWinner && '🎉'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:flex-col gap-2">
          <Button onClick={onPlayAgain} size="lg" className="w-full">
            Play Again
          </Button>
          <Button onClick={onGoToLobby} size="lg" className="w-full" variant="outline">
            Back to Lobby
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
