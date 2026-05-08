import { motion } from 'motion/react';

export function NeonLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-12 h-12 rounded-full border-2 border-neon-green neon-glow-green"
      />
      <span className="text-[10px] text-neon-green uppercase tracking-[0.2em] font-medium">
        Connecting to Grid
      </span>
    </div>
  );
}
