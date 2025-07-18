
// src/lib/player-stats.ts
import { firestore } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, Timestamp } from "firebase/firestore";
import {
  isSameDay,
  isSameWeek,
  isSameMonth,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from "date-fns";

type PlayerProfile = {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
};

type GameResultType = "win" | "loss" | "draw";

// Create or update a player's profile information
export const updateUserProfile = async ({ uid, displayName, photoURL }: PlayerProfile) => {
    if (!uid) return;
    try {
        const playerDocRef = doc(firestore, "players", uid);
        const playerDoc = await getDoc(playerDocRef);

        const profileData = {
            displayName: displayName || "Anonymous Player",
            photoURL: photoURL || null,
            lastSeen: serverTimestamp(),
        };

        if (playerDoc.exists()) {
            await updateDoc(playerDocRef, profileData);
        } else {
            // First time seeing this player, create their record with initial stats
            await setDoc(playerDocRef, {
                ...profileData,
                score: 0,
                dailyWins: 0,
                weeklyWins: 0,
                monthlyWins: 0,
                lastWinTimestamp: null,
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error updating player profile:", error);
    }
};

// Record the result of a game and update player stats accordingly
export const recordGameResult = async (playerId: string, result: GameResultType) => {
    if (!playerId || playerId.startsWith('bot_')) return; 

    const playerDocRef = doc(firestore, "players", playerId);
    
    try {
        const playerDoc = await getDoc(playerDocRef);
        if (!playerDoc.exists()) {
            console.warn(`Player document for ${playerId} not found. Cannot record result.`);
            return;
        }

        const playerData = playerDoc.data();
        const now = new Date();
        const lastWinDate = (playerData.lastWinTimestamp as Timestamp)?.toDate();

        let dailyWins = playerData.dailyWins || 0;
        let weeklyWins = playerData.weeklyWins || 0;
        let monthlyWins = playerData.monthlyWins || 0;
        
        // Reset streaks if the new win is in a different period
        if (lastWinDate) {
            if (!isSameDay(now, lastWinDate)) dailyWins = 0;
            if (!isSameWeek(now, lastWinDate)) weeklyWins = 0;
            if (!isSameMonth(now, lastWinDate)) monthlyWins = 0;
        }

        const updates: { [key: string]: any } = {};

        if (result === 'win') {
            updates.score = increment(1);
            updates.dailyWins = dailyWins + 1;
            updates.weeklyWins = weeklyWins + 1;
            updates.monthlyWins = monthlyWins + 1;
            updates.lastWinTimestamp = serverTimestamp();
        } else if (result === 'loss') {
            // Deduct 2 points, but don't go below 0
            const newScore = Math.max(0, (playerData.score || 0) - 2);
            updates.score = newScore;
        }
        // No score change for a draw

        await updateDoc(playerDocRef, updates);

    } catch (error) {
        console.error("Error recording game result:", error);
    }
};
