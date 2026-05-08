/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  doc, 
  Timestamp,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Search, 
  Plus, 
  MoreVertical, 
  ArrowLeft, 
  Paperclip, 
  LogOut,
  Zap
} from 'lucide-react';
import { auth, db, signInWithGoogle, handleFirestoreError } from './lib/firebase';
import { OperationType, UserProfile, ChatRoom, Message } from './types';
import { Button } from './components/Button';
import { Avatar } from './components/Avatar';
import { ChatListItem } from './components/ChatListItem';
import { MessageBubble } from './components/MessageBubble';
import { NeonLoader } from './components/NeonLoader';
import { cn } from './lib/utils';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync user profile
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL,
        email: user.email,
        lastSeen: serverTimestamp()
      }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));
    }
  }, [user]);

  // Fetch rooms
  const roomsRef = collection(db, 'rooms');
  const roomsQuery = user ? query(
    roomsRef,
    where('participants', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  ) : null;
  const [roomsValue, roomsLoading] = useCollection(roomsQuery);
  const rooms = roomsValue?.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom)) || [];

  // Fetch messages for selected room
  const messagesRef = selectedRoomId ? collection(db, 'rooms', selectedRoomId, 'messages') : null;
  const messagesQuery = messagesRef ? query(messagesRef, orderBy('createdAt', 'asc'), limit(50)) : null;
  const [messagesValue] = useCollection(messagesQuery);
  const messages = messagesValue?.docs.map(d => ({ id: d.id, ...d.data() } as Message)) || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Handle typing status
  useEffect(() => {
    if (!user || !selectedRoomId) return;

    const typingRef = doc(db, 'rooms', selectedRoomId, 'typing', user.uid);
    let timeoutId: NodeJS.Timeout;

    const updateTyping = async (isTyping: boolean) => {
      try {
        await setDoc(typingRef, {
          isTyping,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        // Silently fail typing updates
      }
    };

    if (messageText.length > 0) {
      updateTyping(true);
      // Automatically stop typing after 3 seconds of inactivity
      timeoutId = setTimeout(() => updateTyping(false), 3000);
    } else {
      updateTyping(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      updateTyping(false);
    };
  }, [messageText, selectedRoomId, user]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !user || !selectedRoomId) return;

    const text = messageText;
    setMessageText('');

    try {
      await addDoc(collection(db, 'rooms', selectedRoomId, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${selectedRoomId}/messages`);
    }
  };

  const startNewChat = async (targetUser: UserProfile) => {
    if (!user) return;
    
    // Check if room already exists
    const existingRoom = rooms.find(r => r.participants.includes(targetUser.uid));
    if (existingRoom) {
      setSelectedRoomId(existingRoom.id);
      setIsNewChatOpen(false);
      return;
    }

    try {
      const newRoomRef = await addDoc(collection(db, 'rooms'), {
        participants: [user.uid, targetUser.uid],
        updatedAt: serverTimestamp()
      });
      setSelectedRoomId(newRoomRef.id);
      setIsNewChatOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'rooms');
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><NeonLoader /></div>;

  if (!user) return (
    <div className="h-screen bg-dark-bg flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_-20%,#00FF9C22_0%,transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-neon-green flex items-center justify-center mx-auto mb-8 neon-glow-green rotate-12">
          <Zap className="w-10 h-10 text-black fill-black" />
        </div>
        <h1 className="text-5xl font-display font-bold mb-4 tracking-tight">NEON<span className="text-neon-green">CHAT</span></h1>
        <p className="text-white/40 mb-10 max-w-sm mx-auto leading-relaxed text-sm">The grid is waiting. Sign in to join the conversation.</p>
        <Button onClick={signInWithGoogle} variant="neon" size="lg" className="w-full max-w-xs h-14 text-base font-bold shadow-[0_0_30px_-5px_rgba(0,255,156,0.5)]">
          ENTER THE GRID
        </Button>
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen flex bg-dark-bg text-white overflow-hidden max-w-7xl mx-auto border-x border-white/5">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "flex-col w-full md:w-80 lg:w-96 border-r border-white/5 flex transition-all",
        selectedRoomId ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold tracking-tight">CHATS</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsNewChatOpen(true)}>
              <Plus className="w-5 h-5 text-neon-green" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => auth.signOut()}>
              <LogOut className="w-5 h-5 text-white/30" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-neon-green transition-colors" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full bg-dark-surface border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-green/50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
          {roomsLoading ? <NeonLoader /> : (
            rooms.length > 0 ? rooms.map(room => (
              <RoomItem 
                key={room.id} 
                room={room} 
                currentUser={user} 
                active={selectedRoomId === room.id}
                onClick={() => setSelectedRoomId(room.id)}
              />
            )) : (
              <div className="p-10 text-center text-white/20">
                <p className="text-[10px] uppercase tracking-widest">No active links</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Main Content - Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col transition-all relative overflow-hidden",
        !selectedRoomId ? "hidden md:flex items-center justify-center bg-dark-bg" : "flex"
      )}>
        {!selectedRoomId ? (
          <div className="text-center opacity-20">
            <Zap className="w-16 h-16 mx-auto mb-4" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-medium">Select a node to transmit</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedRoomId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              <ChatHeader 
                roomId={selectedRoomId} 
                currentUser={user} 
                onBack={() => setSelectedRoomId(null)} 
              />
              
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed"
              >
                {messages.length > 0 ? messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id}
                    text={msg.text}
                    isMe={msg.senderId === user.uid}
                    time={msg.createdAt ? formatTime(msg.createdAt) : ''}
                    status="read"
                  />
                )) : (
                  <div className="flex items-center justify-center h-full opacity-20">
                    <p className="text-[10px] uppercase tracking-widest border border-white/20 px-4 py-2 rounded-full">Secure Link Established</p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 pt-0">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3 bg-dark-surface border border-white/5 p-2 pr-3 rounded-2xl focus-within:border-neon-green/30 transition-all"
                >
                  <Button variant="ghost" size="icon" type="button" className="text-white/30 hover:text-white">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <input 
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none py-3 px-1 text-sm focus:outline-none placeholder:text-white/20"
                  />
                  <Button 
                    variant="neon" 
                    size="icon" 
                    disabled={!messageText.trim()}
                    className="h-10 w-10 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewChatOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-dark-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-bold">NEW CONNECTION</h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsNewChatOpen(false)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    autoFocus
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search grid nodes..."
                    className="w-full bg-dark-bg border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-neon-green/50 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-4 scrollbar-hide">
                <UserSearchList queryText={searchQuery} onSelect={startNewChat} currentUser={user} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
function RoomItem({ room, currentUser, active, onClick }: { key?: string, room: ChatRoom, currentUser: any, active: boolean, onClick: () => void }) {
  const otherUserId = room.participants.find(p => p !== currentUser.uid);
  const [userValue] = useDocument(otherUserId ? doc(db, 'users', otherUserId) : null);
  const otherUser = userValue?.data() as UserProfile | undefined;

  if (!otherUser) return null;

  return (
    <ChatListItem 
      name={otherUser.displayName}
      avatar={otherUser.photoURL}
      message={room.lastMessage || 'Link standby...'}
      time={room.lastMessageAt || room.updatedAt}
      active={active}
      onClick={onClick}
    />
  );
}

function ChatHeader({ roomId, currentUser, onBack }: { roomId: string, currentUser: any, onBack: () => void }) {
  const [roomValue] = useDocument(doc(db, 'rooms', roomId));
  const room = roomValue?.data() as ChatRoom | undefined;
  const otherUserId = room?.participants.find(p => p !== currentUser.uid);
  const [userValue] = useDocument(otherUserId ? doc(db, 'users', otherUserId) : null);
  const otherUser = userValue?.data() as UserProfile | undefined;

  // Typing status listener
  const typingQuery = query(
    collection(db, 'rooms', roomId, 'typing'),
    where('isTyping', '==', true)
  );
  const [typingValue] = useCollection(typingQuery);
  const isOtherUserTyping = typingValue?.docs.some(d => d.id !== currentUser.uid);

  return (
    <div className="p-6 flex items-center justify-between border-b border-white/5 bg-dark-bg/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </Button>
        <Avatar src={otherUser?.photoURL} fallback={otherUser?.displayName || '?'} status="online" className="h-10 w-10 shadow-[0_0_15px_-5px_rgba(0,255,156,0.3)]" />
        <div className="min-w-0">
          <h2 className="font-bold text-white truncate text-sm tracking-tight">{otherUser?.displayName || 'Scanning...'}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isOtherUserTyping ? (
              <span className="text-[9px] text-neon-green uppercase tracking-[0.2em] font-black animate-pulse">
                Transmitting message...
              </span>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green neon-glow-green animate-pulse" />
                <span className="text-[9px] text-neon-green uppercase tracking-[0.2em] font-bold">Uplink Active</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="text-white/20">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function UserSearchList({ queryText, onSelect, currentUser }: { queryText: string, onSelect: (u: UserProfile) => void, currentUser: any }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!queryText.trim()) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('displayName', '>=', queryText),
          where('displayName', '<=', queryText + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(q);
        const res = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== currentUser.uid);
        setUsers(res);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [queryText, currentUser.uid]);

  if (loading) return <div className="py-10"><NeonLoader /></div>;

  return (
    <div className="space-y-1">
      {users.length > 0 ? users.map(u => (
        <motion.div 
          key={u.uid} 
          whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
          onClick={() => onSelect(u)}
          className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5"
        >
          <Avatar src={u.photoURL} fallback={u.displayName} className="h-10 w-10" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{u.displayName}</h4>
            <p className="text-[10px] text-white/30 truncate tracking-wide">{u.email}</p>
          </div>
          <Plus className="w-4 h-4 text-neon-green opacity-0 group-hover:opacity-100" />
        </motion.div>
      ) ) : queryText.trim() ? (
        <div className="py-10 text-center">
          <p className="text-white/20 text-[10px] uppercase tracking-widest italic">Signal lost in static</p>
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-white/10 text-[10px] uppercase tracking-widest font-medium">Type to scan frequency</p>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
