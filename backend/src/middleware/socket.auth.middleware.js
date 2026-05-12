import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ENV } from '../lib/env.js';

export const socketAuthMiddleware = async (socket, next) => {
    try {
        // extract token from headers cookie
        const token = socket.handshake.headers.cookie
            ?.split(';')
            .find((row) => row.trim().startsWith('jwt='))
            ?.split('=')[1];

        if (!token) {
            console.log('Socket connection rejected: No token provided');
            return next(new Error('Authentication error: No token provided'));
        }

        // verify token
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        if (!decoded) {
            console.log('Socket connection rejected: Invalid token');
            return next(new Error('Authentication error: Invalid token'));
        }

        // find user by ID
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            console.log('Socket connection rejected: User not found');
            return next(new Error('Authentication error: User not found'));
        }

        socket.user = user; // attach user to socket object
        socket.userId = user._id.toString(); // attach user ID to socket object

        console.log(`Socket connection authenticated for user: ${user.fullName} (${user._id})`);

        next();
    } catch (error) {
        console.log('Socket connection rejected:', error.message);
        return next(new Error('Authentication error: ' + error.message));
    }
};