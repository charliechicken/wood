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
                // Store new player data
                players[data.playerId] = {
                    socket,
                    x: data.x,
                    y: data.y,
                    name: data.name,
                    icon: data.icon,
                    speedX: 0,
                    speedY: 0
                };

                // Send existing players to new player
                socket.send(JSON.stringify({
                    type: 'allPlayers',
                    players: Object.fromEntries(
                        Object.entries(players)
                            .filter(([id]) => id !== data.playerId)
                            .map(([id, player]) => [
                                id, 
                                {
                                    id,
                                    x: player.x,
                                    y: player.y,
                                    name: player.name,
                                    icon: player.icon
                                }
                            ])
                    )
                }));

                // Notify others about new player
                broadcastToOthers(data.playerId, {
                    type: 'playerJoined',
                    id: data.playerId,
                    x: data.x,
                    y: data.y,
                    name: data.name,
                    icon: data.icon
                });
                break;

                case 'update':
                    if (players[data.playerId]) {
                        // Store absolute positions
                        players[data.playerId].x = data.x;
                        players[data.playerId].y = data.absoluteY;  // Use absolute Y position
                        players[data.playerId].speedX = data.speedX;
                        players[data.playerId].speedY = data.speedY;
                        players[data.playerId].groundLevel = data.groundLevel;  // Store ground level
                
                        broadcastToOthers(data.playerId, {
                            type: 'playerMoved',
                            id: data.playerId,
                            x: data.x,
                            y: data.absoluteY,
                            groundLevel: data.groundLevel,
                            speedX: data.speedX,
                            speedY: data.speedY
                        });
                    }
                    break;

            case 'jump':
                broadcastToOthers(data.playerId, {
                    type: 'playerJumped',
                    id: data.playerId
                });
                case 'chat':
                    // Broadcast chat message to all players
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
        // Find and remove disconnected player
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