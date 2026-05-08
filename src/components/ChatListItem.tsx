import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from './Avatar';
import { cn } from '../lib/utils';

interface ChatListItemProps {
  name: string;
  message: string;
  time: any;
  unreadCount?: number;
  avatar?: string | null;
  active?: boolean;
  onClick: () => void;
}

export function ChatListItem({
  name,
  message,
  time,
  unreadCount,
  avatar,
  active,
  onClick
}: ChatListItemProps) {
  const formattedTime = time ? formatDistanceToNow(time instanceof Date ? time : time.toDate(), { addSuffix: false }) : '';

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 cursor-pointer transition-colors border-l-2 border-transparent",
        active && "bg-white/5 border-neon-green"
      )}
    >
      <Avatar src={avatar} fallback={name} className="h-12 w-12" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-medium text-white truncate">{name}</h3>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">{formattedTime}</span>
        </div>
        <p className="text-xs text-white/50 truncate">{message}</p>
      </div>
      {unreadCount ? (
        <div className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-neon-green text-black text-[10px] font-bold">
          {unreadCount}
        </div>
      ) : null}
    </motion.div>
  );
}
