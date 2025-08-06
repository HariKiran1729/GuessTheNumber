# 🔥 Firebase Setup for True Multiplayer

## Why Firebase?
Firebase enables real cross-device multiplayer where players can join from different computers, phones, and browsers anywhere in the world!

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `guess-number-game`
4. Disable Google Analytics (not needed)
5. Click "Create project"

## Step 2: Setup Realtime Database

1. In your Firebase project, click "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select your preferred location
5. Click "Done"

## Step 3: Get Your Firebase Config

1. Click the gear icon → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon (`</>`)
4. Register app name: `guess-number-game`
5. Copy the config object that looks like:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Step 4: Update Your Code

1. Open `script-firebase.js`
2. Replace the demo config at the top with your real config:

```javascript
// Replace this demo config with your real Firebase config
const firebaseConfig = {
    // Paste your real config here
};
```

## Step 5: Update HTML File

Change your script reference in `index.html`:
```html
<!-- Change this line: -->
<script src="script.js"></script>

<!-- To this: -->
<script src="script-firebase.js"></script>
```

## Step 6: Deploy to GitHub Pages

Upload these files to your GitHub repository:
- `index.html` (updated with Firebase script reference)
- `script-firebase.js` (with your Firebase config)
- `styles.css`
- `README.md`
- This file: `firebase-setup.md`

## Step 7: Test Cross-Device Multiplayer

1. Open your GitHub Pages URL on Computer 1
2. Create a room and get the 7-letter code
3. Open the same URL on Computer 2 (different device/browser)
4. Join using the room code
5. Play from anywhere in the world! 🌍

## Security Rules (Optional)

To secure your database, go to Realtime Database → Rules and use:

```json
{
  "rules": {
    "games": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['roomCode', 'secretNumber', 'hostId'])"
      }
    }
  }
}
```

## Troubleshooting

**"Permission denied"**: Check your database rules
**"Firebase not found"**: Make sure Firebase scripts are loaded
**"Room not found"**: Ensure both players use the exact same URL

## Benefits of Firebase Version

✅ **True Multiplayer**: Works across different devices and locations  
✅ **Real-time Updates**: Instant synchronization  
✅ **Reliable**: Google's infrastructure  
✅ **Free Tier**: 100GB bandwidth/month  
✅ **Scalable**: Supports many concurrent games  

Your game will now work for players anywhere in the world! 🎉 