const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const quizData = fs.readFileSync('all_anki_cards (5).txt', 'utf8')
    .split('\n')
    .filter(line => line.includes('\t'))
    .map(line => {
        const [question, answer] = line.split('\t');
        const parts = answer.trim().split('  ');
        const source = parts[parts.length - 1];
        const fullSource = source.includes('-') ? source.substring(0, source.lastIndexOf('Round')).trim() + source.substring(source.lastIndexOf('Round')) : source;
        return {
            question: question.trim(),
            answer: answer.replace('ANSWER:', '').replace(source, '').trim(),
            source: fullSource
        };
    });

const rooms = {
    public: {
        players: [],
        scores: {},
        streaks: {},
        fastestBuzz: {},
        correctAnswers: {},
        wrongAnswers: {},
        currentQuestion: null,
        questionIndex: 0,
        isRevealing: false,
        revealInterval: null,
        buzzed: false,
        currentBuzzer: null,
        revealSpeed: 200,
        autoProgress: false,
        gameInProgress: false,
        currentWords: [],
        questionStartTime: null
    },
    private: {}
};

function checkAnswer(userAnswer, correctAnswer) {
    userAnswer = userAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
    correctAnswer = correctAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (userAnswer === correctAnswer) return true;
    if (correctAnswer.includes(userAnswer) && userAnswer.length > 3) return true;
    if (userAnswer.includes(correctAnswer) && correctAnswer.length > 3) return true;
    
    return false;
}

io.on('connection', (socket) => {
    socket.username = '';

    socket.on('joinRoom', (roomType, username, isReconnect) => {
        socket.username = username;

        if (roomType === 'public') {
            socket.join('public');
            if (!isReconnect || !rooms.public.players.includes(username)) {
                rooms.public.players.push(username);
                rooms.public.scores[username] = rooms.public.scores[username] || 0;
            }
            
            socket.emit('gameState', {
                gameInProgress: rooms.public.gameInProgress,
                currentWords: rooms.public.isRevealing ? rooms.public.currentWords : [],
                players: rooms.public.players,
                scores: rooms.public.scores,
                isRevealing: rooms.public.isRevealing
            });
        } else {
            if (isReconnect && rooms[socket.id] && rooms[socket.id].players.includes(username)) {
                socket.join(socket.id);
                socket.emit('gameState', {
                    gameInProgress: rooms[socket.id].gameInProgress,
                    currentWords: rooms[socket.id].currentWords,
                    players: rooms[socket.id].players,
                    scores: rooms[socket.id].scores,
                    isRevealing: rooms[socket.id].isRevealing
                });
            } else {
                const privateRoom = {
                    players: [username],
                    scores: { [username]: 0 },
                    streaks: {},
                    fastestBuzz: {},
                    correctAnswers: {},
                    wrongAnswers: {},
                    currentQuestion: null,
                    questionIndex: 0,
                    isRevealing: false,
                    revealInterval: null,
                    buzzed: false,
                    currentBuzzer: null,
                    revealSpeed: 200,
                    autoProgress: false,
                    gameInProgress: false,
                    currentWords: [],
                    questionStartTime: null
                };
                rooms[socket.id] = privateRoom;
                socket.join(socket.id);
            }
        }
        
        io.to(roomType === 'public' ? 'public' : socket.id).emit('playerJoined', {
            players: roomType === 'public' ? rooms.public.players : [username],
            scores: roomType === 'public' ? rooms.public.scores : { [username]: 0 }
        });
    });

    socket.on('startGame', (roomType) => {
        const room = roomType === 'public' ? rooms.public : rooms[socket.id];
        if (!room) return;
        
        room.gameInProgress = true;
        startNewQuestion(room, roomType === 'public' ? 'public' : socket.id);
        
        io.to(roomType === 'public' ? 'public' : socket.id).emit('gameStarted', {
            gameInProgress: true
        });
    });

    socket.on('buzz', (roomType) => {
        const room = roomType === 'public' ? rooms.public : rooms[socket.id];
        if (!room || room.buzzed) return;

        const username = socket.username;
        const player = room.players.find(p => p === username);

        if (!player) return;

        room.currentBuzzTime = Date.now() - room.questionStartTime;
        room.buzzed = true;
        room.currentBuzzer = player;

        if (room.revealInterval) {
            clearInterval(room.revealInterval);
            room.isRevealing = false;
        }

        io.to(roomType === 'public' ? 'public' : socket.id).emit('revealWord', {
            fullText: room.currentQuestion.question,
            isComplete: true
        });

        io.to(roomType === 'public' ? 'public' : socket.id).emit('playerBuzzed', { 
            player,
            buzzTime: room.currentBuzzTime
        });
    });

    socket.on('submitAnswer', (roomType, answer) => {
        const room = roomType === 'public' ? rooms.public : rooms[socket.id];
        if (!room || !room.currentQuestion || !room.buzzed) return;

        const username = socket.username;
        const player = room.players.find(p => p === username);

        if (!player || player !== room.currentBuzzer) return;

        const isCorrect = checkAnswer(answer, room.currentQuestion.answer);
        
        // Update scores and stats
        room.correctAnswers[player] = room.correctAnswers[player] || 0;
        room.wrongAnswers[player] = room.wrongAnswers[player] || 0;
        room.streaks[player] = room.streaks[player] || 0;
        
        if (isCorrect) {
            room.scores[player] = (room.scores[player] || 0) + 10;
            room.correctAnswers[player]++;
            room.streaks[player]++;
        } else {
            room.scores[player] = (room.scores[player] || 0) - 5;
            room.wrongAnswers[player]++;
            room.streaks[player] = 0;
        }

        const totalAnswers = room.correctAnswers[player] + room.wrongAnswers[player];
        const accuracy = totalAnswers > 0 ? 
            Math.round((room.correctAnswers[player] / totalAnswers) * 100) : 0;

        if (!room.fastestBuzz[player] || room.currentBuzzTime < room.fastestBuzz[player]) {
            room.fastestBuzz[player] = room.currentBuzzTime;
        }

        io.to(roomType === 'public' ? 'public' : socket.id).emit('answerResult', {
            correct: isCorrect,
            player: player,
            correctAnswer: room.currentQuestion.answer,
            source: room.currentQuestion.source,
            scores: room.scores,
            showNextButton: true,
            question: room.currentQuestion.question,
            stats: {
                streak: room.streaks[player] || 0,
                accuracy: accuracy,
                totalCorrect: room.correctAnswers[player],
                fastestBuzz: room.fastestBuzz[player] || null
            }
        });
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (!room || !room.players) continue;
            
            const socketRoom = io.sockets.adapter.rooms.get(roomId);
            const player = socketRoom ? 
                room.players.find(p => socketRoom.has(socket.id)) : 
                null;
            
            if (player) {
                room.players = room.players.filter(p => p !== player);
                delete room.scores[player];
                io.to(roomId).emit('playerJoined', {
                    players: room.players,
                    scores: room.scores
                });
                
                if (room.players.length === 0) {
                    delete rooms[roomId];
                }
            }
        }
    });

    socket.on('updateSpeed', (roomId, speed) => {
        const room = rooms[roomId];
        if (!room) return;
        
        room.revealSpeed = speed;
        
        if (room.isRevealing && room.revealInterval) {
            clearInterval(room.revealInterval);
            
            room.revealInterval = setInterval(() => {
                const words = room.currentQuestion.question.split(' ');
                const wordsToSend = words.slice(room.wordIndex, room.wordIndex + 2).join(' ');
                if (room.wordIndex < words.length) {
                    room.currentWords.push(wordsToSend);
                    io.to(roomId).emit('revealWord', { 
                        word: wordsToSend,
                        fullText: room.currentWords.join(' ')
                    });
                    room.wordIndex += 2;
                } else {
                    clearInterval(room.revealInterval);
                    room.isRevealing = false;
                }
            }, speed);
        }
        
        io.to(roomId).emit('speedUpdated', { speed });
    });

    socket.on('nextQuestion', (roomType) => {
        const room = roomType === 'public' ? rooms.public : rooms[socket.id];
        if (!room) return;
        
        startNewQuestion(room, roomType === 'public' ? 'public' : socket.id);
    });

    socket.on('answerResult', ({ correct, player, correctAnswer, scores, showNextButton }) => {
        const result = document.getElementById('result');
        result.textContent = correct ? 
            `${player} got it right!` : 
            `Incorrect. The answer was: ${correctAnswer}`;
        result.className = `result ${correct ? 'correct' : 'incorrect'}`;
        
        updateScoreboard(scores, Object.keys(scores));
        
        if (showNextButton) {
            document.getElementById('next-question').style.display = 'block';
            document.getElementById('buzz-button').style.display = 'none';
            document.getElementById('answer-form').style.display = 'none';
        }
    });

    socket.on('newQuestion', () => {
        document.getElementById('question').textContent = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = 'result';
        document.getElementById('next-question').style.display = 'none';
        document.getElementById('buzz-button').style.display = 'block';
        document.getElementById('answer-form').style.display = 'none';
        currentQuestion = [];
    });

    socket.on('revealWord', ({ word, fullText }) => {
        document.getElementById('question').textContent = fullText;
    });

    socket.on('leaveRoom', (roomType) => {
        const room = roomType === 'public' ? rooms.public : rooms[socket.id];
        if (!room) return;
        
        const username = socket.username;
        if (username) {
            room.players = room.players.filter(p => p !== username);
            delete room.scores[username];
            
            // Notify remaining players
            io.to(roomType === 'public' ? 'public' : socket.id).emit('playerJoined', {
                players: room.players,
                scores: room.scores
            });
            
            // Clean up empty private rooms
            if (roomType !== 'public' && room.players.length === 0) {
                delete rooms[socket.id];
            }
        }
        
        socket.leave(roomType === 'public' ? 'public' : socket.id);
    });
});





