# BingoBoardBlitz

This is a multiplayer bingo game built with Next.js, Firebase, and Genkit. It features real-time gameplay, customizable boards, and an AI-powered game advisor.

## Getting Started

To get this project up and running on your local machine, follow these steps.

### 1. Install Dependencies

First, install the necessary npm packages:

```bash
npm install
```

### 2. Set Up Firebase

This project requires a Firebase project to handle the backend, database, and authentication.

1.  **Create a Firebase Project**: If you don't have one already, go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

2.  **Create a Web App**:
    *   Inside your new project, click the `</>` icon to add a new Web App.
    *   Give it a nickname and click "Register app".
    *   You will be shown a `firebaseConfig` object. Keep this page open; you will need these values for the next step.

3.  **Enable Anonymous Authentication**:
    *   In the Firebase Console, go to **Authentication** (under the "Build" menu).
    *   Click the **"Sign-in method"** tab.
    *   Select **"Anonymous"** from the provider list, enable the toggle, and click **Save**.

4.  **Set Up Firestore Database**:
    *   In the Firebase Console, go to **Firestore Database** (under the "Build" menu).
    *   Click **"Create database"**.
    *   Start in **production mode** (this provides more secure default rules). Choose a location and click **Enable**.
    *   Navigate to the **Rules** tab and replace the entire content with the following rules, then click **Publish**:
        ```
        rules_version = '2';

        service cloud.firestore {
          match /databases/{database}/documents {
            // Allow players to create, join, and play games if they are authenticated.
            match /games/{gameId} {
              allow read, write: if request.auth != null;
            }
          }
        }
        ```

### 3. Configure Environment Variables

The application uses environment variables to connect to your Firebase project.

1.  In the root of the project, create a new file named `.env`.
2.  Copy the content of `.env.example` into your new `.env` file.
3.  Fill in the values in `.env` using the `firebaseConfig` object from Step 2. All keys start with `NEXT_PUBLIC_`.

Your `.env` file should look like this:

```
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```

### 4. Run the Development Server

Once your environment variables are set, you can start the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result. You should now be able to create and play a new game.
