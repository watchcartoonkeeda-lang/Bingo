"use client";

import { useState, useEffect, useCallback } from "react";
import { BoardSetup } from "@/components/board-setup";
import { GameBoard } from "@/components/game-board";
import { GameOverDialog } from "@/components/game-over-dialog";
import { AppLogo } from "@/components/icons";
import { checkWin } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";

type GameState = "SETUP" | "PLAYING" | "GAME_OVER";
type Turn = "PLAYER" | "AI";
type Winner = "PLAYER" | "AI" | "DRAW" | null;

const INITIAL_BOARD = Array(25).fill(null);
const ALL_NUMBERS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [playerBoard, setPlayerBoard] = useState<(number | null)[]>(INITIAL_BOARD);
  const [aiBoard, setAiBoard] = useState<number[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Turn>("PLAYER");
  const [winner, setWinner] = useState<Winner>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const shuffleBoard = () => {
    return [...ALL_NUMBERS].sort(() => Math.random() - 0.5);
  };

  const handleStartGame = () => {
    setAiBoard(shuffleBoard());
    setGameState("PLAYING");
  };

  const handleResetGame = () => {
    setGameState("SETUP");
    setPlayerBoard(INITIAL_BOARD);
    setAiBoard([]);
    setCalledNumbers([]);
    setCurrentTurn("PLAYER");
    setWinner(null);
  };

  const handlePlaceNumber = (index: number, num: number) => {
    setPlayerBoard((prev) => {
      const newBoard = [...prev];
      // If number is already on board, find its index to swap
      const existingNumIndex = newBoard.indexOf(num);
      if (existingNumIndex > -1) {
        // Swap numbers
        const valueAtTargetIndex = newBoard[index];
        newBoard[index] = num;
        if(valueAtTargetIndex !== null) {
          newBoard[existingNumIndex] = valueAtTargetIndex;
        } else {
          newBoard[existingNumIndex] = null;
        }
      } else {
        newBoard[index] = num;
      }
      return newBoard;
    });
  };

  const handleRandomizeBoard = () => {
    setPlayerBoard(shuffleBoard());
  };

  const handleCallNumber = (num: number) => {
    if (currentTurn !== "PLAYER" || calledNumbers.includes(num)) return;
    setCalledNumbers((prev) => [...prev, num]);
    setCurrentTurn("AI");
  };

  const aiTurn = useCallback(() => {
    setIsAiThinking(true);
    setTimeout(() => {
      const availableNumbers = aiBoard.filter(
        (num) => !calledNumbers.includes(num)
      );
      if (availableNumbers.length > 0) {
        // Simple AI: pick a random available number from its board
        const calledNum =
          availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        setCalledNumbers((prev) => [...prev, calledNum]);
      }
      setCurrentTurn("PLAYER");
      setIsAiThinking(false);
    }, 1500);
  }, [aiBoard, calledNumbers]);

  useEffect(() => {
    if (gameState === "PLAYING" && currentTurn === "AI" && !winner) {
      aiTurn();
    }
  }, [currentTurn, gameState, winner, aiTurn]);

  useEffect(() => {
    if (calledNumbers.length === 0) return;

    const playerWon = checkWin(playerBoard, calledNumbers);
    const aiWon = checkWin(aiBoard, calledNumbers);

    if (playerWon && aiWon) {
      setWinner("DRAW");
      setGameState("GAME_OVER");
    } else if (playerWon) {
      setWinner("PLAYER");
      setGameState("GAME_OVER");
    } else if (aiWon) {
      setWinner("AI");
      setGameState("GAME_OVER");
    } else if (calledNumbers.length === 25) {
      setWinner("DRAW");
      setGameState("GAME_OVER");
    }
  }, [calledNumbers, playerBoard, aiBoard]);
  
  const isBoardSetupComplete = playerBoard.every((cell) => cell !== null);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto">
        <header className="flex items-center justify-center mb-6">
          <AppLogo />
        </header>

        {gameState === "SETUP" && (
          <div className="flex flex-col items-center w-full">
            <BoardSetup
              board={playerBoard}
              onPlaceNumber={handlePlaceNumber}
              onRandomize={handleRandomizeBoard}
            />
            <div className="mt-6 flex gap-4">
               <Button onClick={handleRandomizeBoard} variant="outline">
                <Dices className="mr-2 h-4 w-4" /> Randomize Board
              </Button>
              <Button onClick={handleStartGame} disabled={!isBoardSetupComplete} size="lg">
                Confirm Board & Start Game
              </Button>
            </div>
          </div>
        )}

        {gameState === "PLAYING" && (
          <GameBoard
            playerBoard={playerBoard}
            calledNumbers={calledNumbers}
            onCallNumber={handleCallNumber}
            currentTurn={currentTurn}
            isAiThinking={isAiThinking}
          />
        )}
        
        <GameOverDialog
          isOpen={gameState === "GAME_OVER"}
          winner={winner}
          onPlayAgain={handleResetGame}
        />
      </div>
    </main>
  );
}
