
// src/app/game/[gameId]/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, getDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { BoardSetup } from "@/components/board-setup";
import { GameBoard } from "@/components/game-board";
import { GameOverDialog } from "@/components/game-over-dialog";
import { AppLogo } from "@/components/icons";
import { checkWin, countWinningLines, getBotMove } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Lobby } from "@/components/lobby";
import { AIAdvisor } from "@/components/ai-advisor";
import { GameInstructions } from "@/components/game-instructions";
import { SetupTimer } from "@/components/setup-timer";
import { recordGameResult } from "@/lib/player-stats";


type GameStatus = "waiting" | "setup" | "playing" | "finished";
type BotDifficulty = 'normal' | 'hard';
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
  botDifficulty: BotDifficulty | null;
  hostId: string | null;
  playerTimes: { [key: string]: number }; // Total time in seconds for each player
  turnStartTime: any | null; // Firestore server timestamp
};

const INITIAL_BOARD = Array(25).fill(null);
const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1);
const LINES_TO_WIN = 5;
const TOTAL_GAME_TIME = 300; // 5 minutes in seconds
const TURN_TIME_LIMIT = 15; // 15 seconds

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [playerBoard, setPlayerBoard] = useState<(number | null)[]>(INITIAL_BOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const prevCompletedLines = useRef(0);
  const gameResultRecorded = useRef(false);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLocalPlayerId(currentUser.uid);
      } else {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please sign in to join a game." });
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  const localPlayer = gameState?.players?.[localPlayerId || ''];
  const otherPlayers = Object.values(gameState?.players || {}).filter(p => p.id !== localPlayerId);

  // Effect to subscribe to game state changes
  useEffect(() => {
    if (!gameId || !user) return;

    const gameRef = doc(firestore, "games", gameId);
    
    const unsubscribe = onSnapshot(gameRef, async (docSnap) => {
      if (!docSnap.exists()) {
        toast({ variant: "destructive", title: "Game not found" });
        router.push("/");
        return;
      }
      
      const gameData = docSnap.data() as GameState;
      
      // Auto-join the user if they are authenticated but not yet in the player list
      if (user.uid && !gameData.players[user.uid] && gameData.status === 'waiting') {
        const playerCount = Object.keys(gameData.players).length;
        if (playerCount < gameData.maxPlayers) {
            handleJoinGame();
        }
      }

      if (gameData.status === 'finished' && gameData.winner && !gameResultRecorded.current && localPlayerId) {
        const didIWin = gameData.winner === localPlayerId;
        const didILose = !didIWin && gameData.winner !== 'DRAW' && Object.keys(gameData.players).includes(localPlayerId);

        if (didIWin) {
          await recordGameResult(localPlayerId, 'win');
        } else if (didILose) {
          await recordGameResult(localPlayerId, 'loss');
        } else if (gameData.winner === 'DRAW') {
          await recordGameResult(localPlayerId, 'draw');
        }
        gameResultRecorded.current = true;
      }

      setGameState(gameData);
      setIsLoading(false);

    }, (error) => {
      console.error("Firestore snapshot error:", error);
      toast({ variant: "destructive", title: "Connection Error"});
      setIsLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, router, toast, user]);

  // Effect to check if all players are ready and start the game
  useEffect(() => {
    if (gameState?.status === 'setup') {
        const botPlayer = Object.values(gameState.players).find(p => p.isBot);
        // If there's a bot and it's not ready, make it ready.
        if (botPlayer && !botPlayer.isBoardReady) {
            const botBoard = [...ALL_NUMBERS].sort(() => 0.5 - Math.random()).slice(0, 25);
            const gameRef = doc(firestore, "games", gameId);
            updateDoc(gameRef, {
                [`players.${botPlayer.id}.board`]: botBoard,
                [`players.${botPlayer.id}.isBoardReady`]: true,
            });
            return; 
        }

        const allPlayersReady = Object.values(gameState.players).every(p => p.isBoardReady);
        if (allPlayersReady && Object.values(gameState.players).length > 0) {
            const gameRef = doc(firestore, "games", gameId);
            const playerIds = Object.keys(gameState.players);
            const startingPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            
            updateDoc(gameRef, {
                status: 'playing',
                currentTurn: startingPlayerId,
                calledNumbers: [],
                turnStartTime: serverTimestamp(),
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


  // Effect for turn timers (both bot and human)
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !gameState.currentTurn) {
        if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
        return;
    }

    const { currentTurn, turnStartTime, isBotGame } = gameState;
    const botPlayer = Object.values(gameState.players).find(p => p.isBot);

    // Bot's Turn
    if (isBotGame && botPlayer && currentTurn === botPlayer.id) {
        if (turnTimerRef.current) clearTimeout(turnTimerRef.current); // Clear any existing timers
        turnTimerRef.current = setTimeout(() => {
            const botMove = getBotMove(
                botPlayer.board as number[],
                localPlayer!.board as number[],
                gameState.calledNumbers,
                ALL_NUMBERS,
                gameState.botDifficulty || 'normal'
            );

            if (botMove.shouldCallBingo) {
                updateDoc(doc(firestore, "games", gameId), { status: 'finished', winner: botPlayer.id });
            } else if (botMove.chosenNumber) {
                handleCallNumber(botMove.chosenNumber, botPlayer.id);
            }
        }, 1500); // Bot thinks for 1.5 seconds
        return;
    }

    // Human Player's Turn
    if (currentTurn === localPlayerId && turnStartTime) {
        const handleTimeout = () => {
            if (!gameState) return; // Game state might have changed
            toast({
                variant: 'destructive',
                title: "Time's up!",
                description: 'A random number was called for you.',
            });
            const availableNumbers = ALL_NUMBERS.filter(n => !gameState.calledNumbers.includes(n));
            const randomMove = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            handleCallNumber(randomMove, localPlayerId);
        };
        
        const startTime = (turnStartTime.toDate() as Date).getTime();
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = TURN_TIME_LIMIT - elapsed;

        if (remaining <= 0) {
            handleTimeout();
        } else {
            if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
            turnTimerRef.current = setTimeout(handleTimeout, remaining * 1000);
        }
    }

    return () => {
      if (turnTimerRef.current) {
        clearTimeout(turnTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.status, gameState?.currentTurn, gameId, localPlayerId]);

  // Effect for chess-style clock
  useEffect(() => {
    if (gameState?.status !== 'playing') return;

    const interval = setInterval(async () => {
        if (!gameState || !gameState.currentTurn || !gameState.turnStartTime) return;
        
        const gameRef = doc(firestore, "games", gameId);
        const currentPlayerId = gameState.currentTurn;
        
        const startTime = (gameState.turnStartTime.toDate() as Date).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);

        const newTime = Math.max(0, (gameState.playerTimes[currentPlayerId] || TOTAL_GAME_TIME) - elapsedSeconds);

        if (newTime <= 0) {
            const winnerId = Object.keys(gameState.players).find(id => id !== currentPlayerId);
            await updateDoc(gameRef, {
                status: 'finished',
                winner: winnerId,
                [`playerTimes.${currentPlayerId}`]: 0,
            });
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, gameId]);


  const handleJoinGame = async () => {
      if (!localPlayerId || !gameState || isJoining || (localPlayerId && gameState.players[localPlayerId]) || !user) return;
      
      const playerCount = Object.keys(gameState.players).length;
      if (playerCount >= gameState.maxPlayers) {
          toast({ variant: "destructive", title: "Game is full"});
          return;
      }

      setIsJoining(true);
      try {
          const gameRef = doc(firestore, "games", gameId);
          const newPlayer: Player = {
              id: localPlayerId,
              name: user.displayName || 'Anonymous Player',
              board: [],
              isBoardReady: false,
              isBot: false,
          };
          
          await updateDoc(gameRef, { 
              [`players.${localPlayerId}`]: newPlayer,
              [`playerTimes.${localPlayerId}`]: TOTAL_GAME_TIME,
           });

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
    
    // Update player time
    const startTime = (gameState.turnStartTime.toDate() as Date).getTime();
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const remainingTime = Math.max(0, gameState.playerTimes[callerId] - elapsedSeconds);

    if (newCalledNumbers.length === ALL_NUMBERS.length) {
      await updateDoc(gameRef, {
        status: 'finished',
        winner: 'DRAW',
        calledNumbers: arrayUnion(num)
      });
    } else {
      await updateDoc(gameRef, {
        calledNumbers: arrayUnion(num),
        currentTurn: nextPlayerId,
        [`playerTimes.${callerId}`]: remainingTime,
        turnStartTime: serverTimestamp(),
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

  if (isLoading || !gameState || !localPlayerId || !user) {
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

        return (
          <GameBoard
            playerBoard={localPlayer.board}
            calledNumbers={gameState.calledNumbers}
            onCallNumber={(num) => handleCallNumber(num, localPlayerId)}
            onBingoCall={handleBingoCall}
            currentTurnId={gameState.currentTurn}
            localPlayerId={localPlayerId}
            allPlayers={gameState.players}
            allNumbers={ALL_NUMBERS}
            completedLines={completedLines}
            linesToWin={LINES_TO_WIN}
            playerTimes={gameState.playerTimes}
            turnStartTime={gameState.turnStartTime}
            turnTimeLimit={TURN_TIME_LIMIT}
          />
        );
      
      case "finished":
        const winnerPlayer = gameState.players[gameState.winner || ''];
        return (
            <GameOverDialog
                isOpen={true}
                winnerName={gameState.winner === localPlayerId ? 'You' : (gameState.winner === 'DRAW' ? null : winnerPlayer?.name || 'Opponent')}
                isPlayerWinner={gameState.winner === localPlayerId}
                onGoToLobby={() => router.push('/')}
            />
        );

      default:
        return <p>Unknown game state.</p>;
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-background dark:bg-gray-900">
       <div className="w-full max-w-6xl mx-auto">
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
