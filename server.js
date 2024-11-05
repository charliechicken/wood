const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Create an Express app
const app = express();

// Create an HTTP server for the Express app
const server = http.createServer(app);

// Create a WebSocket server that uses the same HTTP server
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' folder (you can place index.html here)
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket logic
const players = {}; // Object to hold connected players

wss.on('connection', (socket) => {
  let playerId = Date.now(); // Generate a unique ID for the player
  players[playerId] = { socket, x: 50, y: 50, name: "Player " + playerId, icon: 'hawktuah.png' }; // Store player info and socket

  console.log(`Player connected: ${playerId}, Total players: ${Object.keys(players).length}`);

  // Send all existing players to the new player
  const allPlayersMessage = JSON.stringify({
    type: 'allPlayers',
    players: Object.fromEntries(
      Object.entries(players).map(([id, player]) => [
        id,
        { id, x: player.x, y: player.y, name: player.name, icon: player.icon }
      ])
    )
  });
  socket.send(allPlayersMessage);

  // Notify all players of the new player
  for (const id in players) {
    if (players[id].socket.readyState === WebSocket.OPEN && id !== playerId) {
      players[id].socket.send(JSON.stringify({
        type: 'playerConnected',
        id: playerId,
        name: players[playerId].name,
        icon: players[playerId].icon,
        x: players[playerId].x,
        y: players[playerId].y
      }));
    }
  }

  socket.on('message', (message) => {
    const data = JSON.parse(message);
    console.log(`Received message from ${data.id}: ${data.type}`);

    if (data.type === 'positionUpdate') {
      // Update the player's position in the server
      if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        console.log(`Updated position for ${data.id}: (${data.x}, ${data.y})`);
      }

      // Broadcast updated player position to all players
      for (const id in players) {
        if (players[id].socket.readyState === WebSocket.OPEN) {
          players[id].socket.send(JSON.stringify({
            type: 'positionUpdate',
            id: data.id,
            x: data.x,
            y: data.y,
            icon: data.icon
          }));
        }
      }
    } else if (data.type === 'disconnect') {
      // Handle player disconnection
      delete players[data.id]; // Remove player from the players object
      console.log(`Player disconnected: ${data.id}`);

      // Notify all remaining players about the disconnection
      for (const id in players) {
        if (players[id].socket.readyState === WebSocket.OPEN) {
          players[id].socket.send(JSON.stringify({
            type: 'playerDisconnected',
            id: data.id
          }));
        }
      }
    }
  });

  socket.on('close', () => {
    // Handle cleanup when the socket closes unexpectedly
    delete players[playerId];
    console.log(`Player disconnected: ${playerId}, Total players: ${Object.keys(players).length}`);

    // Notify all players about the disconnection
    for (const id in players) {
      if (players[id].socket.readyState === WebSocket.OPEN) {
        players[id].socket.send(JSON.stringify({
          type: 'playerDisconnected',
          id: playerId
        }));
      }
    }
  });
});

// Start the server on a dynamic port (Heroku will provide this)
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});