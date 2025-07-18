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
import { Share2, History, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";

const MAX_HISTORY = 5;

type GameResult = {
  result: "win" | "loss" | "draw";
  opponent: string;
  date: string;
};

interface GameOverDialogProps {
  isOpen: boolean;
  winnerName: string | null;
  isPlayerWinner: boolean;
  onPlayAgain: () => void;
  onGoToLobby: () => void;
}

export function GameOverDialog({
  isOpen,
  winnerName,
  isPlayerWinner,
  onPlayAgain,
  onGoToLobby,
}: GameOverDialogProps) {
  const { toast } = useToast();
  const [winningStreak, setWinningStreak] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage
    const storedStreak = parseInt(localStorage.getItem("bingoWinningStreak") || "0", 10);
    const storedHistory: GameResult[] = JSON.parse(localStorage.getItem("bingoGameHistory") || "[]");
    
    let currentStreak = storedStreak;
    
    // Update streak
    if (isPlayerWinner) {
      currentStreak++;
    } else {
      currentStreak = 0; // Reset on loss or draw
    }
    
    // Update history
    const newResult: GameResult = {
      result: isPlayerWinner ? 'win' : (winnerName === 'DRAW' ? 'draw' : 'loss'),
      opponent: isPlayerWinner ? (winnerName || 'Yourself') : (winnerName || 'Opponent'),
      date: new Date().toLocaleString()
    };
    const updatedHistory = [newResult, ...storedHistory].slice(0, MAX_HISTORY);

    // Save to localStorage
    localStorage.setItem("bingoWinningStreak", currentStreak.toString());
    localStorage.setItem("bingoGameHistory", JSON.stringify(updatedHistory));
    
    // Update state
    setWinningStreak(currentStreak);
    setGameHistory(updatedHistory);

  }, [isOpen, isPlayerWinner, winnerName]);


  const handleShare = () => {
    const shareText = `I just won a game of BingoBoardBlitz with a winning streak of ${winningStreak}! Can you beat me?`;
    if (navigator.share) {
      navigator
        .share({
          title: "I Won at BingoBoardBlitz!",
          text: shareText,
          url: window.location.href,
        })
        .catch((error) => {
           if (error.name !== 'AbortError') {
             console.error("Error sharing:", error)
           }
        });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(`${shareText} Play here: ${window.location.href}`);
      toast({
        title: "Link Copied!",
        description: "Your victory message has been copied to the clipboard.",
      });
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
      ? "An intense match! No winner this time."
      : isPlayerWinner
      ? "Congratulations! Your strategic board setup paid off."
      : "Better luck next time!";

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

        <div className="grid grid-cols-2 gap-4 my-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Winning Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winningStreak}</div>
              <p className="text-xs text-muted-foreground">
                {isPlayerWinner ? '+1 this game' : 'Streak reset'}
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Game History</CardTitle>
               <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-20">
                <ul className="text-sm text-muted-foreground space-y-1">
                  {gameHistory.length > 0 ? (
                    gameHistory.map((game, index) => (
                      <li key={index} className="flex justify-between items-center text-xs">
                        <span>{game.result === 'win' ? '🏆 Won' : game.result === 'loss' ? '💀 Lost' : '🤝 Draw'} vs {game.opponent}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-xs">Play some games to see your history.</p>
                  )}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>


        <AlertDialogFooter className="mt-4 sm:flex-row sm:justify-center gap-2">
           {isPlayerWinner && (
            <Button onClick={handleShare} size="lg" variant="secondary" className="w-full">
              <Share2 className="mr-2" />
              Share Win
            </Button>
          )}
          <Button onClick={onPlayAgain} size="lg" className="w-full">
            Play Again
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
