
// src/lib/player-stats.ts
import { firestore } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

type PlayerProfile = {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
};

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
                wins: 0,
                gamesPlayed: 0, // Example of another stat you could track
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error updating player profile:", error);
    }
};

// Increment a player's win count
export const recordWin = async (playerId: string) => {
    if (!playerId || playerId.startsWith('bot_')) return; // Don't record wins for bots
    
    try {
        const playerDocRef = doc(firestore, "players", playerId);
        const playerDoc = await getDoc(playerDocRef);

        if (playerDoc.exists()) {
            await updateDoc(playerDocRef, {
                wins: increment(1),
            });
        } else {
            // This case is unlikely if updateUserProfile is called on login, but as a fallback:
            console.warn(`Player document for ${playerId} not found. Creating new one.`);
            await setDoc(playerDocRef, {
                wins: 1,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error recording win:", error);
    }
};
