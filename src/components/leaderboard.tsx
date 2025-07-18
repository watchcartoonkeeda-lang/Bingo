
"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Medal, Trophy } from "lucide-react";

interface PlayerStat {
  id: string;
  displayName: string;
  photoURL: string | null;
  wins: number;
}

const getRankIcon = (rank: number) => {
    switch (rank) {
        case 0:
            return <Trophy className="h-5 w-5 text-yellow-500" />;
        case 1:
            return <Medal className="h-5 w-5 text-slate-400" />;
        case 2:
            return <Award className="h-5 w-5 text-yellow-700" />;
        default:
            return <span className="text-sm font-bold w-5 text-center">{rank + 1}</span>;
    }
};


export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<PlayerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const playersRef = collection(firestore, "players");
    const q = query(playersRef, orderBy("wins", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const players: PlayerStat[] = [];
      querySnapshot.forEach((doc) => {
        players.push({ id: doc.id, ...doc.data() } as PlayerStat);
      });
      setLeaderboard(players);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Top Players</CardTitle>
        <CardDescription>See who is leading the BingoBoardBlitz charts!</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
                </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground">No player data yet. Play a game to get on the board!</p>
        ) : (
          <ul className="space-y-4">
            {leaderboard.map((player, index) => (
              <li key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-6">{getRankIcon(index)}</div>
                    <Avatar>
                        <AvatarImage src={player.photoURL || undefined} alt={player.displayName} />
                        <AvatarFallback>{player.displayName?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{player.displayName}</span>
                </div>
                <div className="font-bold text-lg text-primary">{player.wins} wins</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
