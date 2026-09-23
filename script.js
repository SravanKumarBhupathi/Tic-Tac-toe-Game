document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');
    const setupModal = document.getElementById('setup-modal');
    const gameContainer = document.getElementById('game-container');
    const startGameBtn = document.getElementById('start-game-btn');
    const changePlayersBtn = document.getElementById('change-players-btn');
    const gameControls = document.getElementById('game-controls');

    let gameActive = false;
    let currentPlayer = 'X';
    let gameState = ['', '', '', '', '', '', '', '', ''];
    let scores = { X: 0, O: 0 };
    let players = { X: 'Player X', O: 'Player O' };

    let gameMode = 'local';
    let botDifficulty = 'easy';

    let lastGameResult = null;
    let hardGamesPlayed = 0;
    let trickActiveThisGame = false;
    let firstUserMoveIndex = -1;
    let trickExecuted = false;

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
            start: ["Welcome to Tic-Tac-Toe! 😎 Let's see who regrets starting this game first. 😂"],
            win: [(winner) => `Congratulations, ${winner}! 🏆 You actually knew what you were doing. 😂`],
            lose: ["GG! 😂 Maybe blame the board and try again."],
            tie: ["It's a tie! 🤝 Nobody won, nobody lost. Perfect excuse for a rematch. 😂"]
        },
        'sravan': {
            start: [
                "HAHA! You really thought you could defeat the developer? Sorry bro... NOT POSSIBLE! 😜🤟",
                "You came here to defeat Sravan? Bro, you entered the wrong game. 😂🦸",
                "Nice try! But the Hero has developer privileges. 😎🤟",
                "You almost had him... almost. Then the developer remembered who Sravan is. 😂",
                "Plot twist! Sravan was never supposed to lose. 😜🔥",
                "Opponent strategy detected... and rejected by the developer. 🤣",
                "You played well. Unfortunately, this game has a Sravan-shaped problem. 😜",
                "The Hero has spoken. The scoreboard has no choice. 🦸🔥"
            ],
            heroIntervention: [
                "HAHA! YOU TRIED TO DEFEAT THE DEVELOPER?! SORRY BRO... NOT POSSIBLE! 😜🤟",
                "🚨 HERO MODE ACTIVATED 🚨 Relax everyone. The Hero cannot lose. 😎",
                "The universe has corrected the mistake. 😂 Nice try. But Sravan is the Hero. 🦸"
            ],
            win: ["SRAVAN WINS! 🦸🔥 As expected. The Hero has saved the day again.", "SRAVAN WINS! 😎 Did anyone seriously expect another result?", "Victory achieved. The Hero remains undefeated. 🦸🏆"],
            tie: ["It's a tie! Even the Hero decided to be generous. 😂", "Sravan didn't lose. That's what matters. 😎"]
        },
        'keerthi': {
            start: [
                (opp) => `Ohhh wow! Keerthi entered! 😂 ${opp}, just give the game to Keerthi and go somewhere else.`
            ],
            win: [
                (opp) => `${opp}, I told you before the game started. You should've gone somewhere else. 😂`
            ],
            lose: [
                "So sad, Keerthi! 😂 Maybe it's time to change your friend circle. Vidya's brainless energy is clearly contagious. Be careful next time! 😜"
            ],
            tie: [
                "It's a tie! 🤝 Keerthi, you definitely have the brain 🧠... but after travelling with Vidya, some of that brainpower seems to have gone missing. 😂😜"
            ]
        },
        'vidya': {
            start: ["Welcome Vidya! 😈 Let's see if that brain is ready today.", "Vidya has entered the game! 😂 Please locate your brain before making the first move. 🧠"],
            win: ["VIDYA WINS! 🏆 Okay... that was actually impressive. 😂"],
            lose: ["😂 Vidya lost! Somebody screenshot this historic moment."],
            tie: ["🤝 It's a tie! Vidya, can you please stop drinking Magic Moments? Then you might actually focus and win the match. 😜"]
        }
    };

    // Special Matchups mapping
    const specialMatchups = {
        'sravan_vidya': {
            start: "Brainless Vidya is challenging the developer Sravan? 😂 Okay... let's start.",
            sravan_win: "I told you, brainless Vidya! You really thought Sravan would lose? 😂🦸"
        },
        'keerthi_sravan': {
            start: "Keerthi, it's not easy playing with Sravan. So think hard and move smartly. 🧠😜",
            sravan_win: "You're Vidya's friend, right? 😂 Then moving smartly was never going to be easy. 🧠😜 Better luck next time!"
        },
        'keerthi_vidya': {
            start: "Ohhh no... Vidya and Keerthi are playing each other. 😂 Let's see which brain arrives first.",
            tie: "It's a tie! 🤣 Keerthi brought the brain 🧠, Vidya brought the Magic Moments... and somehow nobody won."
        }
    };

    let voiceEnabled = localStorage.getItem('voiceEnabled') !== 'false'; // Default ON
    let selectedVoiceURI = localStorage.getItem('selectedVoiceURI') || '';
    let currentDialoguePriority = 0; // 0=None, 1=Start, 2=Matchup, 3=HeroIntervention, 4=Result
    let dialogueTimeout;
    let isDialogueSpeaking = false;
    let boardLocked = false;
    let botMoveTimeout;
    let availableVoices = [];

    const dialogueContainer = document.getElementById('dialogue-wrapper');
    const dialogueText = document.getElementById('dialogue-text');

    // Voice Setup UI
    const voiceToggleBtn = document.getElementById('setup-voice-toggle');
    const gameVoiceToggleBtn = document.getElementById('voice-toggle-btn');
    const voiceSelect = document.getElementById('voice-select');

    function populateVoiceList() {
        if (!window.speechSynthesis) return;
        availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length === 0) return;

        voiceSelect.innerHTML = '';

        // Try to find a good English Male voice by default if none selected
        let defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Guy') || v.name.includes('Arthur')));
        if (!defaultVoice) defaultVoice = availableVoices.find(v => v.lang.startsWith('en'));
        if (!defaultVoice) defaultVoice = availableVoices[0];

        let foundSelected = false;

        availableVoices.forEach((voice) => {
            if (voice.lang.startsWith('en')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.voiceURI;

                if (selectedVoiceURI === voice.voiceURI) {
                    option.selected = true;
                    foundSelected = true;
                }

                voiceSelect.appendChild(option);
            }
        });

        if (!foundSelected && defaultVoice) {
            selectedVoiceURI = defaultVoice.voiceURI;
            voiceSelect.value = selectedVoiceURI;
            localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
        }
    }

    if (window.speechSynthesis) {
        populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }

    voiceSelect.addEventListener('change', (e) => {
        selectedVoiceURI = e.target.value;
        localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
        speakDialogue("Voice selected.");
    });

    function updateVoiceUI() {
        if (voiceToggleBtn) {
            voiceToggleBtn.classList.toggle('active', voiceEnabled);
            voiceToggleBtn.innerHTML = voiceEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
            voiceToggleBtn.setAttribute('title', voiceEnabled ? 'Voice On' : 'Voice Off');
            voiceSelect.disabled = !voiceEnabled;
        }
        if (gameVoiceToggleBtn) {
            gameVoiceToggleBtn.classList.toggle('active', voiceEnabled);
            gameVoiceToggleBtn.innerHTML = voiceEnabled ? '<span class="icon">🔊</span>' : '<span class="icon">🔇</span>';
            gameVoiceToggleBtn.setAttribute('title', voiceEnabled ? 'Voice On' : 'Voice Off');
        }
    }

    [voiceToggleBtn, gameVoiceToggleBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                voiceEnabled = !voiceEnabled;
                localStorage.setItem('voiceEnabled', voiceEnabled);
                updateVoiceUI();
                if (!voiceEnabled && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    unlockBoard();
                }
            });
        }
    });

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
        if (!voiceEnabled || !window.speechSynthesis) {
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanEmojiForSpeech(text));

        const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

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

    function fireDialogue(text, priority = 0) {
        if (priority < currentDialoguePriority && currentDialoguePriority !== 0) {
            return;
        }

        dialogueText.innerText = text;
        dialogueContainer.classList.add('visible');
        currentDialoguePriority = priority;
        speakDialogue(text);

        clearTimeout(dialogueTimeout);
        if (priority < 4) {
            const waitTime = voiceEnabled ? Math.max(4000, text.length * 60) : 4000;
            dialogueTimeout = setTimeout(() => {
                if (currentDialoguePriority < 4) {
                    dialogueContainer.classList.remove('visible');
                    currentDialoguePriority = 0;
                }
            }, waitTime);
        }
    }

    function getSpecialMatchup(p1, p2) {
        const arr = [p1, p2].sort().join('_');
        return specialMatchups[arr] ? arr : null;
    }

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

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
        setTimeout(() => emoji.remove(), 2000);
    }

    function triggerWinCelebration() {
        var duration = 3000;
        var end = Date.now() + duration;

        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff8c00', '#ff4757', '#0984e3'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff8c00', '#ff4757', '#0984e3'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }

    const currentPlayerTurnMsg = () => `${currentPlayer === 'X' ? players.X : players.O}'s turn`;
    const winningMessage = () => `${currentPlayer === 'X' ? players.X : players.O} Wins!`;
    const drawMessage = () => `Game Ended in a Draw!`;

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

        players.X = document.getElementById('player-x').value.trim() || 'Player X';
        players.O = gameMode === 'bot' ? 'Bot' : (document.getElementById('player-o').value.trim() || 'Player O');
        
        document.getElementById('name-display-x').innerText = players.X;
        document.getElementById('name-display-o').innerText = players.O;
        
        setupModal.style.display = 'none';
        gameContainer.style.display = 'block';
        gameContainer.style.opacity = '1';
        updateVoiceUI();
        
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        resetGame();

        // Start Logic
        const p1 = normalizePlayerName(players.X);
        const p2 = normalizePlayerName(players.O);
        const matchup = getSpecialMatchup(p1, p2);

        if (matchup && specialMatchups[matchup].start) {
            fireDialogue(specialMatchups[matchup].start, 2);
        } else if (p1 === 'sravan' || p2 === 'sravan') {
            const arr = specialPlayers['sravan'].start;
            fireDialogue(arr[Math.floor(Math.random() * arr.length)], 1);
        } else if (p1 === 'keerthi') {
            const f = specialPlayers['keerthi'].start[0];
            fireDialogue(f(getOpponentName('x')), 1);
        } else if (p2 === 'keerthi') {
            const f = specialPlayers['keerthi'].start[0];
            fireDialogue(f(getOpponentName('o')), 1);
        } else if (p1 === 'vidya' || p2 === 'vidya') {
            const arr = specialPlayers['vidya'].start;
            fireDialogue(arr[Math.floor(Math.random() * arr.length)], 1);
        } else {
            const arr = specialPlayers['default'].start;
            fireDialogue(arr[Math.floor(Math.random() * arr.length)], 1);
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
        if(activeScore) {
            activeScore.style.transform = 'scale(1.1)';
            activeScore.style.transition = 'transform 0.3s ease';
        }
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
            const checkAndMove = () => {
                if (boardLocked) {
                    botMoveTimeout = setTimeout(checkAndMove, 200);
                } else {
                    botMoveTimeout = setTimeout(makeBotMove, 500);
                }
            };
            checkAndMove();
        }
    }

    const resultPanel = document.getElementById('result-panel');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultIcon = document.getElementById('result-icon');
    const resultActions = document.getElementById('result-actions');
    const rematchBtn = document.getElementById('rematch-btn');
    const homeBtn = document.getElementById('home-btn');

    function showResultPanel(icon, title, message, isHeroMode = false) {
        resultIcon.innerText = icon;
        resultTitle.innerText = title;
        resultMessage.innerHTML = message;
        resultPanel.style.display = 'block';
        gameControls.style.display = 'none';

        if (isHeroMode) {
            resultPanel.classList.add('hero-mode');
        } else {
            resultPanel.classList.remove('hero-mode');
        }

        setTimeout(() => {
            resultActions.style.display = 'flex';
        }, 4000);
    }

    rematchBtn.addEventListener('click', () => {
        resultPanel.style.display = 'none';
        resultActions.style.display = 'none';
        gameControls.style.display = 'flex';
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
        resetGame();
    });

    homeBtn.addEventListener('click', () => {
        resultPanel.style.display = 'none';
        resultActions.style.display = 'none';
        gameControls.style.display = 'flex';
        gameContainer.style.display = 'none';
        setupModal.style.display = 'flex';
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        unlockBoard();
    });

    function resolveFinalDialogue(winnerRaw, loserRaw, isTie, isHeroIntervention) {
        const w = normalizePlayerName(winnerRaw);
        const l = normalizePlayerName(loserRaw);

        if (isHeroIntervention) {
            const matchup = getSpecialMatchup(w, l);
            if (matchup && specialMatchups[matchup].sravan_win) {
                return specialMatchups[matchup].sravan_win;
            }
            const arr = specialPlayers['sravan'].heroIntervention;
            return arr[Math.floor(Math.random() * arr.length)];
        }

        if (isTie) {
            const matchup = getSpecialMatchup(w, l);
            if (matchup && specialMatchups[matchup].tie) {
                return specialMatchups[matchup].tie;
            }
            if (w === 'sravan' || l === 'sravan') {
                const arr = specialPlayers['sravan'].tie;
                return arr[Math.floor(Math.random() * arr.length)];
            }
            if (w === 'vidya' || l === 'vidya') {
                return specialPlayers['vidya'].tie[0];
            }
            if (w === 'keerthi' || l === 'keerthi') {
                return specialPlayers['keerthi'].tie[0];
            }
            return specialPlayers['default'].tie[0];
        }

        const matchup = getSpecialMatchup(w, l);
        if (w === 'sravan' && matchup && specialMatchups[matchup].sravan_win) {
            return specialMatchups[matchup].sravan_win;
        }

        if (w === 'sravan') {
            const arr = specialPlayers['sravan'].win;
            return arr[Math.floor(Math.random() * arr.length)];
        }

        if (w === 'keerthi') {
            const f = specialPlayers['keerthi'].win[0];
            return f(loserRaw);
        }

        if (l === 'keerthi') {
            return specialPlayers['keerthi'].lose[0];
        }

        if (w === 'vidya') {
            return specialPlayers['vidya'].win[0];
        }

        if (l === 'vidya') {
            return specialPlayers['vidya'].lose[0];
        }

        const f = specialPlayers['default'].win[0];
        return f(winnerRaw);
    }

    function handleResultValidation() {
        let roundWon = false;
        let winningCells = [];
        
        for (let i = 0; i <= 7; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            
            if (a === '' || b === '' || c === '') continue;
            if (a === b && b === c) {
                roundWon = true;
                winningCells = winCondition;
                break;
            }
        }

        let roundDraw = !roundWon && !gameState.includes('');

        let heroIntervention = false;
        const pX = normalizePlayerName(players.X);
        const pO = normalizePlayerName(players.O);

        // SRAVAN MASS HERO MODE EVALUATION
        if ((pX === 'sravan' || pO === 'sravan') && pX !== pO) {
            const sravanID = pX === 'sravan' ? 'X' : 'O';
            const oppID = sravanID === 'X' ? 'O' : 'X';

            if ((roundWon && currentPlayer === oppID) || roundDraw) {
                heroIntervention = true;
                roundWon = false;
                roundDraw = false;

                if (winningCells.length > 0) {
                    winningCells.forEach(index => {
                        gameState[index] = '';
                        cells[index].innerHTML = '';
                        cells[index].className = 'cell';
                    });
                }

                const oldState = [...gameState];

                let bestCondition = winningConditions[0];
                let maxSravanPiecesInCondition = -1;

                for (let i = 0; i < winningConditions.length; i++) {
                    const condition = winningConditions[i];
                    let sravanPieces = 0;
                    condition.forEach(idx => {
                        if (oldState[idx] === sravanID) sravanPieces++;
                    });

                    const isOpponentWinLine = winningCells.length > 0 && condition[0] === winningCells[0] && condition[1] === winningCells[1] && condition[2] === winningCells[2];

                    if (!isOpponentWinLine && sravanPieces > maxSravanPiecesInCondition) {
                        maxSravanPiecesInCondition = sravanPieces;
                        bestCondition = condition;
                    }
                }

                if (winningCells.length > 0) {
                    winningCells.forEach(index => oldState[index] = oppID);
                }

                let sravanPiecesRemaining = oldState.filter(val => val === sravanID).length;
                let oppPiecesRemaining = oldState.filter(val => val === oppID).length;

                for (let j = 0; j < 9; j++) {
                    gameState[j] = '';
                    cells[j].innerHTML = '';
                    cells[j].className = 'cell';
                }

                bestCondition.forEach(idx => {
                    gameState[idx] = sravanID;
                    cells[idx].innerHTML = sravanID;
                    cells[idx].className = `cell ${sravanID.toLowerCase()}`;
                    sravanPiecesRemaining--;
                });

                for (let j = 0; j < 9; j++) {
                    if (gameState[j] === '') {
                        if (oldState[j] === oppID && oppPiecesRemaining > 0) {
                            gameState[j] = oppID;
                            cells[j].innerHTML = oppID;
                            cells[j].className = `cell ${oppID.toLowerCase()}`;
                            oppPiecesRemaining--;
                        } else if (oldState[j] === sravanID && sravanPiecesRemaining > 0) {
                            gameState[j] = sravanID;
                            cells[j].innerHTML = sravanID;
                            cells[j].className = `cell ${sravanID.toLowerCase()}`;
                            sravanPiecesRemaining--;
                        }
                    }
                }

                for (let j = 0; j < 9; j++) {
                    if (gameState[j] === '') {
                        if (oppPiecesRemaining > 0) {
                            gameState[j] = oppID;
                            cells[j].innerHTML = oppID;
                            cells[j].className = `cell ${oppID.toLowerCase()}`;
                            oppPiecesRemaining--;
                        } else if (sravanPiecesRemaining > 0) {
                            gameState[j] = sravanID;
                            cells[j].innerHTML = sravanID;
                            cells[j].className = `cell ${sravanID.toLowerCase()}`;
                            sravanPiecesRemaining--;
                        }
                    }
                }

                winningCells = bestCondition;
                currentPlayer = sravanID;
                roundWon = true;
            }
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
            playSound('win');

            const wRaw = currentPlayer === 'X' ? players.X : players.O;
            const lRaw = currentPlayer === 'X' ? players.O : players.X;
            const dText = resolveFinalDialogue(wRaw, lRaw, false, heroIntervention);

            fireDialogue(dText, 4);

            const title = heroIntervention ? "🦸 HERO MODE" : `🏆 ${wRaw} WINS`;
            const icon = heroIntervention ? "⚡" : "🏆";

            showResultPanel(icon, title, `<i>"${dText}"</i>`, heroIntervention);

            return;
        }

        if (roundDraw) {
            statusDisplay.innerHTML = drawMessage();
            statusDisplay.style.color = 'var(--text-color)';
            gameActive = false;
            lastGameResult = 'draw';
            if (gameMode === 'bot' && botDifficulty === 'hard') hardGamesPlayed++;
            playSound('draw');

            const dText = resolveFinalDialogue(players.X, players.O, true, false);
            fireDialogue(dText, 4);

            showResultPanel("🤝", "IT'S A TIE", `<i>"${dText}"</i>`);
            return;
        }

        handlePlayerChange();
    }

    function getBestMove(board, player) {
        const availableSpots = board.reduce((acc, cell, index) => {
            if (cell === '') acc.push(index);
            return acc;
        }, []);

        if (checkWin(board, 'X')) return { score: -10 };
        else if (checkWin(board, 'O')) return { score: 10 };
        else if (availableSpots.length === 0) return { score: 0 };

        const moves = [];
        for (let i = 0; i < availableSpots.length; i++) {
            const move = {};
            move.index = availableSpots[i];
            board[availableSpots[i]] = player;

            if (player === 'O') {
                move.score = getBestMove(board, 'X').score;
            } else {
                move.score = getBestMove(board, 'O').score;
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

        if (trickActiveThisGame && !trickExecuted && firstUserMoveIndex !== -1) {
            const botMoves = gameState.filter(cell => cell === 'O').length;
            if (botMoves === 1) {
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
                moveIndex = getBestMove([...gameState], 'O').index;
            } else {
                if (Math.random() < 0.5) moveIndex = makeRandomMove();
                else moveIndex = getBestMove([...gameState], 'O').index;
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
        if (boardLocked) return;
        if (gameMode === 'bot' && currentPlayer === 'O') return;

        const clickedCell = clickedCellEvent.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

        if (gameState[clickedCellIndex] !== '' || !gameActive) return;

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

        trickActiveThisGame = false;
        trickExecuted = false;
        firstUserMoveIndex = -1;
        clearTimeout(botMoveTimeout);

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
    resetButton.addEventListener('click', () => {
        resultPanel.style.display = 'none';
        resultActions.style.display = 'none';
        gameControls.style.display = 'flex';
        dialogueContainer.classList.remove('visible');
        currentDialoguePriority = 0;
        resetGame();
    });
});
