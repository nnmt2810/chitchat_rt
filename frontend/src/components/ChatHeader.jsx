import { useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const isOneline = onlineUsers.includes(selectedUser?._id);

    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape') setSelectedUser(null);   
        };

        window.addEventListener('keydown', handleEscKey);
        return () => window.removeEventListener('keydown', handleEscKey);
    }, [setSelectedUser]);

    return (
        <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[74px] px-6 flex-1">
            <div className="flex items-center space-x-3">
                <div className={`avatar ${isOneline ? "online" : "offline"}`}>
                    <div className="w-12 rounded-full"> 
                        <img src={selectedUser?.profilePic || '/avatar.png'} alt={selectedUser?.fullName} />
                    </div>
                </div>

                <div>
                    <h3 className="text-slate-200 font-medium">{selectedUser?.fullName}</h3>
                    <p className="text-slate-400 text-sm">{isOneline ? "Online" : "Offline"}</p>
                </div>
            </div>

            <button onClick={() => setSelectedUser(null)}>
                <XIcon className="w-4 h-4 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
            </button>
        </div>
    );
};

export default ChatHeader;