// src/app/game/[gameId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { BoardSetup } from "@/components/board-setup";
import { GameBoard } from "@/components/game-board";
import { GameOverDialog } from "@/components/game-over-dialog";
import { AppLogo } from "@/components/icons";
import { checkWin } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Users, Share2 } from "lucide-react";
import { Lobby } from "@/components/lobby";

type GameStatus = "waiting" | "setup" | "playing" | "finished";
type Player = {
  id: string;
  name: string;
  board: number[];
  isBoardReady: boolean;
};
type GameState = {
  id: string;
  status: GameStatus;
  players: { [key: string]: Player };
  calledNumbers: number[];
  currentTurn: string | null;
  winner: string | null;
};

const INITIAL_BOARD = Array(25).fill(null);

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [playerBoard, setPlayerBoard] = useState<(number | null)[]>(INITIAL_BOARD);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to manage player session
  useEffect(() => {
    let playerId = sessionStorage.getItem("playerId");
    if (!playerId) {
      playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("playerId", playerId);
    }
    setLocalPlayerId(playerId);
  }, []);

  // Effect to subscribe to game state changes
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(firestore, "games", gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const gameData = docSnap.data() as GameState;
        setGameState(gameData);
        setIsLoading(false);
      } else {
        toast({
          variant: "destructive",
          title: "Game not found",
          description: "This game does not exist or has been deleted.",
        });
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [gameId, router, toast]);

  // Effect to handle player joining
  useEffect(() => {
    if (!localPlayerId || !gameState || gameState.players[localPlayerId] || Object.keys(gameState.players).length >= 2) {
      return;
    }

    const joinGame = async () => {
      const gameRef = doc(firestore, "games", gameId);
      const newPlayer: Player = {
        id: localPlayerId,
        name: `Player ${Object.keys(gameState.players).length + 1}`,
        board: [],
        isBoardReady: false,
      };

      await updateDoc(gameRef, {
        [`players.${localPlayerId}`]: newPlayer,
      });
    };

    joinGame();
  }, [localPlayerId, gameState, gameId]);


  const handlePlaceNumber = (index: number, num: number) => {
    setPlayerBoard((prev) => {
      const newBoard = [...prev];
      const existingNumIndex = newBoard.indexOf(num);
      if (existingNumIndex > -1) {
        const valueAtTargetIndex = newBoard[index];
        newBoard[index] = num;
        if (valueAtTargetIndex !== null) {
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
    const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1);
    const shuffled = [...ALL_NUMBERS].sort(() => 0.5 - Math.random());
    setPlayerBoard(shuffled.slice(0, 25));
  };


  const handleConfirmBoard = async () => {
    if (!localPlayerId || !isBoardSetupComplete) return;

    const gameRef = doc(firestore, "games", gameId);
    await updateDoc(gameRef, {
      [`players.${localPlayerId}.board`]: playerBoard,
      [`players.${localPlayerId}.isBoardReady`]: true,
    });
  };
  
  // Effect to start game when both players are ready
  useEffect(() => {
    if (!gameState || gameState.status !== 'setup') return;

    const players = Object.values(gameState.players);
    if (players.length === 2 && players.every(p => p.isBoardReady)) {
      const gameRef = doc(firestore, "games", gameId);
      updateDoc(gameRef, {
        status: 'playing',
        currentTurn: players[0].id // First player starts
      });
    }
  }, [gameState, gameId]);


  const handleCallNumber = async (num: number) => {
    if (!gameState || gameState.currentTurn !== localPlayerId || gameState.calledNumbers.includes(num)) return;
    
    const gameRef = doc(firestore, "games", gameId);
    
    // Determine next player
    const playerIds = Object.keys(gameState.players);
    const currentPlayerIndex = playerIds.indexOf(localPlayerId!);
    const nextPlayerId = playerIds[(currentPlayerIndex + 1) % playerIds.length];

    await updateDoc(gameRef, {
      calledNumbers: arrayUnion(num),
      currentTurn: nextPlayerId,
      lastActivity: serverTimestamp(),
    });
  };

  const handleResetGame = async () => {
    const gameRef = doc(firestore, "games", gameId);
    const initialNumbers = Array.from({ length: 75 }, (_, i) => i + 1);

    await updateDoc(gameRef, {
      status: "waiting",
      calledNumbers: [],
      availableNumbers: initialNumbers,
      currentTurn: null,
      winner: null,
      players: {}, // Reset players
      lastActivity: serverTimestamp(),
    });
    sessionStorage.removeItem("playerId");
    setLocalPlayerId(null); // Force re-join
    router.push("/");
  };
  
  // Effect to check for game start
  useEffect(() => {
      if (!gameState) return;
      const players = Object.values(gameState.players);
      if (gameState.status === 'waiting' && players.length === 2) {
          const gameRef = doc(firestore, 'games', gameId);
          updateDoc(gameRef, { status: 'setup' });
      }
  }, [gameState, gameId]);


  // Effect to check for winner
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    let aWinnerWasFound = false;

    for (const player of Object.values(gameState.players)) {
      const playerWon = checkWin(player.board, gameState.calledNumbers);
      if (playerWon) {
        const gameRef = doc(firestore, "games", gameId);
        updateDoc(gameRef, {
          status: 'finished',
          winner: player.id,
        });
        aWinnerWasFound = true;
        break;
      }
    }

    if (!aWinnerWasFound && gameState.calledNumbers.length === 75) {
       const gameRef = doc(firestore, "games", gameId);
       updateDoc(gameRef, {
          status: 'finished',
          winner: 'DRAW',
       });
    }
  }, [gameState, gameId]);


  if (isLoading || !gameState || !localPlayerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Game...</p>
      </div>
    );
  }
  
  const localPlayer = gameState.players[localPlayerId];
  const isBoardSetupComplete = playerBoard.every((cell) => cell !== null);

  const renderContent = () => {
    switch (gameState.status) {
      case "waiting":
        return <Lobby gameId={gameId} players={Object.values(gameState.players)} />;

      case "setup":
        if (localPlayer && localPlayer.isBoardReady) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Board Confirmed!</h2>
                    <p className="text-muted-foreground">Waiting for the other player to set up their board...</p>
                    <Loader2 className="mt-4 h-8 w-8 animate-spin mx-auto text-primary"/>
                </div>
            );
        }
        return (
          <div className="flex flex-col items-center w-full">
            <BoardSetup
              board={playerBoard}
              onPlaceNumber={handlePlaceNumber}
              onRandomize={handleRandomizeBoard}
              numbersToUse={Array.from({ length: 75 }, (_, i) => i + 1)}
            />
            <div className="mt-6 flex gap-4">
              <Button onClick={handleRandomizeBoard} variant="outline">
                Randomize Board
              </Button>
              <Button onClick={handleConfirmBoard} disabled={!isBoardSetupComplete} size="lg">
                Confirm Board
              </Button>
            </div>
          </div>
        );

      case "playing":
        return (
          <GameBoard
            playerBoard={localPlayer.board}
            calledNumbers={gameState.calledNumbers}
            onCallNumber={handleCallNumber}
            currentTurn={gameState.currentTurn === localPlayerId ? 'PLAYER' : 'AI'}
            isAiThinking={gameState.currentTurn !== localPlayerId}
            numbersToCall={localPlayer.board}
          />
        );
      
      case "finished":
        return (
            <GameOverDialog
                isOpen={true}
                winner={gameState.winner === localPlayerId ? 'PLAYER' : (gameState.winner === 'DRAW' ? 'DRAW' : 'AI')}
                onPlayAgain={handleResetGame}
            />
        );

      default:
        return <p>Unknown game state.</p>;
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
       <div className="w-full max-w-4xl mx-auto">
        <header className="flex items-center justify-center mb-6">
          <AppLogo />
        </header>
        {renderContent()}
      </div>
    </main>
  );
}
