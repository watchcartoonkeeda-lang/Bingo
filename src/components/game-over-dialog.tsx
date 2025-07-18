
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
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";


interface GameOverDialogProps {
  isOpen: boolean;
  winnerName: string | null;
  isPlayerWinner: boolean;
  onPlayAgain: () => void;
  onGoToLobby: () => void;
  opponentName: string;
}

export function GameOverDialog({
  isOpen,
  winnerName,
  isPlayerWinner,
  onGoToLobby,
}: GameOverDialogProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareText = `I just won a game of BingoBoardBlitz! Can you beat me?`;
    const fallbackCopy = () => {
      navigator.clipboard.writeText(`${shareText} Play here: ${window.location.href}`);
      toast({
        title: "Link Copied!",
        description: "Your victory message has been copied to the clipboard.",
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "I Won at BingoBoardBlitz!",
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
         // Fallback to copying the link if the share API fails for any reason.
         if (error instanceof Error && error.name !== 'AbortError') {
            console.error("Could not use Web Share API, falling back to clipboard.", error);
         }
         fallbackCopy();
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      fallbackCopy();
    }
  };

  const title =
    winnerName === "DRAW"
      ? "🤝 It's a Draw! 🤝"
      : isPlayerWinner
      ? "🎉 You Won! 🎉"
      : `${winnerName} Won!`;

  const description =
    winnerName === "DRAW"
      ? "An intense match! No winner this time. Your score is unaffected."
      : isPlayerWinner
      ? "Congratulations! Your score has increased by 1 point."
      : "Better luck next time! Your score has been reduced by 2 points.";

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="overflow-hidden max-w-lg">
        {isPlayerWinner && <Confetti />}
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl font-bold text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 sm:flex-row sm:justify-center gap-2">
           {isPlayerWinner && (
            <Button onClick={handleShare} size="lg" variant="secondary" className="w-full">
              <Share2 className="mr-2" />
              Share Win
            </Button>
          )}
          <Button onClick={onGoToLobby} size="lg" className="w-full">
            Go to Lobby
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
