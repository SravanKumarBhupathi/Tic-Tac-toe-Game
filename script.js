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
    let gameMode = 'local';
    let botDifficulty = 'easy';

    // Trick / Fun mechanics state
    let lastGameResult = null; // 'X', 'O', or 'draw'
    let hardGamesPlayed = 0;
    let trickActiveThisGame = false;
    let firstUserMoveIndex = -1;
    let trickExecuted = false;

    const smartEmojis = ['🧠', '🔥', '✨', '🎯', '⚡', '🌟', '🚀', '😎'];

    // --- DIALOGUE & VOICE ENGINE ---
    const specialPlayers = {
        'default': {
            start: ["Good luck, you'll need it.", "Let the games begin!"],
            turn: ["Your move...", "Taking your time, huh?"],
            move: ["Interesting.", "Alright then.", "Bold move."],
            nearWin: ["Almost there!", "Don't mess this up."],
            win: ["Congratulations, you won!", "Nice victory!"],
            lose: ["Better luck next time.", "Ouch, that hurts."],
            tie: ["A draw. How anticlimactic.", "Well matched!"]
        },
        'vidya': {
            start: ["Oh, it's YOU. Prepare to lose. 🙄", "Finally, a worthy opponent... wait, it's just Vidya. 😂"],
            turn: ["Vidya is thinking...", "Are you going to move today or what, Vidya?", "My grandma plays faster than you. 👵"],
            move: ["Oof, bold move. I'd have played elsewhere. 😬", "Are you sure about that one? 🧐", "I guess that's ONE way to play..."],
            nearWin: ["Oh wow, you might actually win. Did you cheat? 🤨", "Don't choke now! 📉"],
            win: ["Beginner's luck. 😒", "Okay, you win. Do you want a medal? 🏅"],
            winBot: ["VIDYA BEAT THE BOT! 🏆🔥"],
            lose: ["As expected. Better luck next lifetime. 💀", "I tried to go easy on you, I really did. 😔"],
            tie: ["Vidya, can you please stop drinking Magic Moments? Then you might actually focus and win the match. 😜"]
        }
    };

    let voiceEnabled = false;
    let currentDialoguePriority = 0; // 0 = Turn/Move, 1 = Near Win/Start, 2 = Game Over Result
    let dialogueTimeout;

    const dialogueContainer = document.getElementById('dialogue-container');
    const dialogueText = document.getElementById('dialogue-text');
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');

    voiceToggleBtn.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        voiceToggleBtn.classList.toggle('active', voiceEnabled);
        voiceToggleBtn.innerHTML = voiceEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
        if (voiceEnabled) {
            voiceToggleBtn.setAttribute('title', 'Voice On');
            speakDialogue("Voice enabled.");
        } else {
            voiceToggleBtn.setAttribute('title', 'Voice Off');
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    });

    function cleanEmojiForSpeech(text) {
        return text.replace(/[က-￿]+/g, '').trim();
    }

    function speakDialogue(text) {
        if (!voiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanEmojiForSpeech(text));
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }

    function showDialogue(playerId, type, priority = 0) {
        if (priority < currentDialoguePriority) return; // Don't override higher priority messages

        let nameRaw = playerId === 'x' ? players.X : players.O;

        // Ensure "Vidya" match works even if they typed "Vidya "
        if (nameRaw) nameRaw = nameRaw.trim();
        let nameKey = nameRaw ? nameRaw.toLowerCase() : 'default';

        if (!specialPlayers[nameKey]) {
            nameKey = 'default';
        }

        if (specialPlayers[nameKey] && specialPlayers[nameKey][type]) {
            const options = specialPlayers[nameKey][type];
            const selectedText = options[Math.floor(Math.random() * options.length)];

            dialogueText.innerText = selectedText;
            dialogueContainer.classList.add('visible');
            currentDialoguePriority = priority;
            speakDialogue(selectedText);

            clearTimeout(dialogueTimeout);

            // Reset priority back to 0 after 4 seconds so normal turn messages can resume
            if (priority < 2) {
                dialogueTimeout = setTimeout(() => {
                    if (currentDialoguePriority < 2) {
                        dialogueContainer.classList.remove('visible');
                        currentDialoguePriority = 0;
                    }
                }, 4000);
            }
        }
    }


    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // Mode Selection logic
    const modeRadios = document.querySelectorAll('input[name="game-mode"]');
    const playerOContainer = document.getElementById('player-o-container');
    const botDifficultyContainer = document.getElementById('bot-difficulty-container');

    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'bot') {
                playerOContainer.style.display = 'none';
                botDifficultyContainer.style.display = 'block';
            } else {
                playerOContainer.style.display = 'block';
                botDifficultyContainer.style.display = 'none';
            }
        });
    });

    // Setup Game
    startGameBtn.addEventListener('click', () => {
        gameMode = document.querySelector('input[name="game-mode"]:checked').value;
        botDifficulty = document.getElementById('bot-difficulty').value;

        const xInput = document.getElementById('player-x').value.trim();
        const oInput = document.getElementById('player-o').value.trim();
        
        players.X = xInput || 'Player X';
        if (gameMode === 'bot') {
            players.O = 'Bot';
        } else {
            players.O = oInput || 'Player O';
        }
        
        document.getElementById('name-display-x').innerText = players.X;
        document.getElementById('name-display-o').innerText = players.O;
        
        setupModal.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Start first audio context on user interaction
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        resetGame();

        // Trigger start dialogue
        if (gameMode === 'local') {
            const isVidyaX = players.X.trim().toLowerCase() === 'vidya';
            const isVidyaO = players.O.trim().toLowerCase() === 'vidya';
            if (isVidyaX || isVidyaO) {
                const combinedMsg = `Welcome ${players.X} & ${players.O}! 🔥`;
                dialogueText.innerText = combinedMsg;
                dialogueContainer.classList.add('visible');
                currentDialoguePriority = 1;
                speakDialogue(combinedMsg);

                dialogueTimeout = setTimeout(() => {
                    dialogueContainer.classList.remove('visible');
                    currentDialoguePriority = 0;
                }, 4000);
            } else {
                showDialogue('x', 'start', 1);
            }
        } else {
            showDialogue('x', 'start', 1);
        }
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

        if (currentPlayer === 'X' && firstUserMoveIndex === -1) {
            firstUserMoveIndex = clickedCellIndex;
        }

        playSound('click');
        if (e && e.clientX) {
            spawnEmoji(e);
        }
    }

    function handlePlayerChange() {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDisplay.innerHTML = currentPlayerTurnMsg();
        updateScoreDisplay();

        if (gameMode === 'bot' && currentPlayer === 'O' && gameActive) {
            setTimeout(makeBotMove, 500); // 500ms delay for better UX
        } else if (gameActive) {
            // Player's turn to move
            if (Math.random() < 0.4) { // 40% chance to say a turn joke
                showDialogue(currentPlayer.toLowerCase(), 'turn', 0);
            } else if (Math.random() < 0.3) {
                // Taunt the opponent
                showDialogue(currentPlayer === 'X' ? 'o' : 'x', 'move', 0);
            }
        }
    }

    function handleResultValidation() {
        let roundWon = false;
        let nearWin = false;
        let winningCells = [];
        
        for (let i = 0; i <= 7; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            
            // Check for near win
            const arr = [a, b, c];
            const pCount = arr.filter(v => v === currentPlayer).length;
            const eCount = arr.filter(v => v === '').length;
            if (pCount === 2 && eCount === 1) {
                nearWin = true;
            }

            if (a === '' || b === '' || c === '') {
                continue;
            }
            
            if (a === b && b === c) {
                roundWon = true;
                winningCells = winCondition;
                break;
            }
        }

        if (nearWin && !roundWon && gameActive) {
            showDialogue(currentPlayer.toLowerCase(), 'nearWin', 1);
        }

        if (roundWon) {
            statusDisplay.innerHTML = winningMessage();
            statusDisplay.style.color = `var(--${currentPlayer.toLowerCase()}-color)`;
            gameActive = false;
            lastGameResult = currentPlayer;
            if (gameMode === 'bot' && botDifficulty === 'hard') hardGamesPlayed++;
            
            scores[currentPlayer]++;
            updateScoreDisplay();
            
            winningCells.forEach(index => {
                cells[index].classList.add('winning-cell');
            });
            
            triggerWinCelebration();

            if (gameMode === 'bot' && currentPlayer === 'X' && players.X.trim().toLowerCase() === 'vidya') {
                showDialogue('x', 'winBot', 2);
            } else {
                showDialogue(currentPlayer.toLowerCase(), 'win', 2);
                setTimeout(() => showDialogue(currentPlayer === 'X' ? 'o' : 'x', 'lose', 2), 3000); // delay loser quote
            }

            const pName = players[currentPlayer];
            let dialogueMsg = '';
            if (currentDialoguePriority === 2 && dialogueContainer.classList.contains('visible')) {
                dialogueMsg = `<br/><br/><i>"${dialogueText.innerText}"</i>`;
            }
            showResultModal("🏆", `${pName} WINS!`, `Outstanding move.` + dialogueMsg);

            return;
        }

        let roundDraw = !gameState.includes('');
        if (roundDraw) {
            statusDisplay.innerHTML = drawMessage();
            statusDisplay.style.color = 'var(--text-color)';
            gameActive = false;
            lastGameResult = 'draw';
            if (gameMode === 'bot' && botDifficulty === 'hard') hardGamesPlayed++;
            playSound('draw');

            // Prioritize Vidya's tie message
            if (players.X.trim().toLowerCase() === 'vidya') {
                showDialogue('x', 'tie', 2);
            } else if (players.O.trim().toLowerCase() === 'vidya') {
                showDialogue('o', 'tie', 2);
            } else {
                showDialogue('x', 'tie', 2);
            }
            let dialogueMsg = '';
            if (currentDialoguePriority === 2 && dialogueContainer.classList.contains('visible')) {
                dialogueMsg = `<br/><br/><i>"${dialogueText.innerText}"</i>`;
            }
            showResultModal("🤝", "IT'S A TIE!", dialogueMsg);

            return;
        }

        handlePlayerChange();
    }

    function getBestMove(board, player) {
        const availableSpots = board.reduce((acc, cell, index) => {
            if (cell === '') acc.push(index);
            return acc;
        }, []);

        if (checkWin(board, 'X')) {
            return { score: -10 };
        } else if (checkWin(board, 'O')) {
            return { score: 10 };
        } else if (availableSpots.length === 0) {
            return { score: 0 };
        }

        const moves = [];
        for (let i = 0; i < availableSpots.length; i++) {
            const move = {};
            move.index = availableSpots[i];
            board[availableSpots[i]] = player;

            if (player === 'O') {
                const result = getBestMove(board, 'X');
                move.score = result.score;
            } else {
                const result = getBestMove(board, 'O');
                move.score = result.score;
            }

            board[availableSpots[i]] = '';
            moves.push(move);
        }

        let bestMove;
        if (player === 'O') {
            let bestScore = -10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else {
            let bestScore = 10000;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }

        return moves[bestMove];
    }

    function checkWin(board, player) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (board[a] === player && board[b] === player && board[c] === player) {
                return true;
            }
        }
        return false;
    }

    function makeRandomMove() {
        const availableSpots = gameState.reduce((acc, cell, index) => {
            if (cell === '') acc.push(index);
            return acc;
        }, []);

        if (availableSpots.length === 0) return -1;
        const randomIndex = Math.floor(Math.random() * availableSpots.length);
        return availableSpots[randomIndex];
    }

    function makeBotMove() {
        if (!gameActive) return;

        // Implement trick/scam mechanics
        if (trickActiveThisGame && !trickExecuted && firstUserMoveIndex !== -1) {
            // Count bot moves to trigger trick on the 2nd bot move
            const botMoves = gameState.filter(cell => cell === 'O').length;
            if (botMoves === 1) {
                // Swap the user's first move (X) to bot's move (O)
                gameState[firstUserMoveIndex] = 'O';
                cells[firstUserMoveIndex].innerHTML = 'O';
                cells[firstUserMoveIndex].classList.remove('x');
                cells[firstUserMoveIndex].classList.add('o');
                trickExecuted = true;
            }
        }

        let moveIndex = -1;

        if (botDifficulty === 'easy') {
            moveIndex = makeRandomMove();
        } else if (botDifficulty === 'extreme') {
            moveIndex = getBestMove([...gameState], 'O').index;
        } else if (botDifficulty === 'hard') {
            if (trickExecuted) {
                // If we scammed, we better play the optimal move to win
                moveIndex = getBestMove([...gameState], 'O').index;
            } else {
                // Mix of random and best move (e.g. 50% random, 50% best)
                if (Math.random() < 0.5) {
                    moveIndex = makeRandomMove();
                } else {
                    moveIndex = getBestMove([...gameState], 'O').index;
                }
            }
        }

        if (moveIndex !== -1) {
            const cell = cells[moveIndex];
            // Mock event for bot
            const mockEvent = {
                clientX: cell.getBoundingClientRect().left + cell.getBoundingClientRect().width / 2,
                clientY: cell.getBoundingClientRect().top + cell.getBoundingClientRect().height / 2
            };
            handleCellPlayed(cell, moveIndex, mockEvent);
            handleResultValidation();
        }
    }

    function handleCellClick(clickedCellEvent) {
        if (gameMode === 'bot' && currentPlayer === 'O') {
            return; // Ignore clicks while bot is thinking or playing
        }

        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== '' || !gameActive) {
            return;
        }

        handleCellPlayed(clickedCell, clickedCellIndex, clickedCellEvent);
        handleResultValidation();
    }

    // Result Modal Logic
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultIcon = document.getElementById('result-icon');
    const rematchBtn = document.getElementById('rematch-btn');
    const homeBtn = document.getElementById('home-btn');

    function showResultModal(icon, title, message) {
        setTimeout(() => {
            resultIcon.innerText = icon;
            resultTitle.innerText = title;
            resultMessage.innerHTML = message;
            resultModal.style.display = 'flex';
        }, 1500); // Wait for animations/confetti
    }

    rematchBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
        resetGame();
    });

    homeBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        gameContainer.style.display = 'none';
        setupModal.style.display = 'flex';
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
    });

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

        // Evaluate trick mechanics
        trickActiveThisGame = false;
        trickExecuted = false;
        firstUserMoveIndex = -1;

        if (gameMode === 'bot') {
            if (botDifficulty === 'extreme' && lastGameResult === 'draw') {
                trickActiveThisGame = true;
            } else if (botDifficulty === 'hard') {
                if (lastGameResult === 'X' || (hardGamesPlayed > 0 && hardGamesPlayed % 2 === 0)) {
                    trickActiveThisGame = true;
                }
            }
        }
    }

    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetButton.addEventListener('click', resetGame);
});
