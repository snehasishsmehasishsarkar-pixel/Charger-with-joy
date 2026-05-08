import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MessageBubbleProps {
  key?: string | number;
  text: string;
  isMe: boolean;
  time?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export function MessageBubble({ text, isMe, time, status }: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex w-full mb-4",
      isMe ? "justify-end" : "justify-start"
    )}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "max-w-[75%] px-4 py-2.5 rounded-2xl relative",
          isMe 
            ? "bg-neon-green text-black rounded-tr-none" 
            : "bg-dark-surface text-white border border-white/5 rounded-tl-none"
        )}
      >
        <p className="text-sm leading-relaxed">{text}</p>
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isMe ? "justify-end" : "justify-start"
        )}>
          {time && <span className={cn("text-[9px]", isMe ? "text-black/50" : "text-white/30")}>{time}</span>}
          {isMe && status === 'read' && <div className="w-1 h-1 rounded-full bg-black/40" />}
        </div>
      </motion.div>
    </div>
  );
}
