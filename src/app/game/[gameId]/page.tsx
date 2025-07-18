
// src/app/game/[gameId]/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
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
import { playBotTurn } from "@/ai/flows/bot-player";
import { GameInstructions } from "@/components/game-instructions";
import { SetupTimer } from "@/components/setup-timer";


type GameStatus = "waiting" | "setup" | "playing" | "finished";
type Player = {
  id: string;
  name: string;
  board: number[];
  isBoardReady: boolean;
  isBot: boolean;
};
type GameState = {
  id: string;
  status: GameStatus;
  players: { [key: string]: Player };
  calledNumbers: number[];
  currentTurn: string | null;
  winner: string | null;
  maxPlayers: number;
  isBotGame: boolean;
  hostId: string | null;
};

const INITIAL_BOARD = Array(25).fill(null);
const ALL_NUMBERS = Array.from({ length: 25 }, (_, i) => i + 1);
const LINES_TO_WIN = 5;

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
  const prevCompletedLines = useRef(0);
  
  useEffect(() => {
    let playerId = sessionStorage.getItem("playerId");
    if (!playerId) {
      playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("playerId", playerId);
    }
    setLocalPlayerId(playerId);
  }, []);

  const localPlayer = gameState?.players?.[localPlayerId || ''];
  const otherPlayers = Object.values(gameState?.players || {}).filter(p => p.id !== localPlayerId);

  // Effect to subscribe to game state changes
  useEffect(() => {
    if (!gameId || !localPlayerId) return;

    const gameRef = doc(firestore, "games", gameId);
    
    const unsubscribe = onSnapshot(gameRef, async (docSnap) => {
      if (!docSnap.exists()) {
        toast({ variant: "destructive", title: "Game not found" });
        router.push("/");
        return;
      }
      
      const gameData = docSnap.data() as GameState;

      // If it's a bot game and only the host is in, add the bot and go to setup.
      if (gameData.isBotGame && gameData.status === 'waiting' && gameData.players[localPlayerId] && Object.keys(gameData.players).length === 1) {
        if(gameData.hostId === localPlayerId){ 
            const botId = 'bot_player_1';
            if (!gameData.players[botId]) {
              const botBoard = [...ALL_NUMBERS].sort(() => 0.5 - Math.random()).slice(0,25);
              const botPlayer: Player = {
                  id: botId,
                  name: 'BingoBot',
                  board: botBoard,
                  isBoardReady: true, // Bot is always ready
                  isBot: true,
              };
              await updateDoc(gameRef, { 
                [`players.${botId}`]: botPlayer,
                status: 'setup' 
              });
            }
        }
      }

      setGameState(gameData);
      setIsLoading(false);

    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ variant: "destructive", title: "Connection Error"});
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [gameId, router, toast, localPlayerId]);

  // Effect to check if all players are ready and start the game
  useEffect(() => {
    if (gameState?.status === 'setup') {
      const allPlayersReady = Object.values(gameState.players).every(p => p.isBoardReady);
      if (allPlayersReady) {
        const gameRef = doc(firestore, "games", gameId);
        const playerIds = Object.keys(gameState.players);
        const startingPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        
        updateDoc(gameRef, {
            status: 'playing',
            currentTurn: startingPlayerId,
            calledNumbers: []
        });
      }
    }
  }, [gameState, gameId]);


  // Effect to check for bingo readiness and notify the player
  useEffect(() => {
    if (!localPlayer || !gameState || gameState.status !== 'playing') return;

    if (localPlayer.board.length > 0) {
      const currentCompletedLines = countWinningLines(localPlayer.board, gameState.calledNumbers);
      if (currentCompletedLines >= LINES_TO_WIN && prevCompletedLines.current < LINES_TO_WIN) {
        toast({
          title: "🎉 You can call Bingo now! 🎉",
          description: `You've completed ${currentCompletedLines} lines. Hit the Bingo button to win!`,
          duration: 8000,
          className: "bg-accent border-primary text-accent-foreground",
        });
      }
      prevCompletedLines.current = currentCompletedLines;
    }
  }, [gameState, localPlayer, toast]);

  // Effect for Bot's turn
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !gameState.isBotGame) return;

    const botPlayer = Object.values(gameState.players).find(p => p.isBot);
    if (botPlayer && gameState.currentTurn === botPlayer.id) {
        const handleBotTurn = async () => {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Bot "thinks"

            const botResult = await playBotTurn({
                playerBoard: botPlayer.board,
                calledNumbers: gameState.calledNumbers,
                allNumbers: ALL_NUMBERS
            });

            if (botResult.shouldCallBingo) {
                const botWon = checkWin(botPlayer.board, gameState.calledNumbers);
                const gameRef = doc(firestore, "games", gameId);
                if (botWon) {
                    await updateDoc(gameRef, {
                        status: 'finished',
                        winner: botPlayer.id,
                    });
                } else {
                    console.log("Bot called Bingo but didn't win. What a silly bot.");
                    await handleCallNumber(botResult.chosenNumber, botPlayer.id);
                }
            } else {
                await handleCallNumber(botResult.chosenNumber, botPlayer.id);
            }
        };
        handleBotTurn();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.status, gameState?.currentTurn, gameId]);


  const handleJoinGame = async () => {
      if (!localPlayerId || !gameState || isJoining || (localPlayerId && gameState.players[localPlayerId])) return;
      
      const playerCount = Object.keys(gameState.players).length;
      if (playerCount >= gameState.maxPlayers) {
          toast({ variant: "destructive", title: "Game is full"});
          return;
      }

      setIsJoining(true);
      try {
          const gameRef = doc(firestore, "games", gameId);
          const name = prompt("Please enter your name:");
          if (!name) {
              setIsJoining(false);
              return;
          }
          const newPlayer: Player = {
              id: localPlayerId,
              name: name,
              board: [],
              isBoardReady: false,
              isBot: false,
          };
          
          await updateDoc(gameRef, { [`players.${localPlayerId}`]: newPlayer });

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
  
  const handleRandomizeBoard = useCallback(() => {
    const shuffled = [...ALL_NUMBERS].sort(() => 0.5 - Math.random());
    setPlayerBoard(shuffled.slice(0, 25));
  }, []);


  const handleConfirmBoard = useCallback(async (boardToConfirm: (number | null)[]) => {
    const isBoardSetupComplete = boardToConfirm.every((cell) => cell !== null);
    if (!localPlayerId || !isBoardSetupComplete || !gameState) return;

    const gameRef = doc(firestore, "games", gameId);
    
    await updateDoc(gameRef, {
      [`players.${localPlayerId}.board`]: boardToConfirm,
      [`players.${localPlayerId}.isBoardReady`]: true,
    });
  }, [gameId, localPlayerId, gameState]);

  const handleStartGame = async () => {
    if (!gameState || localPlayerId !== gameState.hostId) return;

    const playerCount = Object.values(gameState.players).length;
    if (playerCount < 2 && !gameState.isBotGame) {
        toast({ variant: 'destructive', title: "Not enough players!", description: "You need at least two players to start."});
        return;
    }
    
    const gameRef = doc(firestore, "games", gameId);
    await updateDoc(gameRef, {
      status: 'setup',
    });
  }


  const handleCallNumber = async (num: number, callerId: string) => {
    if (!gameState || gameState.calledNumbers.includes(num)) return;
    
    const gameRef = doc(firestore, "games", gameId);
    
    const playerIds = Object.keys(gameState.players);
    const currentPlayerIndex = playerIds.indexOf(callerId);
    const nextPlayerId = playerIds[(currentPlayerIndex + 1) % playerIds.length];

    const newCalledNumbers = [...gameState.calledNumbers, num];
    
    if (newCalledNumbers.length === 25) {
      await updateDoc(gameRef, {
        status: 'finished',
        winner: 'DRAW',
        calledNumbers: arrayUnion(num)
      });
    } else {
      await updateDoc(gameRef, {
        calledNumbers: arrayUnion(num),
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
            description: `You need ${LINES_TO_WIN} completed lines to win. Keep playing!`,
        });
    }
  };

  const handleResetGame = async () => {
    if (!gameState || localPlayerId !== gameState.hostId) return;
    
    const gameRef = doc(firestore, "games", gameId);
    
    router.push('/');
  };

  const handleTimerEnd = useCallback(() => {
    if (localPlayer && !localPlayer.isBoardReady) {
        const randomBoard = [...ALL_NUMBERS].sort(() => 0.5 - Math.random()).slice(0, 25);
        setPlayerBoard(randomBoard);
        handleConfirmBoard(randomBoard);
        toast({
            title: "Time's up!",
            description: "Your board has been randomized for you.",
        });
    }
  }, [localPlayer, handleConfirmBoard, toast]);

  if (isLoading || !gameState || !localPlayerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Game...</p>
      </div>
    );
  }
  
  const renderContent = () => {
    switch (gameState.status) {
      case "waiting":
          return <Lobby gameId={gameId} players={Object.values(gameState.players)} hostId={gameState.hostId} localPlayerId={localPlayerId} onStartGame={handleStartGame} onJoinGame={handleJoinGame} isJoining={isJoining} isBotGame={gameState.isBotGame} />;

      case "setup":
        if (localPlayer && localPlayer.isBoardReady) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Board Confirmed!</h2>
                    <p className="text-muted-foreground">
                        Waiting for other players to finish setting up their boards...
                    </p>
                    <Loader2 className="mt-4 h-8 w-8 animate-spin mx-auto text-primary"/>
                </div>
            );
        }
        const isBoardSetupComplete = playerBoard.every((cell) => cell !== null);
        return (
          <div className="flex flex-col items-center w-full gap-8">
            <GameInstructions />
            <SetupTimer duration={120} onTimerEnd={handleTimerEnd} />
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
              <Button onClick={() => handleConfirmBoard(playerBoard)} disabled={!isBoardSetupComplete} size="lg">
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
        const completedLines = countWinningLines(localPlayer.board, gameState.calledNumbers);
        const currentTurnPlayer = gameState.players[gameState.currentTurn!];

        return (
          <GameBoard
            playerBoard={localPlayer.board}
            calledNumbers={gameState.calledNumbers}
            onCallNumber={(num) => handleCallNumber(num, localPlayerId)}
            onBingoCall={handleBingoCall}
            currentTurnId={gameState.currentTurn}
            localPlayerId={localPlayerId}
            otherPlayerName={currentTurnPlayer?.name || 'Opponent'}
            allNumbers={ALL_NUMBERS}
            completedLines={completedLines}
            linesToWin={LINES_TO_WIN}
          />
        );
      
      case "finished":
        const winnerPlayer = gameState.players[gameState.winner || ''];
        return (
            <GameOverDialog
                isOpen={true}
                winnerName={gameState.winner === localPlayerId ? 'You' : (gameState.winner === 'DRAW' ? 'DRAW' : winnerPlayer?.name || 'Opponent')}
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
              opponentName={otherPlayers.map(p => p.name).join(', ') || 'the other players'}
            />
          )}
        </header>
        {renderContent()}
      </div>
    </main>
  );
}
