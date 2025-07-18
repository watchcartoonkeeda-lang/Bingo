
// src/lib/player-stats.ts
import { firestore } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, Timestamp } from "firebase/firestore";
import {
  isSameDay,
  isSameWeek,
  isSameMonth,
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

        const updates: { [key: string]: any } = {};

        if (result === 'win') {
            updates.score = increment(1);
            updates.lastWinTimestamp = serverTimestamp();
            
            // Handle streak updates
            let dailyWins = playerData.dailyWins || 0;
            let weeklyWins = playerData.weeklyWins || 0;
            let monthlyWins = playerData.monthlyWins || 0;

            if (lastWinDate && isSameDay(now, lastWinDate)) {
                updates.dailyWins = dailyWins + 1;
            } else {
                updates.dailyWins = 1; // Reset or start new daily streak
            }

            if (lastWinDate && isSameWeek(now, lastWinDate)) {
                updates.weeklyWins = weeklyWins + 1;
            } else {
                updates.weeklyWins = 1; // Reset or start new weekly streak
            }
            
            if (lastWinDate && isSameMonth(now, lastWinDate)) {
                updates.monthlyWins = monthlyWins + 1;
            } else {
                updates.monthlyWins = 1; // Reset or start new monthly streak
            }
        } else {
            // On a loss or draw, reset all win streaks. Score is unaffected.
            updates.dailyWins = 0;
            updates.weeklyWins = 0;
            updates.monthlyWins = 0;
        }
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(playerDocRef, updates);
        }

    } catch (error) {
        console.error("Error recording game result:", error);
    }
};
