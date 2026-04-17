import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { toast } from 'react-hot-toast';

export const useAuthStore = create((set) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get('/auth/check');
            const user = res.data?.user ?? res.data;
            set({ authUser: user?._id ? user : null });
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
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    }

}));
