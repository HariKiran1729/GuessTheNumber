// Firebase configuration - You'll need to replace this with your own Firebase config
const firebaseConfig = {
    apiKey: "demo-api-key",
    authDomain: "guess-number-game-demo.firebaseapp.com",
    databaseURL: "https://guess-number-game-demo-default-rtdb.firebaseio.com",
    projectId: "guess-number-game-demo",
    storageBucket: "guess-number-game-demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
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
        
        this.initializeFirebase();
        this.initializeEventListeners();
    }

    initializeFirebase() {
        try {
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.database = firebase.database();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.warn('Firebase not available, falling back to localStorage:', error);
            this.database = null;
        }
    }

    initializeEventListeners() {
        // Welcome screen
        document.getElementById('create-room-btn').addEventListener('click', () => this.showCreateRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinRoom());

        // Create room screen
        document.getElementById('back-from-create-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('secret-number').addEventListener('input', (e) => this.validateSecretNumber(e.target.value));
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyRoomCode());

        // Join room screen
        document.getElementById('back-from-join-btn').addEventListener('click', () => this.showWelcome());
        document.getElementById('join-game-btn').addEventListener('click', () => this.joinGame());
        document.getElementById('room-code-input').addEventListener('input', (e) => this.validateRoomCode(e.target.value));

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

    showCreateRoom() {
        this.roomCode = this.generateRoomCode();
        document.getElementById('room-code').textContent = this.roomCode;
        document.getElementById('secret-number').value = '';
        document.getElementById('number-error').textContent = '';
        document.getElementById('start-game-btn').disabled = true;
        this.showScreen('create-room-screen');
        this.isHost = true;
    }

    showJoinRoom() {
        document.getElementById('room-code-input').value = '';
        document.getElementById('join-error').textContent = '';
        this.showScreen('join-room-screen');
        this.isHost = false;
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

    async startGame() {
        const secretNumber = document.getElementById('secret-number').value;
        if (!this.validateSecretNumber(secretNumber)) return;

        this.secretNumber = secretNumber;
        const gameData = {
            roomCode: this.roomCode,
            secretNumber: secretNumber,
            hostId: this.playerId,
            guesserId: null,
            gameActive: false,
            guesses: [],
            timestamp: Date.now()
        };

        try {
            if (this.database) {
                // Use Firebase
                await this.database.ref(`games/${this.roomCode}`).set(gameData);
            } else {
                // Fallback to localStorage
                localStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
                sessionStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
            }
            
            document.getElementById('waiting-message').style.display = 'block';
            this.startPollingForPlayer();
        } catch (error) {
            console.error('Error creating game:', error);
            document.getElementById('number-error').textContent = 'Error creating game. Please try again.';
        }
    }

    async joinGame() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        if (!this.validateRoomCode(roomCode)) {
            document.getElementById('join-error').textContent = 'Invalid room code format';
            return;
        }

        try {
            let gameData;
            
            if (this.database) {
                // Use Firebase
                const snapshot = await this.database.ref(`games/${roomCode}`).once('value');
                gameData = snapshot.val();
            } else {
                // Fallback to localStorage
                const localData = localStorage.getItem(`game_${roomCode}`) || sessionStorage.getItem(`game_${roomCode}`);
                gameData = localData ? JSON.parse(localData) : null;
            }

            if (!gameData) {
                document.getElementById('join-error').textContent = 'Room not found';
                return;
            }

            if (gameData.guesserId) {
                document.getElementById('join-error').textContent = 'Room is full';
                return;
            }

            // Join the game
            gameData.guesserId = this.playerId;
            gameData.gameActive = true;
            
            if (this.database) {
                await this.database.ref(`games/${roomCode}`).update({
                    guesserId: this.playerId,
                    gameActive: true
                });
            } else {
                localStorage.setItem(`game_${roomCode}`, JSON.stringify(gameData));
                sessionStorage.setItem(`game_${roomCode}`, JSON.stringify(gameData));
            }

            this.roomCode = roomCode;
            this.secretNumber = gameData.secretNumber;
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
        document.getElementById('player-role').textContent = this.isHost ? 
            'You are the host. Waiting for guesses...' : 
            'You are the guesser. Start guessing!';
        
        this.updateGameInterface();
        this.showScreen('game-screen');
        
        this.startPollingForUpdates();
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
        await this.addGuessToHistory(guess, result);
        
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
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        guesses.forEach((entry, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span class="guess-number">Guess ${index + 1}: ${entry.guess}</span>
                <span class="result">
                    ${entry.correctNumbers} correct numbers, 
                    ${entry.correctPositions} correct positions
                    ${entry.isWin ? ' 🎉 WINNER!' : ''}
                </span>
            `;
            historyList.appendChild(historyItem);
        });
    }

    endGame(isWin, totalGuesses) {
        this.gameActive = false;
        clearInterval(this.pollingInterval);
        
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (isWin) {
            resultTitle.textContent = '🎉 Congratulations!';
            resultMessage.textContent = `You guessed the number ${this.secretNumber} in ${totalGuesses} tries!`;
        } else {
            resultTitle.textContent = '💔 Game Over';
            resultMessage.textContent = `You've used all ${this.maxGuesses} tries. The number was ${this.secretNumber}.`;
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
        
        document.getElementById('game-result').style.display = 'none';
        document.getElementById('waiting-message').style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GuessTheNumberGameFirebase();
}); 