import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === "development" ? 'http://localhost:3000' : '/';

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,
    isLoggingIn: false,
    socket: null,
    onlineUsers: [],

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get('/auth/check');
            const user = res.data?.user ?? res.data;
            set({ authUser: user?._id ? user : null });
            get().connectSocket();
        } catch(err) {
            console.error('Error checking auth:', err);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post('/auth/signup', data);
            const user = res.data?.user ?? res.data;
            set({ authUser: user?._id ? user : null });

            toast.success('Account created successfully!');
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post('/auth/login', data);
            const user = res.data?.user ?? res.data;
            set({ authUser: user?._id ? user : null });

            toast.success('Logged in successfully');

            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post('/auth/logout');
            set({ authUser: null });
            toast.success('Logged out successfully');
            get().disconnectSocket();
        } catch (error) {
            toast.error('Error logging out');
            console.log('Logout error:', error);
        }
    },

    updateProfile: async (data) => {
        try {
            const res = await axiosInstance.put('/auth/update-profile', data);
            set({ authUser: res.data });
            toast.success('Profile updated successfully');
        } catch (error) {
            console.log('Profile update error:', error);
            toast.error(error.response?.data?.message || 'Error updating profile');
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {withCredentials: true});

        socket.connect();
        
        set({ socket });

        // listen for online users event
        socket.on('getOnlineUsers', (userIds) => {
            set({ onlineUsers: userIds });
        });
    },

    disconnectSocket: () => {
        if (get().socket?.connected) get().socket?.disconnect();
    }
}));
