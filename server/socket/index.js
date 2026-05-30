const Room = require('../models/Room');

// Stores active users per room in memory
// { roomId: [ { socketId, userId, username } ] }
const roomUsers = {};

module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // --- JOIN ROOM ---
    socket.on('join-room', async ({ roomId, userId, username }) => {
      socket.join(roomId);

      // Track this user in memory
      if (!roomUsers[roomId]) roomUsers[roomId] = [];

      // Remove any stale entry for this user (e.g. reconnection)
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.userId !== userId);
      roomUsers[roomId].push({ socketId: socket.id, userId, username });

      // Store on socket object for cleanup on disconnect
      socket.roomId = roomId;
      socket.userId = userId;
      socket.username = username;

      // Send current room users to everyone in the room
      io.to(roomId).emit('room-users', roomUsers[roomId]);

      // Send current code state to the newly joined user
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          socket.emit('load-code', { code: room.code, language: room.language });
        }
      } catch (error) {
        console.error('Error loading room:', error);
      }

      console.log(`${username} joined room ${roomId}`);
    });

    // --- CODE CHANGE ---
    socket.on('code-change', ({ roomId, code }) => {
      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(roomId).emit('code-change', { code });
    });

    // --- LANGUAGE CHANGE ---
    socket.on('language-change', ({ roomId, language }) => {
      socket.to(roomId).emit('language-change', { language });
    });

    // --- TYPING INDICATOR ---
    socket.on('typing', ({ roomId, username }) => {
      socket.to(roomId).emit('typing', { username });
    });

    // --- CURSOR MOVE ---
    socket.on('cursor-move', ({ roomId, line, column }) => {
      socket.to(roomId).emit('cursor-move', {
        userId: socket.userId,
        username: socket.username,
        line,
        column
      });
    });

    // --- SAVE CODE (persist to MongoDB) ---
    socket.on('save-code', async ({ roomId, code }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId },
          { code },
          { new: true }
        );
        socket.emit('code-saved');
      } catch (error) {
        console.error('Error saving code:', error);
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      const { roomId, userId, username } = socket;

      if (roomId && roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);

        // If room is empty, clean up memory
        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
        } else {
          // Notify remaining users
          io.to(roomId).emit('room-users', roomUsers[roomId]);
        }
      }

      console.log(`Socket disconnected: ${socket.id} (${username})`);
    });

  });

};