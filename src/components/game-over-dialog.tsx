"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Confetti } from "./confetti";

interface GameOverDialogProps {
  isOpen: boolean;
  winner: "PLAYER" | "AI" | "DRAW" | null;
  onPlayAgain: () => void;
}

export function GameOverDialog({ isOpen, winner, onPlayAgain }: GameOverDialogProps) {
  const title =
    winner === "PLAYER"
      ? "🎉 You Win! 🎉"
      : winner === "AI"
      ? "😢 You Lose 😢"
      : "🤝 It's a Draw! 🤝";

  const description =
    winner === "PLAYER"
      ? "Congratulations! Your strategic board setup paid off."
      : winner === "AI"
      ? "The AI bested you this time. Better luck next round!"
      : "An intense match! No winner this time.";

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="overflow-hidden">
        {winner === "PLAYER" && <Confetti />}
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl font-bold text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <Button onClick={onPlayAgain} size="lg" className="w-full">
            Play Again
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
