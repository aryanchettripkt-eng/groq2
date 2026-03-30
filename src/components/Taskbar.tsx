import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  Calendar, 
  FolderHeart, 
  Music, 
  History,
  Home,
  BookOpen
} from 'lucide-react';

interface TaskbarProps {
  view: 'landing' | 'vault';
  onViewChange: (view: 'landing' | 'vault') => void;
  activeOverlay: string | null;
  onOverlayChange: (overlay: string | null) => void;
}

export default function Taskbar({ view, onViewChange, activeOverlay, onOverlayChange }: TaskbarProps) {
  const items = [
    { id: 'try-it', icon: <Search size={20} />, label: 'Try It', type: 'overlay' },
    { id: 'calendar', icon: <Calendar size={20} />, label: 'Calendar', type: 'overlay' },
    { id: 'albums', icon: <FolderHeart size={20} />, label: 'Albums', type: 'overlay' },
    { id: 'timeline', icon: <History size={20} />, label: 'Timeline', type: 'overlay' },
    { id: 'scrapbook', icon: <BookOpen size={20} />, label: 'Journal', type: 'overlay' }
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 sm:gap-6 px-6 sm:px-8 py-3 sm:py-4 bg-parchment/80 backdrop-blur-xl border border-light-brown/30 rounded-full shadow-2xl pointer-events-auto max-w-[95vw] overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const isActive = activeOverlay === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => {
              onOverlayChange(activeOverlay === item.id ? null : item.id);
            }}
            className={`relative group flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all flex-shrink-0 ${
              isActive 
                ? 'bg-moss text-cream shadow-inner' 
                : 'text-brown hover:bg-brown/10'
            }`}
          >
            <div className="scale-100 sm:scale-110 transition-transform group-hover:scale-125">
              {item.icon}
            </div>
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-moss text-cream text-[11px] tracking-wide font-hand rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap hidden sm:block shadow-md">
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="active-pill"
                className="absolute inset-0 bg-moss rounded-full -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
