
// src/app/game/[gameId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { BoardSetup } from "@/components/board-setup";
import { GameBoard } from "@/components/game-board";
import { GameOverDialog } from "@/components/game-over-dialog";
import { AppLogo } from "@/components/icons";
import { checkWin, countWinningLines } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Lobby } from "@/components/lobby";
import { AIAdvisor } from "@/components/ai-advisor";

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
const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1);


export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [playerBoard, setPlayerBoard] = useState<(number | null)[]>(INITIAL_BOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let playerId = sessionStorage.getItem("playerId");
    if (!playerId) {
      playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("playerId", playerId);
    }
    setLocalPlayerId(playerId);
  }, []);
  
  // Effect to subscribe to game state. It ONLY reads data.
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(firestore, "games", gameId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (!docSnap.exists()) {
        toast({ variant: "destructive", title: "Game not found" });
        router.push("/");
        return;
      }
      
      const gameData = docSnap.data() as GameState;
      setGameState(gameData);
      setIsLoading(false);

    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ variant: "destructive", title: "Connection Error"});
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [gameId, router, toast]);

  const handleJoinGame = async () => {
      if (!localPlayerId || !gameState || gameState.players[localPlayerId]) return;
      
      const playerCount = Object.keys(gameState.players).length;
      if (playerCount >= 2) {
          toast({ variant: "destructive", title: "Game is full"});
          return;
      }

      setIsJoining(true);
      try {
          const gameRef = doc(firestore, "games", gameId);
          const newPlayer: Player = {
              id: localPlayerId,
              name: `Player ${playerCount + 1}`,
              board: [],
              isBoardReady: false,
          };

          await updateDoc(gameRef, {
              [`players.${localPlayerId}`]: newPlayer
          });
          
          // If joining makes the game full, transition state to 'setup'
          if (playerCount + 1 === 2) {
              await updateDoc(gameRef, { status: 'setup' });
          }

      } catch (error) {
          console.error("Error joining game:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not join the game." });
      } finally {
          setIsJoining(false);
      }
  };


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
    const shuffled = [...ALL_NUMBERS].sort(() => 0.5 - Math.random());
    setPlayerBoard(shuffled.slice(0, 25));
  };


  const handleConfirmBoard = async () => {
    const isBoardSetupComplete = playerBoard.every((cell) => cell !== null);
    if (!localPlayerId || !isBoardSetupComplete || !gameState) return;

    const gameRef = doc(firestore, "games", gameId);
    
    // Update the local player's board and ready status
    await updateDoc(gameRef, {
      [`players.${localPlayerId}.board`]: playerBoard,
      [`players.${localPlayerId}.isBoardReady`]: true,
    });

    // To prevent race conditions, fetch the latest game state AFTER our update.
    const updatedGameSnap = await getDoc(gameRef);
    if (!updatedGameSnap.exists()) return;

    const updatedGameData = updatedGameSnap.data() as GameState;
    const allPlayers = Object.values(updatedGameData.players);

    // If all players are ready, start the game.
    if (updatedGameData.status === 'setup' && allPlayers.length === 2 && allPlayers.every(p => p.isBoardReady)) {
       const startingPlayerId = allPlayers[Math.floor(Math.random() * allPlayers.length)].id;
       await updateDoc(gameRef, {
        status: 'playing',
        currentTurn: startingPlayerId,
        calledNumbers: [] // Ensure called numbers are reset for a new game
      });
    }
  };


  const handleCallNumber = async (num: number) => {
    if (!gameState || !localPlayerId || gameState.currentTurn !== localPlayerId || gameState.calledNumbers.includes(num)) return;
    
    const gameRef = doc(firestore, "games", gameId);
    
    const playerIds = Object.keys(gameState.players);
    const currentPlayerIndex = playerIds.indexOf(localPlayerId);
    const nextPlayerId = playerIds[(currentPlayerIndex + 1) % playerIds.length];

    // Check for a win after calling a number
    const newCalledNumbers = [...gameState.calledNumbers, num];
    const player = gameState.players[localPlayerId];
    if (checkWin(player.board, newCalledNumbers)) {
        await updateDoc(gameRef, {
            status: 'finished',
            winner: localPlayerId,
            calledNumbers: newCalledNumbers, // record the final number
        });
    } else if (newCalledNumbers.length === 75) {
        // Check for draw
        await updateDoc(gameRef, {
            status: 'finished',
            winner: 'DRAW',
            calledNumbers: newCalledNumbers,
        });
    }
    else {
        await updateDoc(gameRef, {
            calledNumbers: newCalledNumbers,
            currentTurn: nextPlayerId,
        });
    }
  };
  
  const handleBingoCall = async () => {
    if (!gameState || !localPlayerId || gameState.status !== 'playing' || !gameState.players[localPlayerId]) return;

    const player = gameState.players[localPlayerId];
    const playerWon = checkWin(player.board, gameState.calledNumbers);
    const gameRef = doc(firestore, "games", gameId);

    if (playerWon) {
        await updateDoc(gameRef, {
            status: 'finished',
            winner: localPlayerId,
        });
    } else {
        toast({
            variant: "destructive",
            title: "Not a Bingo!",
            description: "You don't have a winning pattern yet. Keep playing!",
        });
    }
  };

  const handleResetGame = async () => {
    if (!gameState) return;
    const gameRef = doc(firestore, "games", gameId);
    
    const freshPlayers: {[key: string]: Player} = {};
    for (const id in gameState.players) {
        freshPlayers[id] = {
            ...gameState.players[id],
            board: [],
            isBoardReady: false,
        };
    }

    await updateDoc(gameRef, {
      status: "setup",
      calledNumbers: [],
      currentTurn: null,
      winner: null,
      players: freshPlayers,
    });

    setPlayerBoard(INITIAL_BOARD);
  };


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
  const otherPlayer = Object.values(gameState.players).find(p => p.id !== localPlayerId);

  const renderContent = () => {
    switch (gameState.status) {
      case "waiting":
          if (!localPlayer) {
              return (
                  <div className="text-center">
                      <Lobby gameId={gameId} players={Object.values(gameState.players)} />
                      <Button onClick={handleJoinGame} disabled={isJoining} size="lg" className="mt-8">
                          {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Join Game'}
                      </Button>
                  </div>
              );
          }
          return <Lobby gameId={gameId} players={Object.values(gameState.players)} />;

      case "setup":
        if (localPlayer && localPlayer.isBoardReady) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Board Confirmed!</h2>
                    <p className="text-muted-foreground">
                        {otherPlayer && otherPlayer.isBoardReady 
                          ? 'Starting game...' 
                          : `Waiting for ${otherPlayer?.name || 'the other player'} to set up their board...`
                        }
                    </p>
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
              numbersToUse={ALL_NUMBERS}
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
        if (!localPlayer || !localPlayer.board || localPlayer.board.length === 0) {
           return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Error</h2>
                    <p className="text-muted-foreground">Could not load your board. Please try refreshing.</p>
                </div>
           )
        }
        return (
          <GameBoard
            playerBoard={localPlayer.board}
            calledNumbers={gameState.calledNumbers}
            onCallNumber={handleCallNumber}
            onBingoCall={handleBingoCall}
            currentTurnId={gameState.currentTurn}
            localPlayerId={localPlayerId}
            otherPlayerName={otherPlayer?.name || 'Opponent'}
            allNumbers={ALL_NUMBERS}
            completedLines={countWinningLines(localPlayer.board, gameState.calledNumbers)}
          />
        );
      
      case "finished":
        return (
            <GameOverDialog
                isOpen={true}
                winnerName={gameState.winner === localPlayerId ? 'You' : (gameState.winner === 'DRAW' ? 'DRAW' : otherPlayer?.name || 'Opponent')}
                isPlayerWinner={gameState.winner === localPlayerId}
                onPlayAgain={handleResetGame}
                onGoToLobby={() => router.push('/')}
            />
        );

      default:
        return <p>Unknown game state.</p>;
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-background dark:bg-gray-900">
       <div className="w-full max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6 w-full">
          <AppLogo />
           {gameState.status === 'playing' && localPlayer && localPlayer.board.length > 0 && (
            <AIAdvisor
              playerBoard={localPlayer.board}
              calledNumbers={gameState.calledNumbers}
              disabled={gameState.currentTurn !== localPlayerId}
              opponentName={otherPlayer?.name || 'the other player'}
            />
          )}
        </header>
        {renderContent()}
      </div>
    </main>
  );
}
