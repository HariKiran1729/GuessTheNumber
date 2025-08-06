class GuessTheNumberGame {
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
        this.playerId = this.generatePlayerId();
        
        this.initializeEventListeners();
        this.setupStorageListener();
        this.loadGameState();
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

    setupStorageListener() {
        // Listen for localStorage changes across tabs
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('game_') && this.roomCode) {
                if (e.key === `game_${this.roomCode}`) {
                    this.handleStorageChange(JSON.parse(e.newValue));
                }
            }
        });

        // Also check for changes periodically (fallback)
        setInterval(() => {
            if (this.roomCode && this.currentScreen === 'game-screen') {
                this.loadGameState();
            }
        }, 2000);
    }

    handleStorageChange(gameData) {
        if (!gameData) return;
        
        // Update game state based on storage changes
        if (this.isHost && gameData.guesserId && !this.gameActive) {
            this.gameActive = true;
            this.showGameScreen();
        }
        
        if (gameData.guesses) {
            this.updateGuessHistory(gameData.guesses);
            
            if (gameData.guesses.length > 0) {
                const lastGuess = gameData.guesses[gameData.guesses.length - 1];
                if (lastGuess.isWin || gameData.guesses.length >= this.maxGuesses) {
                    this.endGame(lastGuess.isWin, gameData.guesses.length);
                }
            }
        }
    }

    generateRoomCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 7; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return code;
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
        // Only allow digits
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

    startGame() {
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

        // Store game data
        localStorage.setItem(`game_${this.roomCode}`, JSON.stringify(gameData));
        
        document.getElementById('waiting-message').style.display = 'block';
        this.startPollingForPlayer();
        
        console.log('Game created with room code:', this.roomCode);
    }

    joinGame() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        if (!this.validateRoomCode(roomCode)) {
            document.getElementById('join-error').textContent = 'Invalid room code format';
            return;
        }

        // Check if game exists in localStorage
        let gameData = localStorage.getItem(`game_${roomCode}`);
        if (!gameData) {
            document.getElementById('join-error').textContent = 'Room not found. Make sure the room creator is in another tab of this browser.';
            return;
        }

        const game = JSON.parse(gameData);
        if (game.guesserId && game.guesserId !== this.playerId) {
            document.getElementById('join-error').textContent = 'Room is full';
            return;
        }

        // Join the game
        game.guesserId = this.playerId;
        game.gameActive = true;
        
        // Store updated game data
        localStorage.setItem(`game_${roomCode}`, JSON.stringify(game));

        this.roomCode = roomCode;
        this.secretNumber = game.secretNumber;
        this.gameActive = true;
        this.isHost = false;
        this.showGameScreen();
        
        console.log('Successfully joined room:', roomCode);
    }

    showGameScreen() {
        document.getElementById('current-room-code').textContent = this.roomCode;
        document.getElementById('tries-count').textContent = this.maxGuesses;
        document.getElementById('player-role').textContent = this.isHost ? 
            'You are the host. Waiting for guesses...' : 
            'You are the guesser. Start guessing!';
        
        this.updateGameInterface();
        this.showScreen('game-screen');
        
        if (!this.isHost) {
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
        this.pollingInterval = setInterval(() => {
            const gameData = localStorage.getItem(`game_${this.roomCode}`);
            if (gameData) {
                const game = JSON.parse(gameData);
                if (game.guesserId && game.gameActive) {
                    this.gameActive = true;
                    clearInterval(this.pollingInterval);
                    document.getElementById('waiting-message').style.display = 'none';
                    this.showGameScreen();
                    console.log('Player 2 joined! Starting game...');
                }
            }
        }, 1000);
    }

    startPollingForUpdates() {
        this.pollingInterval = setInterval(() => {
            this.loadGameState();
        }, 1000);
    }

    loadGameState() {
        if (!this.roomCode) return;
        
        const gameData = localStorage.getItem(`game_${this.roomCode}`);
        if (gameData) {
            const game = JSON.parse(gameData);
            this.updateGuessHistory(game.guesses || []);
            
            // Update tries counter
            if (game.guesses) {
                this.guessCount = game.guesses.length;
                const triesLeft = this.maxGuesses - this.guessCount;
                document.getElementById('tries-count').textContent = triesLeft;
            }
            
            if (game.guesses && game.guesses.length > 0) {
                const lastGuess = game.guesses[game.guesses.length - 1];
                if (lastGuess.isWin || game.guesses.length >= this.maxGuesses) {
                    this.endGame(lastGuess.isWin, game.guesses.length);
                }
            }
        }
    }

    submitGuess() {
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
        this.addGuessToHistory(guess, result);
        
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

        // Check for correct positions
        for (let i = 0; i < 4; i++) {
            if (guessDigits[i] === secretDigits[i]) {
                correctPositions++;
            }
        }

        // Check for correct numbers (regardless of position)
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

    addGuessToHistory(guess, result) {
        const gameData = localStorage.getItem(`game_${this.roomCode}`);
        const game = gameData ? JSON.parse(gameData) : { guesses: [] };
        
        if (!game.guesses) game.guesses = [];
        
        game.guesses.push({
            guess,
            correctNumbers: result.correctNumbers,
            correctPositions: result.correctPositions,
            isWin: result.isWin,
            timestamp: Date.now()
        });

        localStorage.setItem(`game_${this.roomCode}`, JSON.stringify(game));
        this.updateGuessHistory(game.guesses);
        
        console.log('Added guess to history:', guess, result);
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

    clearGameData() {
        if (this.roomCode) {
            localStorage.removeItem(`game_${this.roomCode}`);
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
        
        console.log('Game data cleared');
    }

    generatePlayerId() {
        return Math.random().toString(36).substr(2, 9);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GuessTheNumberGame();
}); 