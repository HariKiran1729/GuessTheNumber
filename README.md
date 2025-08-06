# 🎯 Guess The Number - 2 Player Game

A fun, interactive 2-player number guessing game that can be played online. One player creates a room and sets a secret 4-digit number, while the other player tries to guess it within 15 attempts.

## 🎮 How to Play

### For Player 1 (Host):
1. Click "Create Room"
2. Share the generated 7-letter room code with Player 2
3. Enter a 4-digit secret number (all digits must be different)
4. Wait for Player 2 to join and start guessing

### For Player 2 (Guesser):
1. Click "Join Room"
2. Enter the room code provided by Player 1
3. Start guessing the 4-digit number
4. You have 15 tries to guess correctly
5. Each guess will show:
   - Number of correct digits
   - Number of digits in correct position

### Example:
- Secret number: `1729`
- Your guess: `7320`
- Result: `2 correct numbers, 1 correct position`
  - Correct numbers: 7 and 2 are in the secret number
  - Correct position: Only 7 is in the correct position (2nd digit)

## 🚀 Deployment to GitHub Pages

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `guess-the-number-game`
3. Make sure it's set to **Public**

### Step 2: Upload Files
Upload these files to your repository:
- `index.html` - Main game interface
- `script.js` - Game logic and functionality
- `styles.css` - Modern styling
- `README.md` - This file (optional)

### Step 3: Enable GitHub Pages
1. Go to your repository settings
2. Scroll down to "Pages" section
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### Step 4: Access Your Game
- Your game will be available at: `https://[your-username].github.io/[repository-name]`
- It may take a few minutes for the site to become available

## 🛠️ Technical Features

- **Real-time multiplayer**: Uses localStorage for communication between players
- **Room-based gameplay**: Secure 7-letter room codes
- **Input validation**: Ensures proper number format and no repeated digits
- **Responsive design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations
- **Game history**: Shows all previous guesses and results

## 📱 Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🎯 Game Rules

1. **Secret Number**: Must be exactly 4 digits with no repeating digits
2. **Guesses**: Players have 15 attempts to guess correctly
3. **Win Condition**: Guess the exact number in correct order
4. **Feedback**: Each guess shows correct numbers and correct positions

## 🔧 Local Development

To run locally:
1. Download all files to a folder
2. Open `index.html` in your web browser
3. The game will work locally but players need to be on the same computer

Enjoy playing! 🎉 