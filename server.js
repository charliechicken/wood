const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

wss.on('connection', (socket) => {
    socket.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch(data.type) {
            case 'join':
                players[data.playerId] = {
                    socket,
                    xPercent: data.xPercent,
                    yPercent: data.yPercent,
                    name: data.playerName,
                    icon: data.icon,
                    speedX: 0,
                    speedY: 0,
                    screenHeight: data.screenHeight,
                    groundLevel: data.groundLevel,
                    level: data.level  // Add this line
                };

                // Broadcast new player to others
                socket.send(JSON.stringify({
                    type: 'allPlayers',
                    players: Object.fromEntries(
                        Object.entries(players)
                            .filter(([id]) => id !== data.playerId)
                            .map(([id, player]) => [id, {
                                id,
                                xPercent: player.xPercent,
                                yPercent: player.yPercent,
                                name: player.name,
                                icon: player.icon,
                                screenHeight: player.screenHeight,
                                groundLevel: player.groundLevel,
                                level: player.level  // Add level information
                            }])
                    )
                }));

                // Send existing players to new player
                socket.send(JSON.stringify({
                    type: 'allPlayers',
                    players: Object.fromEntries(
                        Object.entries(players)
                            .filter(([id]) => id !== data.playerId)
                            .map(([id, player]) => [id, {
                                id,
                                xPercent: player.xPercent,
                                yPercent: player.yPercent,
                                name: player.name,
                                icon: player.icon,
                                screenHeight: player.screenHeight,
                                groundLevel: player.groundLevel
                            }])
                    )
                }));
                break;

            case 'update':
                if (players[data.playerId]) {
                    players[data.playerId].xPercent = data.xPercent;
                    players[data.playerId].yPercent = data.yPercent;
                    players[data.playerId].speedX = data.speedX;
                    players[data.playerId].speedY = data.speedY;
                    players[data.playerId].screenHeight = data.screenHeight;
                    players[data.playerId].groundLevel = data.groundLevel;
                    players[data.playerId].level = data.level;  // Add level information

                    broadcastToOthers(data.playerId, {
                        type: 'playerMoved',
                        id: data.playerId,
                        xPercent: data.xPercent,
                        yPercent: data.yPercent,
                        speedX: data.speedX,
                        speedY: data.speedY,
                        screenHeight: data.screenHeight,
                        groundLevel: data.groundLevel,
                        level: data.level  // Add level information
                    });
                }
                break;

            case 'chat':
                broadcastToAll({
                    type: 'chatMessage',
                    playerId: data.playerId,
                    playerName: data.playerName,
                    message: data.message
                });
                break;
        }
    });

    socket.on('close', () => {
        const disconnectedId = Object.keys(players).find(
            id => players[id].socket === socket
        );

        if (disconnectedId) {
            delete players[disconnectedId];
            broadcastToAll({
                type: 'playerLeft',
                id: disconnectedId
            });
        }
    });
});

function broadcastToOthers(senderId, message) {
    Object.entries(players).forEach(([id, player]) => {
        if (id !== senderId && player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(message));
        }
    });
}

function broadcastToAll(message) {
    Object.values(players).forEach(player => {
        if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(message));
        }
    });
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});