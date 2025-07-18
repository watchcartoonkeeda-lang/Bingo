
// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { firestore, authReadyPromise } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { Loader2, AlertTriangle, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type AuthStatus = "loading" | "authenticated" | "error";

export default function Home() {
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<any>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const gameModeToCreate = useRef<'bot' | 'friends' | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    authReadyPromise
      .then(() => setAuthStatus("authenticated"))
      .catch((error) => {
        setAuthStatus("error");
        setAuthError(error);
      });
  }, []);

  const handleCreateGameRequest = (mode: 'bot' | 'friends') => {
    gameModeToCreate.current = mode;
    setShowNameDialog(true);
  }

  const createNewGame = async () => {
    if (!playerName.trim() || !gameModeToCreate.current) {
        toast({
            variant: "destructive",
            title: "Player name is required.",
        });
        return;
    }
    
    setIsGameLoading(true);
    setShowNameDialog(false);
    
    const isBotGame = gameModeToCreate.current === 'bot';

    try {
      let localPlayerId = sessionStorage.getItem("playerId");
      if (!localPlayerId) {
        localPlayerId = `player_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem("playerId", localPlayerId);
      }

      const gameId = Math.random().toString(36).substring(2, 9);
      const gameRef = doc(firestore, "games", gameId);

      const hostPlayer = {
        id: localPlayerId,
        name: playerName,
        board: [],
        isBoardReady: false,
        isBot: false,
      };
      
      const players = {
        [localPlayerId]: hostPlayer,
      };

      if(isBotGame) {
        const botId = 'bot_player_1';
        players[botId] = {
           id: botId,
           name: 'BingoBot',
           board: [],
           isBoardReady: false, // Bot will be ready after setup
           isBot: true,
        };
      }


      await setDoc(gameRef, {
        id: gameId,
        status: "waiting",
        players: players,
        calledNumbers: [],
        currentTurn: null,
        winner: null,
        maxPlayers: isBotGame ? 2 : 4,
        isBotGame: isBotGame,
        hostId: localPlayerId,
      });
      
      router.push(`/game/${gameId}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({
        variant: "destructive",
        title: "Error Creating Game",
        description: "Could not create a new game. This is likely a Firestore Security Rules issue. Please check the instructions on the home page.",
      });
      setAuthStatus("error"); 
      setAuthError({ code: 'firestore/permission-denied' });
      setIsGameLoading(false);
    }
  };

  const renderContent = () => {
    if (authStatus === 'loading') {
      return (
         <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-muted-foreground">Connecting to server...</p>
         </div>
      );
    }

    if (authStatus === 'error') {
       return (
        <Card className="w-full max-w-2xl bg-destructive/10 border-destructive">
          <CardHeader className="flex-row items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <CardTitle className="text-destructive">Project Configuration Needed</CardTitle>
              <CardDescription className="text-destructive/80">
                Your app is failing to connect to Firebase. This is usually due to one of two reasons.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <h3 className="font-semibold">Step 1: Enable Anonymous Authentication</h3>
                <p className="text-sm text-destructive/80">Your app allows users to play without creating an account. This requires Anonymous Authentication to be enabled.</p>
                <ol className="list-decimal list-inside space-y-1 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                    <li>Go to your <span className="font-bold">Firebase Console</span>.</li>
                    <li>Navigate to <span className="font-bold">Authentication &gt; Sign-in method</span>.</li>
                    <li>Find <span className="font-bold">"Anonymous"</span> in the provider list and click it.</li>
                    <li><span className="font-bold">Enable</span> the toggle switch and click <span className="font-bold">Save</span>.</li>
                </ol>
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold">Step 2: Update Firestore Security Rules</h3>
                <p className="text-sm text-destructive/80">Your Firestore database needs a security rule to allow authenticated users to create and join games.</p>
                 <ol className="list-decimal list-inside space-y-1 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                    <li>Go to your <span className="font-bold">Firebase Console</span>.</li>
                    <li>Navigate to <span className="font-bold">Firestore Database &gt; Rules</span>.</li>
                    <li>Replace the entire content with the rules below and click <span className="font-bold">Publish</span>.</li>
                </ol>
                <pre className="mt-2 text-xs bg-black/50 p-4 rounded-md overflow-x-auto">
                  <code>
{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow players to create, join, and play games if they are authenticated.
    match /games/{gameId} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                  </code>
                </pre>
            </div>
             <p className="text-sm font-semibold text-center pt-4">After completing both steps, refresh this page.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="text-center">
        <header className="flex items-center justify-center mb-8">
          <AppLogo />
        </header>
        <h2 className="text-2xl font-bold mb-4">Welcome to Multiplayer Bingo!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Challenge your friends in a real-time bingo showdown or test your skills against our smart AI opponent.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => handleCreateGameRequest('friends')} disabled={isGameLoading} size="lg" className="w-full sm:w-auto">
            {isGameLoading && gameModeToCreate.current === 'friends' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2"/> }
            Play with Friends
          </Button>
          <Button onClick={() => handleCreateGameRequest('bot')} disabled={isGameLoading} size="lg" variant="secondary" className="w-full sm:w-auto">
            {isGameLoading && gameModeToCreate.current === 'bot' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2"/>}
            Play with Bot
          </Button>
        </div>
      </div>
    );
  };


  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
      {renderContent()}

      <AlertDialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Your Name</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your name to start the game. This will be visible to other players.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="player-name">Player Name</Label>
            <Input
              id="player-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Bingo Champion"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={createNewGame} disabled={!playerName.trim()}>
              {isGameLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}
