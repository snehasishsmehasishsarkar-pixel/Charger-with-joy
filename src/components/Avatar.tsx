import { cn } from '../lib/utils';

interface AvatarProps {
  src?: string | null;
  fallback?: string;
  className?: string;
  status?: 'online' | 'offline' | 'away';
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ src, fallback, className, status, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-sm'
  };

  return (
    <div className={cn("relative inline-block shrink-0", sizeClasses[size], className)}>
      <div className="h-full w-full overflow-hidden rounded-full bg-dark-card border border-white/5">
        {src ? (
          <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-white/40">
            {fallback?.charAt(0) || '?'}
          </div>
        )}
      </div>
      {status && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dark-bg",
            status === 'online' ? 'bg-neon-green' : 'bg-white/20'
          )} 
        />
      )}
    </div>
  );
}
