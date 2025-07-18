// src/components/lobby.tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Loader2, CheckCircle, Hourglass, Bot, User } from "lucide-react";

interface Player {
  id: string;
  name: string;
  isBoardReady: boolean;
  isBot: boolean;
}

interface LobbyProps {
  gameId: string;
  players: Player[];
  hostId: string | null;
  localPlayerId: string | null;
  onStartGame: () => void;
  isBotGame: boolean;
}

export function Lobby({ gameId, players, hostId, localPlayerId, onStartGame, isBotGame }: LobbyProps) {
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

  const isHost = localPlayerId === hostId;
  const canStartGame = isBotGame ? players.every(p => p.isBoardReady) : players.length >= 2 && players.every(p => p.isBoardReady);
  const maxPlayers = isBotGame ? 2 : 4;


  const getStartButtonText = () => {
    if (players.length < 2 && !isBotGame) {
      return "Waiting for another player...";
    }
    if (!players.every(p => p.isBoardReady)) {
      return "Waiting for players to be ready";
    }
    return "Start Game";
  };


  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-center">Game Lobby</CardTitle>
        <CardDescription className="text-center">
          {isBotGame ? "Get your board ready to play against the bot!" : "Share this game with friends to begin. The host will start the game when everyone is ready."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {!isBotGame && (
            <>
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
            </>
        )}
        <div className="w-full">
            <h3 className="font-semibold flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5" /> Players ({players.length}/{maxPlayers})
            </h3>
            <ul className="space-y-2">
                {players.map(p => (
                    <li key={p.id} className="flex items-center justify-between bg-secondary p-3 rounded-md">
                        <div className="flex items-center gap-2 font-semibold">
                          {p.isBot ? <Bot className="h-5 w-5 text-primary" /> : <User className="h-5 w-5" />}
                          {p.name} {p.id === hostId && "(Host)"}
                        </div>
                        {p.isBoardReady ? 
                          <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="h-4 w-4" /> Ready</span> : 
                          <span className="flex items-center gap-1 text-muted-foreground text-xs"><Hourglass className="h-4 w-4" /> Setting up...</span>
                        }
                    </li>
                ))}
                {players.length < maxPlayers && !isBotGame &&(
                    <li className="flex items-center justify-center gap-2 text-muted-foreground p-2 rounded-md border-2 border-dashed">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Waiting for more players...
                    </li>
                )}
            </ul>
        </div>
        {isHost && (
          <Button onClick={onStartGame} disabled={!canStartGame} size="lg" className="w-full">
            {getStartButtonText()}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
