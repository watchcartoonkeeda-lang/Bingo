
// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestore, authReadyPromise } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";


type AuthStatus = "loading" | "authenticated" | "error";

export default function Home() {
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<any>(null);

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

  const createNewGame = async () => {
    setIsGameLoading(true);
    try {
      const gameId = Math.random().toString(36).substring(2, 9);
      const gameRef = doc(firestore, "games", gameId);

      await setDoc(gameRef, {
        id: gameId,
        status: "waiting",
        players: {},
        calledNumbers: [],
        currentTurn: null,
        winner: null,
      });

      await updateDoc(gameRef, {
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
      });
      
      router.push(`/game/${gameId}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create a new game. Please try again.",
      });
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
        <Card className="w-full max-w-lg bg-destructive/10 border-destructive">
          <CardHeader className="flex-row items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <CardTitle className="text-destructive">Configuration Needed</CardTitle>
              <CardDescription className="text-destructive/80">
                Anonymous sign-in is not enabled for this project.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
                <p>To fix this, please follow these steps:</p>
                <ol className="list-decimal list-inside space-y-2 pl-2 font-mono text-xs bg-black/50 p-4 rounded-md">
                    <li>Go to your <span className="font-bold">Firebase Console</span>.</li>
                    <li>Navigate to <span className="font-bold">Authentication &gt; Sign-in method</span>.</li>
                    <li>Find <span className="font-bold">"Anonymous"</span> in the provider list and click it.</li>
                    <li><span className="font-bold">Enable</span> the toggle switch and click <span className="font-bold">Save</span>.</li>
                    <li>Refresh this page.</li>
                </ol>
            </div>
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
          Create a new game room and share the link with a friend to start playing in real-time.
        </p>
        <Button onClick={createNewGame} disabled={isGameLoading} size="lg">
          {isGameLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Create New Game"
          )}
        </Button>
      </div>
    );
  };


  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
      {renderContent()}
    </main>
  );
}
