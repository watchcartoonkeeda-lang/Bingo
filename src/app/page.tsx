// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const createNewGame = async () => {
    setIsLoading(true);
    try {
      const gameId = Math.random().toString(36).substring(2, 9);
      const gameRef = doc(firestore, "games", gameId);

      // Create the document with the absolute minimum required data.
      await setDoc(gameRef, {
        id: gameId,
        status: "waiting",
        players: {}, // Firestore handles empty maps correctly.
        // Let other fields be added as needed.
      });

      // Then, update it with the server timestamps.
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
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dark:bg-gray-900">
      <div className="text-center">
        <header className="flex items-center justify-center mb-8">
          <AppLogo />
        </header>
        <h2 className="text-2xl font-bold mb-4">Welcome to Multiplayer Bingo!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Create a new game room and share the link with a friend to start playing in real-time.
        </p>
        <Button onClick={createNewGame} disabled={isLoading} size="lg">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Create New Game"
          )}
        </Button>
      </div>
    </main>
  );
}
