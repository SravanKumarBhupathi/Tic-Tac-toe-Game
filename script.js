document.addEventListener('DOMContentLoaded', () => {
    // Audio Context Setup
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = new AudioContext();

    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'click') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'win') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.8);
        } else if (type === 'draw') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.4);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.4);
        }
    }

    // DOM Elements
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');
    const changePlayersBtn = document.getElementById('change-players-btn');
    const setupModal = document.getElementById('setup-modal');
    const gameContainer = document.getElementById('game-container');
    const startGameBtn = document.getElementById('start-game-btn');
    const emojiContainer = document.getElementById('emoji-container');

    // Game State
    let gameActive = false;
    let currentPlayer = 'X';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let scores = { X: 0, O: 0 };
    let players = { X: 'Player X', O: 'Player O' };

    const smartEmojis = ['🧠', '🔥', '✨', '🎯', '⚡', '🌟', '🚀', '😎'];

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // Setup Game
    startGameBtn.addEventListener('click', () => {
        const xInput = document.getElementById('player-x').value.trim();
        const oInput = document.getElementById('player-o').value.trim();
        
        players.X = xInput || 'Player X';
        players.O = oInput || 'Player O';
        
        document.getElementById('name-display-x').innerText = players.X;
        document.getElementById('name-display-o').innerText = players.O;
        
        setupModal.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Start first audio context on user interaction
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        resetGame();
    });

    changePlayersBtn.addEventListener('click', () => {
        gameContainer.style.display = 'none';
        setupModal.style.display = 'flex';
        scores = { X: 0, O: 0 };
        updateScoreDisplay();
    });

    const currentPlayerTurnMsg = () => `<span style="color: var(--${currentPlayer.toLowerCase()}-color)">${players[currentPlayer]}'s</span> turn`;
    const winningMessage = () => `🎉 ${players[currentPlayer]} wins! 🎉`;
    const drawMessage = () => `🤝 It's a draw! 🤝`;

    function spawnEmoji(e) {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.innerText = smartEmojis[Math.floor(Math.random() * smartEmojis.length)];
        
        // Position at click coordinates
        emoji.style.left = `${e.clientX}px`;
        emoji.style.top = `${e.clientY}px`;
        
        emojiContainer.appendChild(emoji);
        
        // Clean up
        setTimeout(() => {
            emoji.remove();
        }, 2000);
    }

    function triggerWinCelebration() {
        playSound('win');
        
        // Confetti
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            var particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            }));
            confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            }));
        }, 250);
    }

    function updateScoreDisplay() {
        document.getElementById('points-x').innerText = scores.X;
        document.getElementById('points-o').innerText = scores.O;
        
        // Add subtle animation to scores
        const activeScore = document.getElementById(`score-${currentPlayer.toLowerCase()}`);
        document.querySelectorAll('.score-badge').forEach(b => b.style.transform = 'scale(1)');
        activeScore.style.transform = 'scale(1.1)';
        activeScore.style.transition = 'transform 0.3s ease';
    }

    function handleCellPlayed(clickedCell, clickedCellIndex, e) {
        gameState[clickedCellIndex] = currentPlayer;
        clickedCell.innerHTML = currentPlayer;
        clickedCell.classList.add(currentPlayer.toLowerCase());
        playSound('click');
        spawnEmoji(e);
    }

    function handlePlayerChange() {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDisplay.innerHTML = currentPlayerTurnMsg();
        updateScoreDisplay();
    }

    function handleResultValidation() {
        let roundWon = false;
        let winningCells = [];
        
        for (let i = 0; i <= 7; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            
            if (a === '' || b === '' || c === '') {
                continue;
            }
            
            if (a === b && b === c) {
                roundWon = true;
                winningCells = winCondition;
                break;
            }
        }

        if (roundWon) {
            statusDisplay.innerHTML = winningMessage();
            statusDisplay.style.color = `var(--${currentPlayer.toLowerCase()}-color)`;
            gameActive = false;
            
            scores[currentPlayer]++;
            updateScoreDisplay();
            
            winningCells.forEach(index => {
                cells[index].classList.add('winning-cell');
            });
            
            triggerWinCelebration();
            return;
        }

        let roundDraw = !gameState.includes('');
        if (roundDraw) {
            statusDisplay.innerHTML = drawMessage();
            statusDisplay.style.color = 'var(--text-color)';
            gameActive = false;
            playSound('draw');
            return;
        }

        handlePlayerChange();
    }

    function handleCellClick(clickedCellEvent) {
        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== '' || !gameActive) {
            return;
        }

        handleCellPlayed(clickedCell, clickedCellIndex, clickedCellEvent);
        handleResultValidation();
    }

    function resetGame() {
        gameActive = true;
        currentPlayer = 'X';
        gameState = ['', '', '', '', '', '', '', '', ''];
        statusDisplay.innerHTML = currentPlayerTurnMsg();
        statusDisplay.style.color = 'var(--text-color)';
        
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('x', 'o', 'winning-cell');
        });
        
        updateScoreDisplay();
    }

    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetButton.addEventListener('click', resetGame);
});
