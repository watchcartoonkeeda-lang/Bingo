
// src/components/lobby.tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Loader2, CheckCircle, Hourglass, Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  onJoinGame: () => void;
  isJoining: boolean;
  isBotGame: boolean;
}

export function Lobby({ gameId, players, hostId, localPlayerId, onStartGame, onJoinGame, isJoining, isBotGame }: LobbyProps) {
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
  const localPlayerIsInGame = players.some(p => p.id === localPlayerId);
  const canStartGame = isHost && players.length >= 2;
  const maxPlayers = isBotGame ? 2 : 4;


  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle>Game Lobby</CardTitle>
        <CardDescription>
          {isBotGame ? "Get your board ready to play against the bot!" : (localPlayerIsInGame ? "Share this game with friends. The host will start when ready." : "Join the game to begin!")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isBotGame && localPlayerIsInGame && (
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
                {/* Status indicator is less important now, but can be kept for flavor */}
                <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle className="h-4 w-4" /> Joined</span>
              </li>
            ))}
            {players.length < maxPlayers && !isBotGame && (
              <li className="flex items-center justify-center gap-2 text-muted-foreground p-3 rounded-lg border-2 border-dashed border-gray-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for {maxPlayers - players.length} more player(s)...
              </li>
            )}
          </ul>
        </div>
        {localPlayerIsInGame ? (
             isHost && !isBotGame && (
                <Button onClick={onStartGame} disabled={!canStartGame} size="lg" className="w-full">
                    {canStartGame ? 'Start Game' : `Waiting for players... (${players.length}/${maxPlayers})`}
                </Button>
             )
        ) : (
          <Button onClick={onJoinGame} disabled={isJoining || players.length >= maxPlayers} size="lg" className="w-full">
            {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
            {players.length >= maxPlayers ? 'Game Full' : 'Join Game'}
          </Button>
        )}
        
      </CardContent>
    </Card>
  );
}

    