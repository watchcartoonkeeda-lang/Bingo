// src/components/lobby.tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
}

interface LobbyProps {
  gameId: string;
  players: Player[];
}

export function Lobby({ gameId, players }: LobbyProps) {
  const { toast } = useToast();
  const [joinLink, setJoinLink] = useState("");

  useState(() => {
    if (typeof window !== "undefined") {
      setJoinLink(`${window.location.origin}/game/${gameId}`);
    }
  });

  const copyLink = () => {
    navigator.clipboard.writeText(joinLink);
    toast({
      title: "Link Copied!",
      description: "You can now share the link with a friend.",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-center">Waiting for Player</CardTitle>
        <CardDescription className="text-center">
          Share this game with a friend to begin.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="p-4 bg-white rounded-lg">
          <QRCode value={joinLink} size={160} />
        </div>
        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-center">Or share this link:</p>
          <div className="flex items-center gap-2">
            <Input value={joinLink} readOnly />
            <Button variant="outline" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="w-full">
            <h3 className="font-semibold flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5" /> Players ({players.length}/2)
            </h3>
            <ul className="space-y-2">
                {players.map(p => (
                    <li key={p.id} className="flex items-center justify-center bg-secondary p-2 rounded-md">
                        {p.name}
                    </li>
                ))}
                {players.length < 2 && (
                    <li className="flex items-center justify-center gap-2 text-muted-foreground p-2 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Waiting for opponent...
                    </li>
                )}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}
