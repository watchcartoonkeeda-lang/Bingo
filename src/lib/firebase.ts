
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This promise will resolve with the user or reject with an error.
let authReadyPromise: Promise<User | null>;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
firestore = getFirestore(app);

authReadyPromise = new Promise((resolve, reject) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resolve(user);
    } else {
      signInAnonymously(auth)
        .then(userCredential => resolve(userCredential.user))
        .catch(error => {
          // This specific error is common during setup.
          if (error.code === 'auth/configuration-not-found') {
             console.error("Firebase Anonymous Auth not enabled. See instructions in the UI.");
          } else {
            console.error("Anonymous sign-in failed:", error);
          }
          reject(error);
        });
    }
  }, (error) => {
    // This handles errors during the initial auth state check.
    reject(error);
  });
});


export { app, auth, firestore, authReadyPromise };
