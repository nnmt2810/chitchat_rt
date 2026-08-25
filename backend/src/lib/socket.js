import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import { ENV } from './env.js';
import { socketAuthMiddleware } from '../middleware/socket.auth.middleware.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [ENV.CLIENT_URL],
        credentials: true,
    },
});

io.use(socketAuthMiddleware);

// userId -> Set of socket IDs
const userSocketMap = new Map();

export function getReceiverSocketIds(userId) {
    return userSocketMap.get(userId) || [];
}

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.user.fullName);

    const userId = socket.userId;

    // Get existing sockets of this user
    let socketIds = userSocketMap.get(userId);

    // First connection of this user
    if (!socketIds) {
        socketIds = new Set();
        userSocketMap.set(userId, socketIds);
    }

    // Add this connection
    socketIds.add(socket.id);

    // Send updated online users
    io.emit('getOnlineUsers', Array.from(userSocketMap.keys()));

    socket.on('disconnect', () => {
        console.log('A user disconnected: ' + socket.user.fullName);

        const socketIds = userSocketMap.get(userId);

        if (!socketIds) return;

        // Remove only this socket
        socketIds.delete(socket.id);

        // User is offline only when all sockets are disconnected
        if (socketIds.size === 0) {
            userSocketMap.delete(userId);
        }

        io.emit('getOnlineUsers', Array.from(userSocketMap.keys()));
    });
});

export { server, io, app };