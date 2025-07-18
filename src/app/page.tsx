
// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { firestore, auth, signInWithGoogle, onAuthStateChanged, signOutUser, type User as FirebaseUser } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { Loader2, AlertTriangle, User, Bot, ChevronDown, LogIn, LogOut } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "firebase/auth";
import { Leaderboard } from "@/components/leaderboard";
import { PersonalStreaks } from "@/components/personal-streaks";
import { updateUserProfile } from "@/lib/player-stats";

type GameMode = 'friends' | 'bot';
type BotDifficulty = 'normal' | 'hard';
type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export default function Home() {
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<any>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const gameInfoToCreate = useRef<{ mode: GameMode; difficulty?: BotDifficulty } | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPlayerName(currentUser.displayName || "");
        setAuthStatus("authenticated");
        // Also update their profile in Firestore on login
        updateUserProfile({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
        });
      } else {
        setUser(null);
        setAuthStatus("unauthenticated");
      }
    }, (error) => {
      setAuthStatus("error");
      setAuthError(error);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle setting the user and auth status
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
          // The user cancelled the sign-in. onAuthStateChanged will ensure
          // the state remains "unauthenticated". No state change needed here.
          return;
      }
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
      });
      setAuthStatus("error");
      setAuthError(error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      // onAuthStateChanged will handle the rest
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Failed", description: "Could not sign out." });
    }
  };


  const handleCreateGameRequest = (mode: GameMode, difficulty?: BotDifficulty) => {
    gameInfoToCreate.current = { mode, difficulty };
    if (user?.displayName) {
        setPlayerName(user.displayName);
        createNewGame();
    } else {
        setShowNameDialog(true);
    }
  }

  const createNewGame = async () => {
    if (!gameInfoToCreate.current || !user) {
        toast({
            variant: "destructive",
            title: "Could not create game.",
            description: "An authenticated user is required.",
        });
        return;
    }

    if (!playerName.trim() && !user.displayName) {
      setShowNameDialog(true);
      return;
    }

    setIsGameLoading(true);
    setShowNameDialog(false);

    let finalPlayerName = playerName.trim();
    
    // Update profile if name is new or different
    if (finalPlayerName && user.displayName !== finalPlayerName) {
        try {
            await updateProfile(user, { displayName: finalPlayerName });
            await updateUserProfile({ uid: user.uid, displayName: finalPlayerName, photoURL: user.photoURL });
        } catch (error) {
            console.error("Error updating user profile:", error);
            toast({
                variant: "destructive",
                title: "Profile Update Failed",
                description: "Could not save your new player name.",
            });
            setIsGameLoading(false);
            return;
        }
    } else if (!finalPlayerName && user.displayName) {
        finalPlayerName = user.displayName;
    }
    
    const { mode, difficulty } = gameInfoToCreate.current;
    const isBotGame = mode === 'bot';

    try {
      const gameId = Math.random().toString(36).substring(2, 9);
      const gameRef = doc(firestore, "games", gameId);

      const hostPlayer = {
        id: user.uid,
        name: finalPlayerName,
        board: [],
        isBoardReady: false,
        isBot: false,
      };
      
      const players = {
        [user.uid]: hostPlayer,
      };

      if(isBotGame) {
        const botId = 'bot_player_1';
        players[botId] = {
           id: botId,
           name: `BingoBot (${difficulty})`,
           board: [],
           isBoardReady: false, 
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
        botDifficulty: difficulty || null,
        hostId: user.uid,
      });
      
      router.push(`/game/${gameId}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({
        variant: "destructive",
        title: "Error Creating Game",
        description: "Could not create a new game. Please check your Firestore Security Rules in the README.",
      });
      setAuthStatus("error"); 
      setAuthError({ code: 'firestore/permission-denied' });
      setIsGameLoading(false);
    }
  };
  
  const renderAuthError = () => {
    const isUnauthorizedDomain = authError?.code === 'auth/unauthorized-domain';
    return (
      <Card className="w-full max-w-2xl bg-destructive/10 border-destructive">
        <CardHeader className="flex-row items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-destructive">Project Configuration Needed</CardTitle>
            <CardDescription className="text-destructive/80">
              Your app is failing to connect to Firebase. This is usually due to a misconfiguration.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isUnauthorizedDomain && (
            <div className="space-y-2 p-4 rounded-md bg-destructive/20">
              <h3 className="font-semibold">Error: Unauthorized Domain</h3>
              <p className="text-sm text-destructive/80">
                Your Firebase project is not configured to allow sign-ins from `localhost`.
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                <li>Go to your <span className="font-bold">Firebase Console</span>.</li>
                <li>Navigate to <span className="font-bold">Authentication &gt; Settings</span> tab.</li>
                <li>Under <span className="font-bold">Authorized domains</span>, click <span className="font-bold">Add domain</span>.</li>
                <li>Enter <span className="font-bold">`localhost`</span> and click Add.</li>
              </ol>
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-semibold">Check: Is Google Sign-In Enabled?</h3>
            <p className="text-sm text-destructive/80">This app uses Google Sign-In. You must enable it in your Firebase project.</p>
             <ol className="list-decimal list-inside space-y-1 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                <li>Go to <span className="font-bold">Authentication &gt; Sign-in method</span>.</li>
                <li>Find <span className="font-bold">"Google"</span> and ensure it's enabled.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Check: Firestore Security Rules</h3>
            <p className="text-sm text-destructive/80">Your database needs rules to allow authenticated users to create games and for the leaderboard to function.</p>
             <ol className="list-decimal list-inside space-y-1 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                <li>Go to <span className="font-bold">Firestore Database &gt; Rules</span>.</li>
                <li>Ensure the rules allow writes for authenticated users (see README).</li>
            </ol>
          </div>
           <p className="text-sm font-semibold text-center pt-4">After fixing the configuration, refresh this page.</p>
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
    switch (authStatus) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Connecting...</p>
          </div>
        );

      case 'error':
        return renderAuthError();

      case 'unauthenticated':
        return (
          <div className="text-center space-y-12">
              <div className="space-y-4">
                <header className="flex items-center justify-center mb-8">
                  <AppLogo />
                </header>
                <h2 className="text-2xl font-bold mb-4">Welcome to Multiplayer Bingo!</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Sign in with Google to challenge friends or our AI bot and climb the leaderboard!
                </p>
                <Button onClick={handleSignIn} size="lg">
                  <LogIn className="mr-2" />
                  Sign in with Google
                </Button>
              </div>
              <Leaderboard showAllTimeOnly={true} />
          </div>
        );

      case 'authenticated':
        return (
          <div className="w-full max-w-xl text-center space-y-12">
            <div className="space-y-4">
               <header className="flex items-center justify-between w-full mx-auto">
                 <AppLogo />
                 <Button onClick={handleSignOut} variant="ghost" size="sm">
                   <LogOut className="mr-2 h-4 w-4" />
                   Log Out
                 </Button>
               </header>
              <h2 className="text-2xl font-bold mb-4">Welcome, {user?.displayName || 'Player'}!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Challenge your friends in a real-time bingo showdown or test your skills against our smart AI opponent.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => handleCreateGameRequest('friends')} disabled={isGameLoading} size="lg" className="w-full sm:w-auto">
                  {isGameLoading && gameInfoToCreate.current?.mode === 'friends' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2"/> }
                  Play with Friends
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      <Bot className="mr-2"/>
                      Play with Bot
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleCreateGameRequest('bot', 'normal')}>
                      vs Normal Bot
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateGameRequest('bot', 'hard')}>
                      vs Hard Bot
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="space-y-8">
              <PersonalStreaks />
              <Leaderboard />
            </div>
          </div>
        );
    }
  };


  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
      {renderContent()}

      <AlertDialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Your Name</AlertDialogTitle>
            <AlertDialogDescription>
              This name will be saved to your profile and will be visible to other players.
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
