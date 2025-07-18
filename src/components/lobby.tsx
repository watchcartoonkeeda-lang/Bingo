// src/components/lobby.tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Loader2, CheckCircle, Hourglass, Bot, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const canStartGame = players.length >= 2 && players.every(p => p.isBoardReady);
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
      <CardHeader className="text-center">
        <CardTitle>Game Lobby</CardTitle>
        <CardDescription>
          {isBotGame ? "Get your board ready to play against the bot!" : "Share this game with friends to begin. The host will start the game when everyone is ready."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isBotGame && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCode value={joinLink} size={128} />
            </div>
            <div className="w-full text-center">
              <p className="text-sm font-medium mb-2">Or share this link:</p>
              <div className="flex items-center gap-2">
                <Input value={joinLink} readOnly className="text-center"/>
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="w-full">
          <h3 className="font-semibold flex items-center justify-center gap-2 mb-4 text-lg">
            <Users className="h-5 w-5" /> Players ({players.length}/{maxPlayers})
          </h3>
          <ul className="space-y-3">
            {players.map(p => (
              <li key={p.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-3 font-semibold">
                  <Avatar>
                    <AvatarFallback>
                      {p.isBot ? <Bot /> : p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {p.name} {p.id === hostId && <span className="text-xs font-normal text-primary">(Host)</span>}
                </div>
                {p.isBoardReady ?
                  <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle className="h-4 w-4" /> Ready</span> :
                  <span className="flex items-center gap-1.5 text-xs text-amber-400"><Hourglass className="h-4 w-4" /> Setting up...</span>
                }
              </li>
            ))}
            {players.length < maxPlayers && !isBotGame && (
              <li className="flex items-center justify-center gap-2 text-muted-foreground p-3 rounded-lg border-2 border-dashed border-gray-700">
                <Loader2 className="h-4 w-4 animate-spin" />
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
