// Firebase configuration - Replace with your real Firebase config
const firebaseConfig = {
    // REPLACE THIS ENTIRE OBJECT WITH YOUR REAL FIREBASE CONFIG
    // Copy from Firebase Console → Project Settings → Your apps → Web app config
    apiKey: "AIzaSyCwFNl72EByGwtHh9cPQ3dLGQS_JYtRWac",
    authDomain: "guess-number-multiplayer.firebaseapp.com",
    databaseURL: "https://guess-number-multiplayer-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "guess-number-multiplayer",
    storageBucket: "guess-number-multiplayer.firebasestorage.app",
    messagingSenderId: "523672261565",
    appId: "1:523672261565:web:259de8ac49f9b3730338d4"
};

class GuessTheNumberGameFirebase {
    constructor() {
        this.currentScreen = 'welcome';
        this.roomCode = null;
        this.isHost = false;
        this.secretNumber = null;
        this.guessCount = 0;
        this.maxGuesses = 15;
        this.gameHistory = [];
        this.gameActive = false;
        this.pollingInterval = null;
        this.database = null;
        this.playerId = this.generatePlayerId();
        this.playerName = '';
        this.opponentName = '';
        this.isSinglePlayer = false;
        
        this.initializeFirebase();
        this.initializeEventListeners();
    }

