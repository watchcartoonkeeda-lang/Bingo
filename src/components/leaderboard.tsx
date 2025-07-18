
"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Medal, Trophy, Sun, Calendar, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton";

interface PlayerStat {
  id: string;
  displayName: string;
  photoURL: string | null;
  score: number;
  dailyWins?: number;
  weeklyWins?: number;
  monthlyWins?: number;
}

type LeaderboardType = 'score' | 'dailyWins' | 'weeklyWins' | 'monthlyWins';

interface LeaderboardProps {
    showAllTimeOnly?: boolean;
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

function LeaderboardList({ type }: { type: LeaderboardType }) {
    const [players, setPlayers] = useState<PlayerStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const playersRef = collection(firestore, "players");
        const q = query(playersRef, orderBy(type, "desc"), limit(5));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedPlayers: PlayerStat[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data[type] > 0) { // Only show players with a score/streak > 0
                    fetchedPlayers.push({
                        id: doc.id,
                        displayName: data.displayName || 'Player',
                        photoURL: data.photoURL,
                        score: data.score || 0,
                        dailyWins: data.dailyWins || 0,
                        weeklyWins: data.weeklyWins || 0,
                        monthlyWins: data.monthlyWins || 0,
                    });
                }
            });
            setPlayers(fetchedPlayers);
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching ${type} leaderboard:`, error);
            if (error.code === 'failed-precondition') {
                toast({ 
                    variant: 'destructive', 
                    title: 'Database Index Required', 
                    description: `The leaderboard requires a database index. Please check the developer console for a link to create it.`,
                    duration: 10000,
                });
                console.error("Firestore Index Error: This query requires a custom index. Please create it in your Firebase console. The link to create it should be in an error message in your browser's developer console.")
            } else {
                toast({ variant: 'destructive', title: `Could not load ${type} leaderboard` });
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [type, toast]);

    const getStatToDisplay = (player: PlayerStat) => {
        switch (type) {
            case 'dailyWins':
                return `${player.dailyWins} wins`;
            case 'weeklyWins':
                return `${player.weeklyWins} wins`;
            case 'monthlyWins':
                return `${player.monthlyWins} wins`;
            case 'score':
            default:
                return `${player.score} pts`;
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4 pt-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="w-full space-y-2">
                           <Skeleton className="h-4 w-3/4 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    if (players.length === 0) {
        return <p className="text-center text-muted-foreground pt-8">No player data yet for this category. Play a game to get on the board!</p>;
    }

    return (
        <ul className="space-y-4 pt-4">
            {players.map((player, index) => (
                <li key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-6">{getRankIcon(index)}</div>
                        <Avatar>
                            <AvatarImage src={player.photoURL || undefined} alt={player.displayName} />
                            <AvatarFallback>{player.displayName?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{player.displayName}</span>
                    </div>
                    <div className="font-bold text-lg text-primary">{getStatToDisplay(player)}</div>
                </li>
            ))}
        </ul>
    );
}

export function Leaderboard({ showAllTimeOnly = false }: LeaderboardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>{showAllTimeOnly ? 'All-Time Top Players' : 'Global Leaderboards'}</CardTitle>
                <CardDescription>
                    {showAllTimeOnly ? 'See who has the most wins of all time!' : "See who's dominating the game right now!"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {showAllTimeOnly ? (
                     <LeaderboardList type="score" />
                ) : (
                    <Tabs defaultValue="score">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                            <TabsTrigger value="score"><Trophy className="mr-2 h-4 w-4" />All-Time</TabsTrigger>
                            <TabsTrigger value="dailyWins"><Sun className="mr-2 h-4 w-4" />Daily</TabsTrigger>
                            <TabsTrigger value="weeklyWins"><Calendar className="mr-2 h-4 w-4" />Weekly</TabsTrigger>
                            <TabsTrigger value="monthlyWins"><Flame className="mr-2 h-4 w-4" />Monthly</TabsTrigger>
                        </TabsList>
                        <TabsContent value="score">
                            <LeaderboardList type="score" />
                        </TabsContent>
                        <TabsContent value="dailyWins">
                            <LeaderboardList type="dailyWins" />
                        </TabsContent>
                        <TabsContent value="weeklyWins">
                            <LeaderboardList type="weeklyWins" />
                        </TabsContent>
                        <TabsContent value="monthlyWins">
                            <LeaderboardList type="monthlyWins" />
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

    