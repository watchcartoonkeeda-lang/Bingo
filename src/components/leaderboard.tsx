
"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Medal, Trophy, TrendingUp, Calendar, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, type User } from "firebase/auth";

interface PlayerStat {
  id: string;
  displayName: string;
  photoURL: string | null;
  score: number;
  dailyWins?: number;
  weeklyWins?: number;
  monthlyWins?: number;
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
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<PlayerStat | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const playersRef = collection(firestore, "players");
    const q = query(playersRef, orderBy("score", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const players: PlayerStat[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        players.push({ 
            id: doc.id, 
            displayName: data.displayName || 'Player',
            photoURL: data.photoURL,
            score: data.score || 0,
        });
      });
      setLeaderboard(players);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
      toast({ variant: 'destructive', title: 'Could not load leaderboard' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    if (!user) {
        setUserStats(null);
        return;
    };

    const playerDocRef = doc(firestore, "players", user.uid);
    const unsubscribe = onSnapshot(playerDocRef, (doc) => {
        if(doc.exists()) {
            const data = doc.data();
            setUserStats({
                id: doc.id,
                displayName: data.displayName,
                photoURL: data.photoURL,
                score: data.score,
                dailyWins: data.dailyWins,
                weeklyWins: data.weeklyWins,
                monthlyWins: data.monthlyWins,
            })
        }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
    {userStats && (
        <Card className="bg-primary/5">
            <CardHeader>
                <CardTitle>Your Streaks</CardTitle>
                <CardDescription>Your current win streaks for different periods.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="flex items-center justify-center gap-2">
                        <Sun className="h-5 w-5 text-yellow-500" />
                        <h4 className="font-semibold">Daily</h4>
                    </div>
                    <p className="text-2xl font-bold">{userStats.dailyWins || 0}</p>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold">Weekly</h4>
                    </div>
                    <p className="text-2xl font-bold">{userStats.weeklyWins || 0}</p>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-2">
                         <TrendingUp className="h-5 w-5 text-green-500" />
                        <h4 className="font-semibold">Monthly</h4>
                    </div>
                    <p className="text-2xl font-bold">{userStats.monthlyWins || 0}</p>
                </div>
            </CardContent>
        </Card>
    )}
    <Card>
      <CardHeader>
        <CardTitle>Top Players</CardTitle>
        <CardDescription>The all-time leaders of BingoBoardBlitz!</CardDescription>
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
                <div className="font-bold text-lg text-primary">{player.score} pts</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