    initializeFirebase() {
        try {
            console.log('Initializing Firebase with config:', firebaseConfig);
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('Firebase app initialized');
            } else {
                console.log('Firebase app already initialized');
            }
            this.database = firebase.database();
            console.log('Firebase database connected successfully');
            
            // Test Firebase connection
            this.database.ref('.info/connected').on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    console.log('Firebase connected');
                } else {
                    console.log('Firebase disconnected');
                }
            });
        } catch (error) {
            console.warn('Firebase not available, falling back to localStorage:', error);
            this.database = null;
        }
    }

    initializeEventListeners() {
        // Welcome screen
        document.getElementById('player-name').addEventListener('input', (e) => this.validatePlayerName(e.target.value));
        document.getElementById('single-player-btn').addEventListener('click', () => this.showSinglePlayer());
        document.getElementById('create-room-btn').addEventListener('click', () => this.showCreateRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinRoom());

        // Single player screen
        document.getElementById('back-from-single-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('start-single-player-btn').addEventListener('click', () => this.startSinglePlayerGame());

        // Create room screen
        document.getElementById('back-from-create-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('secret-number').addEventListener('input', (e) => this.validateSecretNumber(e.target.value));
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyRoomCode());

        // Join room screen
        document.getElementById('back-from-join-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('join-game-btn').addEventListener('click', () => this.joinGame());
        document.getElementById('room-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            this.validateRoomCode(e.target.value);
        });

        // Game screen
        document.getElementById('submit-guess-btn').addEventListener('click', () => this.submitGuess());
        document.getElementById('guess-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitGuess();
        });
        document.getElementById('guess-input').addEventListener('input', (e) => this.validateGuessInput(e.target.value));
        document.getElementById('leave-game-btn').addEventListener('click', () => this.leaveGame());
        document.getElementById('new-game-btn').addEventListener('click', () => this.showWelcome());
    }

    generateRoomCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 7; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return code;
    }

    generatePlayerId() {
        return Math.random().toString(36).substr(2, 9);
    }

    validatePlayerName(name) {
        const errorElement = document.getElementById('name-error');
        const buttons = ['single-player-btn', 'create-room-btn', 'join-room-btn'];
        
        if (name.trim().length === 0) {
            errorElement.textContent = 'Please enter your name';
            buttons.forEach(id => document.getElementById(id).disabled = true);
            return false;
        }
        
        if (name.length > 10) {
            errorElement.textContent = 'Name must be 10 characters or less';
            buttons.forEach(id => document.getElementById(id).disabled = true);
            return false;
        }
        
        errorElement.textContent = '';
        buttons.forEach(id => document.getElementById(id).disabled = false);
        this.playerName = name.trim();
        return true;
    }

    generateRandomSecretNumber() {
        const digits = [];
        while (digits.length < 4) {
            const digit = Math.floor(Math.random() * 10).toString();
            if (!digits.includes(digit)) {
                digits.push(digit);
            }
        }
        return digits.join('');
    }

    validateSecretNumber(number) {
        const errorElement = document.getElementById('number-error');
        const startButton = document.getElementById('start-game-btn');
        
        if (number.length !== 4) {
            errorElement.textContent = 'Number must be exactly 4 digits';
            startButton.disabled = true;
            return false;
        }

        if (!/^\d{4}$/.test(number)) {
            errorElement.textContent = 'Number must contain only digits';
            startButton.disabled = true;
            return false;
        }

        const digits = number.split('');
        const uniqueDigits = new Set(digits);
        if (uniqueDigits.size !== 4) {
            errorElement.textContent = 'All digits must be different';
            startButton.disabled = true;
            return false;
        }

        errorElement.textContent = '';
        startButton.disabled = false;
        return true;
    }

    validateRoomCode(code) {
        const errorElement = document.getElementById('join-error');
        if (code.length === 7 && /^[A-Z]{7}$/.test(code.toUpperCase())) {
            errorElement.textContent = '';
            return true;
        }
        return false;
    }

    validateGuessInput(guess) {
        const input = document.getElementById('guess-input');
        input.value = guess.replace(/\D/g, '');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    showWelcome() {
        this.showScreen('welcome-screen');
        this.clearGameData();
    }

    showSinglePlayer() {
        if (!this.validatePlayerName(this.playerName)) {
            return;
        }
        this.showScreen('single-player-screen');
        this.isSinglePlayer = true;
    }

    showCreateRoom() {
        if (!this.validatePlayerName(this.playerName)) {
            return;
        }
        this.roomCode = this.generateRoomCode();
        document.getElementById('room-code').textContent = this.roomCode;
        document.getElementById('secret-number').value = '';
        document.getElementById('number-error').textContent = '';
        document.getElementById('start-game-btn').disabled = true;
        this.showScreen('create-room-screen');
        this.isHost = true;
        this.isSinglePlayer = false;
    }

    showJoinRoom() {
        if (!this.validatePlayerName(this.playerName)) {
            return;
        }
        document.getElementById('room-code-input').value = '';
        document.getElementById('join-error').textContent = '';
        this.showScreen('join-room-screen');
        this.isHost = false;
        this.isSinglePlayer = false;
    }

    copyRoomCode() {
        navigator.clipboard.writeText(this.roomCode).then(() => {
            const button = document.getElementById('copy-code-btn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    }

    startSinglePlayerGame() {
        this.secretNumber = this.generateRandomSecretNumber();
        this.gameActive = true;
        this.isHost = false; // Player is the guesser in single player mode
        this.isSinglePlayer = true;
        this.roomCode = 'SINGLE';
        this.opponentName = 'Computer';
        console.log('Single player game started. Secret number:', this.secretNumber);
        this.showGameScreen();
    }

    async startGame() {
        const secretNumber = document.getElementById('secret-number').value;
        console.log('Starting game with secret number:', secretNumber);
        
        if (!this.validateSecretNumber(secretNumber)) {
            console.log('Secret number validation failed');
            return;
        }

        this.secretNumber = secretNumber;
        const gameData = {
            roomCode: this.roomCode,
            secretNumber: secretNumber,
            hostId: this.playerId,
            hostName: this.playerName,
            guesserId: null,
            guesserName: null,
            gameActive: false,
            guesses: [],
            timestamp: Date.now()
        };

        try {
            console.log('Saving game data to Firebase for room:', this.roomCode);
            console.log('Game data:', gameData);
            
            if (this.database) {
                // Use Firebase
                await this.database.ref(`games/${this.roomCode}`).set(gameData);
                console.log('Game data saved to Firebase successfully');
            } else {
                // Fallback to localStorage
                localStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
                sessionStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
                console.log('Game data saved to localStorage (Firebase fallback)');
            }
            
            document.getElementById('waiting-message').style.display = 'block';
            this.startPollingForPlayer();
            console.log('Game created with room code:', this.roomCode);
        } catch (error) {
            console.error('Error creating game:', error);
            document.getElementById('number-error').textContent = 'Error creating game. Please try again.';
        }
    }

    async joinGame() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        console.log('Attempting to join room:', roomCode);
        
        if (!this.validateRoomCode(roomCode)) {
            console.log('Room code validation failed for:', roomCode);
            document.getElementById('join-error').textContent = 'Invalid room code format (must be 7 letters)';
            return;
        }

        try {
            let gameData;
            console.log('Looking for game data in Firebase for room:', roomCode);
            
            if (this.database) {
                // Use Firebase
                const snapshot = await this.database.ref(`games/${roomCode}`).once('value');
                gameData = snapshot.val();
                console.log('Firebase response for room', roomCode, ':', gameData);
            } else {
                // Fallback to localStorage
                const localData = localStorage.getItem(`game_${roomCode}`) || sessionStorage.getItem(`game_${roomCode}`);
                gameData = localData ? JSON.parse(localData) : null;
                console.log('localStorage fallback data:', gameData);
            }

            if (!gameData) {
                console.log('No game data found for room:', roomCode);
                document.getElementById('join-error').textContent = `Room "${roomCode}" not found. Join the room after the room creator has started the game.`;
                return;
            }

            if (gameData.guesserId) {
                console.log('Room is full. Existing guesser:', gameData.guesserId);
                document.getElementById('join-error').textContent = 'Room is full';
                return;
            }

            // Join the game
            gameData.guesserId = this.playerId;
            gameData.guesserName = this.playerName;
            gameData.gameActive = true;
            
            if (this.database) {
                await this.database.ref(`games/${roomCode}`).update({
                    guesserId: this.playerId,
                    guesserName: this.playerName,
                    gameActive: true
                });
            } else {
                localStorage.setItem(`game_${roomCode}`, JSON.stringify(gameData));
                sessionStorage.setItem(`game_${roomCode}`, JSON.stringify(gameData));
            }

            this.roomCode = roomCode;
            this.secretNumber = gameData.secretNumber;
            this.opponentName = gameData.hostName || 'Host';
            this.gameActive = true;
            this.showGameScreen();
        } catch (error) {
            console.error('Error joining game:', error);
            document.getElementById('join-error').textContent = 'Error joining game. Please try again.';
        }
    }

    showGameScreen() {
        document.getElementById('current-room-code').textContent = this.roomCode;
        document.getElementById('tries-count').textContent = this.maxGuesses;
        
        if (this.isSinglePlayer) {
            document.getElementById('player-role').textContent = `${this.playerName}, you're playing against the Computer. Start guessing!`;
        } else if (this.isHost) {
            document.getElementById('player-role').textContent = `${this.playerName}, you are the host. Waiting for guesses...`;
        } else {
            document.getElementById('player-role').textContent = `${this.playerName}, you are the guesser. Start guessing!`;
        }
        
        this.updateGameInterface();
        this.showScreen('game-screen');
        
        if (!this.isSinglePlayer) {
            this.startPollingForUpdates();
        }
    }

    updateGameInterface() {
        const isGuesser = !this.isHost;
        document.getElementById('guess-input').disabled = !isGuesser || !this.gameActive;
        document.getElementById('submit-guess-btn').disabled = !isGuesser || !this.gameActive;
        
        if (this.isHost) {
            document.getElementById('guess-input').style.display = 'none';
            document.getElementById('submit-guess-btn').style.display = 'none';
            document.querySelector('label[for="guess-input"]').style.display = 'none';
        }
    }

    startPollingForPlayer() {
        this.pollingInterval = setInterval(async () => {
            try {
                let gameData;
                
                if (this.database) {
                    const snapshot = await this.database.ref(`games/${this.roomCode}`).once('value');
                    gameData = snapshot.val();
                } else {
                    const localData = localStorage.getItem(`game_${this.roomCode}`) || sessionStorage.getItem(`game_${this.roomCode}`);
                    gameData = localData ? JSON.parse(localData) : null;
                }

                if (gameData && gameData.guesserId && gameData.gameActive) {
                    this.gameActive = true;
                    this.opponentName = gameData.guesserName || 'Guesser';
                    clearInterval(this.pollingInterval);
                    this.showGameScreen();
                }
            } catch (error) {
                console.error('Error polling for player:', error);
            }
        }, 1000);
    }

    startPollingForUpdates() {
        this.pollingInterval = setInterval(() => {
            this.loadGameState();
        }, 1000);
    }

    async loadGameState() {
        if (!this.roomCode) return;
        
        try {
            let gameData;
            
            if (this.database) {
                const snapshot = await this.database.ref(`games/${this.roomCode}`).once('value');
                gameData = snapshot.val();
            } else {
                const localData = localStorage.getItem(`game_${this.roomCode}`) || sessionStorage.getItem(`game_${this.roomCode}`);
                gameData = localData ? JSON.parse(localData) : null;
            }

            if (gameData) {
                this.updateGuessHistory(gameData.guesses || []);
                
                // Update the tries counter for both host and guesser
                const currentGuessCount = gameData.guesses ? gameData.guesses.length : 0;
                this.guessCount = currentGuessCount;
                const triesLeft = this.maxGuesses - currentGuessCount;
                document.getElementById('tries-count').textContent = triesLeft;
                
                if (gameData.guesses && gameData.guesses.length > 0) {
                    const lastGuess = gameData.guesses[gameData.guesses.length - 1];
                    if (lastGuess.isWin || gameData.guesses.length >= this.maxGuesses) {
                        this.endGame(lastGuess.isWin, gameData.guesses.length);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading game state:', error);
        }
    }

    async submitGuess() {
        const guessInput = document.getElementById('guess-input');
        const guess = guessInput.value;

        if (guess.length !== 4 || !/^\d{4}$/.test(guess)) {
            alert('Please enter a 4-digit number');
            return;
        }

        const digits = guess.split('');
        const uniqueDigits = new Set(digits);
        if (uniqueDigits.size !== 4) {
            alert('All digits must be different');
            return;
        }

        const result = this.checkGuess(guess);
        
        if (this.isSinglePlayer) {
            this.addSinglePlayerGuessToHistory(guess, result);
        } else {
            await this.addGuessToHistory(guess, result);
        }
        
        guessInput.value = '';
        this.guessCount++;
        
        const triesLeft = this.maxGuesses - this.guessCount;
        document.getElementById('tries-count').textContent = triesLeft;

        if (result.isWin || this.guessCount >= this.maxGuesses) {
            this.endGame(result.isWin, this.guessCount);
        }
    }

    checkGuess(guess) {
        const secretDigits = this.secretNumber.split('');
        const guessDigits = guess.split('');
        
        let correctNumbers = 0;
        let correctPositions = 0;

        for (let i = 0; i < 4; i++) {
            if (guessDigits[i] === secretDigits[i]) {
                correctPositions++;
            }
        }

        for (let i = 0; i < 4; i++) {
            if (secretDigits.includes(guessDigits[i])) {
                correctNumbers++;
            }
        }

        const isWin = correctPositions === 4;
        
        return {
            correctNumbers,
            correctPositions,
            isWin
        };
    }

    addSinglePlayerGuessToHistory(guess, result) {
        if (!this.gameHistory) this.gameHistory = [];
        
        const newGuess = {
            guess,
            correctNumbers: result.correctNumbers,
            correctPositions: result.correctPositions,
            isWin: result.isWin,
            timestamp: Date.now()
        };
        
        this.gameHistory.push(newGuess);
        this.updateGuessHistory(this.gameHistory);
    }

    async addGuessToHistory(guess, result) {
        try {
            let gameData;
            
            if (this.database) {
                const snapshot = await this.database.ref(`games/${this.roomCode}`).once('value');
                gameData = snapshot.val() || { guesses: [] };
            } else {
                const localData = localStorage.getItem(`game_${this.roomCode}`) || sessionStorage.getItem(`game_${this.roomCode}`);
                gameData = localData ? JSON.parse(localData) : { guesses: [] };
            }
            
            if (!gameData.guesses) gameData.guesses = [];
            
            const newGuess = {
                guess,
                correctNumbers: result.correctNumbers,
                correctPositions: result.correctPositions,
                isWin: result.isWin,
                timestamp: Date.now()
            };
            
            gameData.guesses.push(newGuess);

            if (this.database) {
                await this.database.ref(`games/${this.roomCode}/guesses`).set(gameData.guesses);
            } else {
                localStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
                sessionStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
            }
            
            this.updateGuessHistory(gameData.guesses);
        } catch (error) {
            console.error('Error adding guess to history:', error);
        }
    }

    updateGuessHistory(guesses) {
        const guessTable = document.getElementById('guess-table');
        guessTable.innerHTML = '';

        // Create 15 cells for the 5x3 grid
        for (let i = 0; i < 15; i++) {
            const guessItem = document.createElement('div');
            guessItem.className = 'guess-item';
            
            if (i < guesses.length) {
                const entry = guesses[i];
                
                // Determine color based on correct numbers and positions
                let colorClass = 'red'; // default for < 4 correct numbers
                if (entry.isWin) {
                    colorClass = 'green';
                } else if (entry.correctNumbers === 4 && entry.correctPositions < 4) {
                    colorClass = 'yellow';
                }
                
                guessItem.classList.add(colorClass);
                guessItem.innerHTML = `
                    <div class="guess-number">${entry.guess}</div>
                    <div class="guess-result">
                        ${entry.correctNumbers}N ${entry.correctPositions}P
                        ${entry.isWin ? '<br/>🎉 WIN!' : ''}
                    </div>
                `;
            } else {
                // Empty slot
                guessItem.innerHTML = `
                    <div class="guess-number">----</div>
                    <div class="guess-result">-- --</div>
                `;
            }
            
            guessTable.appendChild(guessItem);
        }
    }

    endGame(isWin, totalGuesses) {
        this.gameActive = false;
        clearInterval(this.pollingInterval);
        
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (isWin) {
            if (this.isSinglePlayer) {
                resultTitle.textContent = '🎉 You Won!';
                resultMessage.textContent = `Congratulations ${this.playerName}! You guessed the computer's number ${this.secretNumber} in ${totalGuesses} tries!`;
            } else if (this.isHost) {
                resultTitle.textContent = `😔 ${this.opponentName} Won!`;
                resultMessage.textContent = `${this.opponentName} successfully guessed your secret number ${this.secretNumber} in ${totalGuesses} tries!`;
            } else {
                resultTitle.textContent = '🎉 You Won!';
                resultMessage.textContent = `Congratulations ${this.playerName}! You guessed ${this.opponentName}'s number ${this.secretNumber} in ${totalGuesses} tries!`;
            }
        } else {
            if (this.isSinglePlayer) {
                resultTitle.textContent = '💔 Game Over';
                resultMessage.textContent = `Sorry ${this.playerName}, you failed to guess the computer's number in ${this.maxGuesses} tries. The secret number was ${this.secretNumber}.`;
            } else if (this.isHost) {
                resultTitle.textContent = `🎉 ${this.playerName} Won!`;
                resultMessage.textContent = `${this.opponentName} failed to guess your secret number ${this.secretNumber} in ${this.maxGuesses} tries. You win!`;
            } else {
                resultTitle.textContent = '💔 Game Over';
                resultMessage.textContent = `Sorry ${this.playerName}, you failed to guess ${this.opponentName}'s number in ${this.maxGuesses} tries. The secret number was ${this.secretNumber}.`;
            }
        }
        
        document.getElementById('game-result').style.display = 'block';
        document.getElementById('guess-input').disabled = true;
        document.getElementById('submit-guess-btn').disabled = true;
    }

    leaveGame() {
        this.clearGameData();
        this.showWelcome();
    }

    async clearGameData() {
        if (this.roomCode) {
            try {
                if (this.database) {
                    await this.database.ref(`games/${this.roomCode}`).remove();
                }
                localStorage.removeItem(`game_${this.roomCode}`);
                sessionStorage.removeItem(`game_${this.roomCode}`);
            } catch (error) {
                console.error('Error clearing game data:', error);
            }
        }
        
        clearInterval(this.pollingInterval);
        this.roomCode = null;
        this.isHost = false;
        this.secretNumber = null;
        this.guessCount = 0;
        this.gameHistory = [];
        this.gameActive = false;
        this.isSinglePlayer = false;
        this.opponentName = '';
        
        document.getElementById('game-result').style.display = 'none';
        document.getElementById('waiting-message').style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GuessTheNumberGameFirebase();
}); 