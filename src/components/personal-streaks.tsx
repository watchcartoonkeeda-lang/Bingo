
"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Calendar, Flame } from "lucide-react";

interface PlayerStreakData {
  dailyWins: number;
  weeklyWins: number;
  monthlyWins: number;
}

export function PersonalStreaks() {
  const [user, setUser] = useState<User | null>(null);
  const [streaks, setStreaks] = useState<PlayerStreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsLoading(false);
        setStreaks(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const playerDocRef = doc(firestore, "players", user.uid);
    const unsubscribeSnap = onSnapshot(playerDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStreaks({
          dailyWins: data.dailyWins || 0,
          weeklyWins: data.weeklyWins || 0,
          monthlyWins: data.monthlyWins || 0,
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribeSnap();
  }, [user]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
            </CardContent>
        </Card>
    );
  }

  if (!streaks) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personal Streaks</CardTitle>
        <CardDescription>Keep winning to build up your streaks!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
            <StreakItem icon={Sun} label="Daily Wins" value={streaks.dailyWins} />
            <StreakItem icon={Calendar} label="Weekly Wins" value={streaks.weeklyWins} />
            <StreakItem icon={Flame} label="Monthly Wins" value={streaks.monthlyWins} />
        </div>
      </CardContent>
    </Card>
  );
}

function StreakItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number }) {
    return (
        <div className="p-4 bg-secondary/50 rounded-lg flex flex-col items-center justify-center gap-2">
            <Icon className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold">{value}</span>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
    )
}

    