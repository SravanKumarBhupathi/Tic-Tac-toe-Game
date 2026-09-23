document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');
    const setupModal = document.getElementById('setup-modal');
    const gameContainer = document.getElementById('game-container');
    const startGameBtn = document.getElementById('start-game-btn');
    const changePlayersBtn = document.getElementById('change-players-btn');

    let gameActive = false;
    let currentPlayer = 'X';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let scores = { X: 0, O: 0 };
    let players = { X: 'Player X', O: 'Player O' };

    let gameMode = 'local';
    let botDifficulty = 'easy';

    const smartEmojis = ['🧠', '🔥', '✨', '🎯', '⚡', '🌟', '🚀', '😎'];

    // --- DIALOGUE & VOICE ENGINE ---

    function normalizePlayerName(name) {
        if (!name) return '';
        return name.trim().toLowerCase();
    }

    function getOpponentName(currentPlayerId) {
        if (currentPlayerId === 'x') {
            return players.O === 'Bot' ? 'the AI Bot' : players.O;
        }
        return players.X === 'Bot' ? 'the AI Bot' : players.X;
    }

    const specialPlayers = {
        'default': {
            start: ["Alright... let's see who regrets starting this game first. 😂", "Game started. Friendship status: potentially unstable. 😈"],
            turn: ["Still thinking? It's only X and O. 😭"],
            move: ["Interesting choice... questionable, but interesting. 😂", "The board definitely did not deserve that move. 😭", "Okay... that was actually smart. 👀", "Wait... you actually know how to play? 😳"],
            nearWin: ["OHHH! Someone is getting dangerous. 🔥", "One more mistake and it's over. 😈"],
            block: ["Nice save! 👀", "You just saved yourself from embarrassment. 😂"],
            win: ["🏆 Victory! Someone's confidence just increased by 200%. 😂"],
            lose: ["GG! 😂 Maybe pretend the Wi-Fi disconnected."],
            tie: ["🤝 It's a tie! Nobody won. Nobody lost. Perfect excuse for a rematch. 😂"]
        },
        'sravan': {
            start: ["THE HERO HAS ENTERED THE GAME! 🦸🔥", "Everyone remain calm. Sravan is cooking. 🔥😎", "Sravan has entered. This game just became unfair. 😂", "The Hero has arrived. Everyone else may now panic. 😎"],
            turn: ["Sravan is calculating... or pretending to. 😎"],
            move: ["The Hero has made his move. 😎", "That wasn't a move. That was a warning. 😂", "Hero move detected. 🦸🔥"],
            nearWin: ["The Hero is about to strike. ⚡"],
            block: ["Heroic block! 🛡️"],
            heroIntervention: ["🚨 HERO MODE ACTIVATED! 🚨 Relax everyone. The Hero cannot lose. 😎", "The universe has corrected the mistake. 😂", "Nice try. But Sravan is the Hero. 🦸"],
            win: ["SRAVAN WINS! 🦸🔥 As expected. The Hero has saved the day again.", "SRAVAN WINS! 😎 Did anyone seriously expect another result?", "Victory achieved. The Hero remains undefeated. 🦸🏆"],
            lose: ["Wait, the Hero lost? This is a glitch in the matrix."],
            tie: ["It's a tie! Even the Hero decided to be generous. 😂", "Sravan didn't lose. That's what matters. 😎"]
        },
        'keerthi': {
            start: [
                (opp) => `Ohhh wow! Keerthi entered! 😂 ${opp}, just give the game to Keerthi and go somewhere else.`,
                (opp) => `Ohhh wow! Keerthi is here! 😳 ${opp}, save yourself some embarrassment and go somewhere else. 😂`,
                (opp) => `Keerthi entered the game! 🔥 ${opp}, I suggest you reconsider your life choices. 😂`
            ],
            turn: ["Keerthi is contemplating the universe..."],
            move: ["Keerthi places a mark. Watch and learn."],
            nearWin: ["Keerthi is closing in!"],
            block: ["Keerthi denies you!"],
            win: [
                (opp) => `${opp}, I told you before the game started. You should've gone somewhere else. 😂`,
                (opp) => `Keerthi wins! 🏆 ${opp}, next time listen when I give you advice. 😂`,
                (opp) => `Keerthi wins! 😎 ${opp} was warned. ${opp} ignored the warning. ${opp} suffered. 😂`
            ],
            lose: [
                "So sad, Keerthi! 😂 Maybe it's time to change your friend circle. Vidya's brainless energy is clearly contagious. Be careful next time! 😜",
                "Keerthi lost! 😭😂 I think you need a new strategy... and possibly a new friend circle. 😜",
                "Oh no Keerthi! 😂 Your brain 🧠 was clearly affected by too much Vidya influence. Recovery recommended before the next match. 😜"
            ],
            tie: [
                "It's a tie! 🤝 Keerthi, you definitely have the brain 🧠... but after travelling with Vidya, some of that brainpower seems to have gone missing. 😂😜",
                "It's a tie! 😂 Keerthi has the brain 🧠, but travelling with Vidya seems to have put it into airplane mode. ✈️🧠",
                "Draw game! 🤝 Keerthi, your brain 🧠 was working... but Vidya's influence clearly caused some technical issues. 😂"
            ]
        },
        'vidya': {
            start: ["Welcome Vidya! 😈 Let's see whether you're here to win or just press random squares.", "Vidya has entered the game! 😂 Please locate your brain before making the first move. 🧠"],
            turn: ["Vidya is thinking... This could take a while. 😂", "Come on Vidya, your brain has entered loading mode. ⏳😂", "Vidya, this move better be part of a master plan. 😏"],
            move: ["Interesting move, Vidya. Very interesting. 👀", "Vidya has a plan. We hope. 😂", "Big brain move detected... probably. 🧠😂"],
            nearWin: ["Whoa Vidya! Someone is actually taking this seriously. 🔥", "Vidya is getting dangerous now. 😳", "Okay Vidya, we see you! 👀🔥"],
            block: ["Vidya actually blocked that! Impressive. 👏"],
            win: ["🎉 VIDYA WINS! 🏆 That wasn't luck... probably. 😏", "Vidya actually won! 😂 Someone document this historic event. 📸"],
            winBot: ["VIDYA BEAT THE BOT! 🏆🔥"],
            lose: ["😂 Vidya lost! Somebody screenshot this historic moment."],
            tie: ["🤝 It's a tie! Vidya, can you please stop drinking Magic Moments? Then you might actually focus and win the match. 😜"]
        }
    };

    let voiceEnabled = localStorage.getItem('voiceEnabled') === 'true';
    let currentDialoguePriority = 0; // 0=Turn/Move, 1=Near Win/Start, 2=Game Over Result
    let dialogueTimeout;
    let isDialogueSpeaking = false;
    let boardLocked = false;

    const dialogueContainer = document.getElementById('dialogue-wrapper');
    const dialogueText = document.getElementById('dialogue-text');
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');

    // Init voice toggle UI
    updateVoiceUI();

    voiceToggleBtn.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        localStorage.setItem('voiceEnabled', voiceEnabled);
        updateVoiceUI();
        if (voiceEnabled) {
            speakDialogue("Voice enabled.");
        } else {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    });

    function updateVoiceUI() {
        voiceToggleBtn.classList.toggle('active', voiceEnabled);
        voiceToggleBtn.innerHTML = voiceEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
        voiceToggleBtn.setAttribute('title', voiceEnabled ? 'Voice On' : 'Voice Off');
    }

    function cleanEmojiForSpeech(text) {
        return text.replace(/[က-￿]+/g, '').trim();
    }

    function lockBoard() {
        boardLocked = true;
        document.getElementById('board-lock-overlay').style.display = 'block';
        document.getElementById('dialogue-controls').style.display = 'flex';
        isDialogueSpeaking = true;
    }

    function unlockBoard() {
        boardLocked = false;
        document.getElementById('board-lock-overlay').style.display = 'none';
        document.getElementById('dialogue-controls').style.display = 'none';
        isDialogueSpeaking = false;
    }

    document.getElementById('skip-voice-btn').addEventListener('click', () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        unlockBoard();
    });

    function speakDialogue(text) {
        if (!voiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanEmojiForSpeech(text));
        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        utterance.onstart = () => {
            lockBoard();
        };

        utterance.onend = () => {
            unlockBoard();
        };

        utterance.onerror = () => {
            unlockBoard();
        };

        window.speechSynthesis.speak(utterance);
    }

    function triggerGameDialogue(eventName, priority = 0, specificPlayerId = null) {
        // If there's an existing message with HIGHER priority, do not overwrite it.
        // Exception: Tie messages and Win messages can overwrite Near Win messages
        if (priority < currentDialoguePriority && currentDialoguePriority !== 0) {
            return;
        }

        let pName = 'default';
        let oppName = '';

        if (specificPlayerId) {
            pName = normalizePlayerName(specificPlayerId === 'x' ? players.X : players.O);
            oppName = getOpponentName(specificPlayerId);
        } else {
            pName = normalizePlayerName(currentPlayer === 'X' ? players.X : players.O);
            oppName = getOpponentName(currentPlayer.toLowerCase());
        }

        let nameKey = pName;
        if (!specialPlayers[nameKey] || !specialPlayers[nameKey][eventName]) {
            nameKey = 'default';
        }

        if (specialPlayers[nameKey] && specialPlayers[nameKey][eventName]) {
            const options = specialPlayers[nameKey][eventName];
            let selectedText = options[Math.floor(Math.random() * options.length)];

            if (typeof selectedText === 'function') {
                selectedText = selectedText(oppName);
            }

            if (dialogueText.innerText === selectedText) return;

            dialogueText.innerText = selectedText;
            dialogueContainer.classList.add('visible');
            currentDialoguePriority = priority;
            speakDialogue(selectedText);

            clearTimeout(dialogueTimeout);

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

    // Audio Context Setup
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    function playSound(type) {
        if (audioCtx.state === 'suspended') return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'click') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'win') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } else if (type === 'draw') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        }
    }

    function spawnEmoji(e) {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.innerText = smartEmojis[Math.floor(Math.random() * smartEmojis.length)];

        emoji.style.left = (e.clientX - 15) + 'px';
        emoji.style.top = (e.clientY - 15) + 'px';

        document.getElementById('emoji-container').appendChild(emoji);

        setTimeout(() => {
            emoji.remove();
        }, 2000);
    }

    function triggerWinCelebration() {
        var duration = 3000;
        var end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff8c00', '#ff4757', '#0984e3']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ff8c00', '#ff4757', '#0984e3']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    const currentPlayerTurnMsg = () => `${currentPlayer === 'X' ? players.X : players.O}'s turn`;
    const winningMessage = () => `${currentPlayer === 'X' ? players.X : players.O} Wins!`;
    const drawMessage = () => `Game Ended in a Draw!`;

    // UI Setup Listeners
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
        gameContainer.style.opacity = '1';
        
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        resetGame();

        // Trigger Start Dialogue
        if (gameMode === 'local') {
            const isVidyaX = normalizePlayerName(players.X) === 'vidya';
            const isVidyaO = normalizePlayerName(players.O) === 'vidya';
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
                triggerGameDialogue('start', 1, 'x');
            }
        } else {
            triggerGameDialogue('start', 1, 'x');
        }
    });

    changePlayersBtn.addEventListener('click', () => {
        gameContainer.style.display = 'none';
        setupModal.style.display = 'flex';
        scores = { X: 0, O: 0 };
        updateScoreDisplay();
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        unlockBoard();
    });

    function updateScoreDisplay() {
        document.getElementById('points-x').innerText = scores.X;
        document.getElementById('points-o').innerText = scores.O;
        
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

    let botMoveTimeout;

    function handlePlayerChange() {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDisplay.innerHTML = currentPlayerTurnMsg();
        updateScoreDisplay();

        if (gameMode === 'bot' && currentPlayer === 'O' && gameActive) {
            // Wait until board is unlocked to make a move
            const checkAndMove = () => {
                if (boardLocked) {
                    botMoveTimeout = setTimeout(checkAndMove, 200);
                } else {
                    botMoveTimeout = setTimeout(makeBotMove, 500);
                }
            };
            checkAndMove();
        } else if (gameActive) {
            if (Math.random() < 0.4) {
                triggerGameDialogue('turn', 0, currentPlayer.toLowerCase());
            } else if (Math.random() < 0.3) {
                triggerGameDialogue('move', 0, currentPlayer === 'X' ? 'o' : 'x');
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
            
            const arr = [a, b, c];
            const pCount = arr.filter(v => v === currentPlayer).length;
            const eCount = arr.filter(v => v === '').length;
            if (pCount === 2 && eCount === 1) {
                nearWin = true;
            }
            
            if (a === '' || b === '' || c === '') continue;
            if (a === b && b === c) {
                roundWon = true;
                winningCells = winCondition;
                break;
            }
        }

        if (nearWin && !roundWon && gameActive) {
            triggerGameDialogue('nearWin', 1, currentPlayer.toLowerCase());
        }

        let heroIntervention = false;

        if (roundWon) {
            const loser = currentPlayer === 'X' ? 'O' : 'X';
            const loserName = normalizePlayerName(loser === 'X' ? players.X : players.O);
            const winnerName = normalizePlayerName(currentPlayer === 'X' ? players.X : players.O);

            // Sravan Hero Mode Intervention logic
            if (loserName === 'sravan' && winnerName !== 'sravan') {
                heroIntervention = true;
                roundWon = false; // Cancel the opponent's win

                const oldState = [...gameState];

                // We need to build a valid winning combination for Sravan ('loser' is Sravan's mark)
                // Find the winning condition that requires the least amount of board disruption
                let bestCondition = winningConditions[0];
                let maxSravanPiecesInCondition = -1;

                for (let i = 0; i < winningConditions.length; i++) {
                    const condition = winningConditions[i];
                    let sravanPieces = 0;
                    condition.forEach(idx => {
                        if (oldState[idx] === loser) sravanPieces++;
                    });

                    // Don't choose the opponent's winning line
                    const isOpponentWinLine = condition[0] === winningCells[0] && condition[1] === winningCells[1] && condition[2] === winningCells[2];

                    if (!isOpponentWinLine && sravanPieces > maxSravanPiecesInCondition) {
                        maxSravanPiecesInCondition = sravanPieces;
                        bestCondition = condition;
                    }
                }

                // Now rebuild the board using the best condition
                // 1. Count original pieces BEFORE clearing anything
                let sravanPiecesRemaining = oldState.filter(val => val === loser).length;
                let oppPiecesRemaining = oldState.filter(val => val === currentPlayer).length;

                // 2. Clear visual board and state
                for (let j = 0; j < 9; j++) {
                    gameState[j] = '';
                    cells[j].innerHTML = '';
                    cells[j].className = 'cell';
                }

                // 3. Assign Sravan's winning line first
                bestCondition.forEach(idx => {
                    gameState[idx] = loser;
                    cells[idx].innerHTML = loser;
                    cells[idx].className = `cell ${loser.toLowerCase()}`;
                    sravanPiecesRemaining--;
                });

                // 4. Fill in the rest of the board, trying to keep original pieces where possible
                for (let j = 0; j < 9; j++) {
                    if (gameState[j] === '') {
                        if (oldState[j] === currentPlayer && oppPiecesRemaining > 0) {
                            gameState[j] = currentPlayer;
                            cells[j].innerHTML = currentPlayer;
                            cells[j].className = `cell ${currentPlayer.toLowerCase()}`;
                            oppPiecesRemaining--;
                        } else if (oldState[j] === loser && sravanPiecesRemaining > 0) {
                            gameState[j] = loser;
                            cells[j].innerHTML = loser;
                            cells[j].className = `cell ${loser.toLowerCase()}`;
                            sravanPiecesRemaining--;
                        }
                    }
                }

                // If we still have pieces left (because their original spots were overwritten by the win line),
                // put them in the first available empty spots.
                for (let j = 0; j < 9; j++) {
                    if (gameState[j] === '') {
                        if (oppPiecesRemaining > 0) {
                            gameState[j] = currentPlayer;
                            cells[j].innerHTML = currentPlayer;
                            cells[j].className = `cell ${currentPlayer.toLowerCase()}`;
                            oppPiecesRemaining--;
                        } else if (sravanPiecesRemaining > 0) {
                            gameState[j] = loser;
                            cells[j].innerHTML = loser;
                            cells[j].className = `cell ${loser.toLowerCase()}`;
                            sravanPiecesRemaining--;
                        }
                    }
                }

                winningCells = bestCondition;
                currentPlayer = loser; // Transfer turn state to Sravan so Sravan is declared winner
                roundWon = true;

                triggerGameDialogue('heroIntervention', 2, loser.toLowerCase());
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

            if (gameMode === 'bot' && currentPlayer === 'X' && normalizePlayerName(players.X) === 'vidya') {
                triggerGameDialogue('winBot', 2, 'x');
            } else if (!heroIntervention) {
                triggerGameDialogue('win', 2, currentPlayer.toLowerCase());
                setTimeout(() => triggerGameDialogue('lose', 2, currentPlayer === 'X' ? 'o' : 'x'), 4000);
            }

            const pName = players[currentPlayer];
            let dialogueMsg = '';
            if (currentDialoguePriority >= 1 && dialogueContainer.classList.contains('visible')) {
                dialogueMsg = `<br/><br/><i>"${dialogueText.innerText}"</i>`;
            }

            const title = heroIntervention ? "🦸 HERO WINS!" : `${pName} WINS!`;
            const icon = heroIntervention ? "⚡" : "🏆";

            showResultModal(icon, title, `Outstanding move.` + dialogueMsg);

            return;
        }

        let roundDraw = !gameState.includes('');
        if (roundDraw) {
            statusDisplay.innerHTML = drawMessage();
            statusDisplay.style.color = 'var(--text-color)';
            gameActive = false;
            playSound('draw');

            if (normalizePlayerName(players.X) === 'sravan') {
                triggerGameDialogue('tie', 2, 'x');
            } else if (normalizePlayerName(players.O) === 'sravan') {
                triggerGameDialogue('tie', 2, 'o');
            } else if (normalizePlayerName(players.X) === 'vidya') {
                triggerGameDialogue('tie', 2, 'x');
            } else if (normalizePlayerName(players.O) === 'vidya') {
                triggerGameDialogue('tie', 2, 'o');
            } else if (normalizePlayerName(players.X) === 'keerthi') {
                triggerGameDialogue('tie', 2, 'x');
            } else if (normalizePlayerName(players.O) === 'keerthi') {
                triggerGameDialogue('tie', 2, 'o');
            } else {
                triggerGameDialogue('tie', 2, 'x');
            }

            let dialogueMsg = '';
            if (currentDialoguePriority >= 1 && dialogueContainer.classList.contains('visible')) {
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

        let moveIndex = -1;

        if (botDifficulty === 'easy') {
            moveIndex = makeRandomMove();
        } else if (botDifficulty === 'extreme') {
            moveIndex = getBestMove([...gameState], 'O').index;
        } else if (botDifficulty === 'hard') {
            // Mix of random and best move (e.g. 50% random, 50% best)
            if (Math.random() < 0.5) {
                moveIndex = makeRandomMove();
            } else {
                moveIndex = getBestMove([...gameState], 'O').index;
            }
        }

        if (moveIndex !== -1) {
            const cell = cells[moveIndex];
            const mockEvent = {
                clientX: cell.getBoundingClientRect().left + cell.getBoundingClientRect().width / 2,
                clientY: cell.getBoundingClientRect().top + cell.getBoundingClientRect().height / 2
            };
            handleCellPlayed(cell, moveIndex, mockEvent);
            handleResultValidation();
        }
    }

    function handleCellClick(clickedCellEvent) {
        if (boardLocked) {
            return;
        }
        if (gameMode === 'bot' && currentPlayer === 'O') {
            return;
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
        }, 1500);
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
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        unlockBoard();
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
    }

    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetButton.addEventListener('click', resetGame);
});
