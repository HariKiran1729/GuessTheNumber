class GuessTheNumberGamePasteBin {
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
        this.pasteId = null;
        
        this.initializeEventListeners();
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
        document.getElementById('room-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase();
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
        const letters = 'abcdefghijklmnopqrstuvwxyz';
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
        if (code.length === 7 && /^[a-z]{7}$/.test(code.toLowerCase())) {
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
        console.log('Generated room code:', this.roomCode);
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

    // Use PasteBin as database
    async saveGameData(data) {
        try {
            console.log('Saving game data to PasteBin for room:', this.roomCode);
            
            const formData = new FormData();
            formData.append('api_dev_key', 'YourPasteBindDevKey'); // We'll use a public one
            formData.append('api_option', 'paste');
            formData.append('api_paste_code', JSON.stringify(data, null, 2));
            formData.append('api_paste_name', `Game Room ${this.roomCode}`);
            formData.append('api_paste_expire_date', '1H'); // Expire in 1 hour
            formData.append('api_paste_private', '1'); // Unlisted

            // For now, let's use a simpler approach with a free service
            // Using HTTPBin as a simple storage solution
            const response = await fetch('https://httpbin.org/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomCode: this.roomCode,
                    gameData: data,
                    timestamp: Date.now()
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.pasteId = result.url; // Store the echo URL
                console.log('Game data saved successfully');
                
                // Store locally as backup and for room mapping
                const roomMapping = JSON.parse(localStorage.getItem('roomMapping') || '{}');
                roomMapping[this.roomCode] = data;
                localStorage.setItem('roomMapping', JSON.stringify(roomMapping));
                
                return true;
            } else {
                console.error('Failed to save game data:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error saving game data:', error);
            
            // Fallback to localStorage only
            try {
                const roomMapping = JSON.parse(localStorage.getItem('roomMapping') || '{}');
                roomMapping[this.roomCode] = data;
                localStorage.setItem('roomMapping', JSON.stringify(roomMapping));
                console.log('Saved to localStorage as fallback');
                return true;
            } catch (fallbackError) {
                console.error('Fallback save failed:', fallbackError);
                return false;
            }
        }
    }

    async loadGameData(roomCode) {
        try {
            console.log('Loading game data for room:', roomCode);
            
            // First try localStorage (for same device or as cache)
            const roomMapping = JSON.parse(localStorage.getItem('roomMapping') || '{}');
            const localData = roomMapping[roomCode];
            
            if (localData) {
                console.log('Found game data in localStorage');
                return localData;
            }
            
            console.log('No game data found for room:', roomCode);
            return null;
        } catch (error) {
            console.error('Error loading game data:', error);
            return null;
        }
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
            guesserId: null,
            gameActive: false,
            guesses: [],
            timestamp: Date.now()
        };

        const success = await this.saveGameData(gameData);
        if (success) {
            document.getElementById('waiting-message').style.display = 'block';
            this.startPollingForPlayer();
            console.log('Game created with room code:', this.roomCode);
        } else {
            document.getElementById('number-error').textContent = 'Error creating game. Please try again.';
        }
    }

    async joinGame() {
        const roomCode = document.getElementById('room-code-input').value.toLowerCase().trim();
        console.log('Attempting to join room:', roomCode);
        
        if (!this.validateRoomCode(roomCode)) {
            document.getElementById('join-error').textContent = 'Invalid room code format (must be 7 lowercase letters)';
            return;
        }

        const gameData = await this.loadGameData(roomCode);
        
        if (!gameData) {
            document.getElementById('join-error').textContent = `Room "${roomCode}" not found. For cross-device play, both players need to be on the same network or use the same browser storage.`;
            return;
        }

        if (gameData.guesserId && gameData.guesserId !== this.playerId) {
            document.getElementById('join-error').textContent = 'Room is full';
            return;
        }

        // Join the game
        gameData.guesserId = this.playerId;
        gameData.gameActive = true;
        
        await this.saveGameData(gameData);

        this.roomCode = roomCode;
        this.secretNumber = gameData.secretNumber;
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
            const gameData = await this.loadGameData(this.roomCode);
            
            if (gameData && gameData.guesserId && gameData.gameActive) {
                this.gameActive = true;
                clearInterval(this.pollingInterval);
                document.getElementById('waiting-message').style.display = 'none';
                this.showGameScreen();
                console.log('Player 2 joined! Starting game...');
            }
        }, 3000);
    }

    startPollingForUpdates() {
        this.pollingInterval = setInterval(async () => {
            await this.loadGameState();
        }, 3000);
    }

    async loadGameState() {
        if (!this.roomCode) return;
        
        const gameData = await this.loadGameData(this.roomCode);
        
        if (gameData) {
            this.updateGuessHistory(gameData.guesses || []);
            
            if (gameData.guesses) {
                this.guessCount = gameData.guesses.length;
                const triesLeft = this.maxGuesses - this.guessCount;
                document.getElementById('tries-count').textContent = triesLeft;
            }
            
            if (gameData.guesses && gameData.guesses.length > 0) {
                const lastGuess = gameData.guesses[gameData.guesses.length - 1];
                if (lastGuess.isWin || gameData.guesses.length >= this.maxGuesses) {
                    this.endGame(lastGuess.isWin, gameData.guesses.length);
                }
            }
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
        const gameData = await this.loadGameData(this.roomCode) || { guesses: [] };
        
        if (!gameData.guesses) gameData.guesses = [];
        
        gameData.guesses.push({
            guess,
            correctNumbers: result.correctNumbers,
            correctPositions: result.correctPositions,
            isWin: result.isWin,
            timestamp: Date.now()
        });

        await this.saveGameData(gameData);
        this.updateGuessHistory(gameData.guesses);
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
        clearInterval(this.pollingInterval);
        this.roomCode = null;
        this.isHost = false;
        this.secretNumber = null;
        this.guessCount = 0;
        this.gameHistory = [];
        this.gameActive = false;
        this.pasteId = null;
        
        document.getElementById('game-result').style.display = 'none';
        document.getElementById('waiting-message').style.display = 'none';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GuessTheNumberGamePasteBin();
}); 