function startNewQuestion(room, roomId) {
    room.buzzed = false;
    room.currentBuzzer = null;
    room.questionIndex = Math.floor(Math.random() * quizData.length);
    room.currentQuestion = quizData[room.questionIndex];
    room.isRevealing = true;
    room.wordIndex = 0;
    room.currentWords = [];
    room.questionStartTime = Date.now();

    const words = room.currentQuestion.question.split(' ');

    if (room.revealInterval) {
        clearInterval(room.revealInterval);
    }

    io.to(roomId).emit('newQuestion');

    // Small delay before starting to reveal words
    setTimeout(() => {
        room.revealInterval = setInterval(() => {
            const wordsToSend = words.slice(room.wordIndex, room.wordIndex + 2).join(' ');
            if (room.wordIndex < words.length) {
                room.currentWords.push(wordsToSend);
                io.to(roomId).emit('revealWord', { 
                    word: wordsToSend,
                    fullText: room.currentWords.join(' ')
                });
                room.wordIndex += 2;
            } else {
                clearInterval(room.revealInterval);
                room.isRevealing = false;
                // Start 5-second timer when question is fully revealed
                io.to(roomId).emit('startTimer');
                setTimeout(() => {
                    if (!room.buzzed) {
                        io.to(roomId).emit('timerEnded', {
                            question: room.currentQuestion.question,
                            answer: room.currentQuestion.answer,
                            source: room.currentQuestion.source
                        });
                    }
                }, 5000);
            }
        }, room.revealSpeed || 200);
    }, 500);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});