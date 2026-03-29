import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Memory } from '../lib/groq';
import { Heart, Music, Play, SkipBack, SkipForward, Smile, Pin, X as XIcon, Image as ImageIcon, Sparkles } from 'lucide-react';

interface PlacedItem {
  id: string; // unique instance ID
  type: 'photo' | 'widget';
  dataId: string; // memory ID or widget type ID
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

const WIDGETS = [
  { id: 'bunny', label: 'Bunny Stamp' },
  { id: 'passport', label: 'Passport Sticker' },
  { id: 'quote1', label: 'Little Life Note' },
  { id: 'quote2', label: 'Live Laugh Love' },
  { id: 'music', label: 'Music Player' },
  { id: 'locket', label: 'Locket Photos' },
  { id: 'smile', label: 'Smile Sticker' },
  { id: 'pin', label: 'Push Pin' }
];

export default function InteractiveScrapbook({ memories }: { memories: Memory[] }) {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'widgets'>('photos');
  const [maxZ, setMaxZ] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reminiq-scrapbook-layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlacedItems(parsed);
        const highestZ = parsed.reduce((max: number, item: PlacedItem) => Math.max(max, item.zIndex), 10);
        setMaxZ(highestZ);
      } catch (e) {
        console.error("Failed to parse scrapbook layout", e);
      }
    }
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    if (placedItems.length > 0) {
      localStorage.setItem('reminiq-scrapbook-layout', JSON.stringify(placedItems));
    } else {
      localStorage.removeItem('reminiq-scrapbook-layout');
    }
  }, [placedItems]);

  const handleAddItem = (type: 'photo' | 'widget', dataId: string) => {
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    // Center initially + random scatter
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;
    const rotation = (Math.random() - 0.5) * 20;
    
    const newItem: PlacedItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      dataId,
      x: offsetX,
      y: offsetY,
      rotation,
      scale: 1,
      zIndex: newZ
    };
    setPlacedItems([...placedItems, newItem]);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlacedItems(placedItems.filter(i => i.id !== id));
  };

  const updateItemPosition = (id: string, dx: number, dy: number) => {
    setPlacedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, x: item.x + dx, y: item.y + dy };
      }
      return item;
    }));
  };

  const bringToFront = (id: string) => {
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setPlacedItems(prev => prev.map(item => item.id === id ? { ...item, zIndex: newZ } : item));
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'bunny':
        return (
          <div className="w-24 h-24 bg-[#8b5e3c]/20 rounded-full flex flex-col items-center justify-center border-2 border-[#8b5e3c]/30 p-2 pointer-events-none">
            <div className="w-12 h-12 bg-brown rounded-full mb-1" />
            <span className="font-hand text-[10px] text-brown font-bold">MONSTER</span>
          </div>
        );
      case 'passport':
        return (
          <div className="bg-[#fdf6e3] p-4 border border-brown/20 shadow-md w-56 font-mono text-[10px] text-brown/70 pointer-events-none">
            <div className="border-b border-brown/20 pb-1 mb-2 font-bold text-center">PASSPORT OF MEMORIES</div>
            <div className="flex gap-3">
              <div className="w-16 h-20 bg-brown/10 border border-brown/20" />
              <div className="space-y-1">
                <div>NAME: REMINIQ USER</div>
                <div>DATE: 01.01.2026</div>
                <div>LOC: EVERYWHERE</div>
              </div>
            </div>
          </div>
        );
      case 'quote1':
        return <div className="font-hand text-3xl text-brown/80 whitespace-nowrap pointer-events-none">i think i like this little life...</div>;
      case 'quote2':
        return <div className="font-hand text-4xl text-dark-brown/70 whitespace-nowrap pointer-events-none">live, laugh, and love... :)</div>;
      case 'music':
        return (
          <div className="w-72 bg-zinc-900/95 p-5 rounded-2xl shadow-xl border border-white/10 pointer-events-none">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-moss to-dark-brown rounded-lg shadow-inner flex items-center justify-center text-cream/20">
                <Music size={32} />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-serif text-white text-sm truncate">Beautiful Smile</div>
                <div className="font-hand text-white/40 text-xs truncate">Your Eyes</div>
              </div>
              <Heart size={16} className="text-dusty-rose fill-dusty-rose" />
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/40 w-[60%]" />
              </div>
              <div className="flex justify-between font-mono text-[8px] text-white/30">
                <span>01:42</span>
                <span>03:59</span>
              </div>
            </div>
            <div className="mt-4 flex justify-center items-center gap-6 text-white/60">
              <SkipBack size={18} />
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Play size={20} fill="currentColor" />
              </div>
              <SkipForward size={18} />
            </div>
          </div>
        );
      case 'locket':
        return (
          <div className="flex gap-2 pointer-events-none">
            <div className="w-24 h-32 rounded-full border-4 border-faded-yellow bg-white shadow-xl overflow-hidden mt-4">
              <img src="https://picsum.photos/seed/locket1/200/300" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" alt="locket" />
            </div>
            <div className="w-24 h-32 rounded-full border-4 border-faded-yellow bg-white shadow-xl overflow-hidden">
              <img src="https://picsum.photos/seed/locket2/200/300" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" alt="locket" />
            </div>
          </div>
        );
      case 'smile':
        return <Smile size={64} className="text-faded-yellow pointer-events-none drop-shadow-md" />;
      case 'pin':
        return <Pin size={48} className="text-red-500 pointer-events-none drop-shadow-md" />;
      default:
        return null;
    }
  };

  const renderPhoto = (memoryId: string, isPlaced: boolean = true) => {
    const m = memories.find(mem => mem.id === memoryId);
    if (!m) return null;

    return (
      <div className={`bg-white p-2 ${isPlaced ? 'pb-10 shadow-xl' : 'pb-8'} border border-brown/5 relative w-44 sm:w-56 pointer-events-none`}>
        {m.photoUrl ? (
          <div className="relative aspect-square overflow-hidden">
            <img src={m.photoUrl} className="w-full h-full object-cover grayscale-[0.1] sepia-[0.1]" referrerPolicy="no-referrer" alt={m.title} />
            <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" />
          </div>
        ) : (
          <div className="w-full aspect-square bg-parchment flex items-center justify-center text-brown/40 font-hand text-center p-4 text-sm">
            {m.title}
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
          <span className="font-hand text-[12px] text-brown/60 italic truncate max-w-[70%]">{m.title}</span>
          <span className="font-hand text-[10px] text-brown/40">{new Date(m.date).toLocaleDateString()}</span>
        </div>
        {/* Tape effect */}
        {isPlaced && <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-faded-yellow/30 rotate-3 border border-brown/5 backdrop-blur-[1px]" />}
      </div>
    );
  };

  return (
    <div className="relative min-h-[120vh] flex">
      {/* Sidebar Panel */}
      <div className="w-80 border-r border-brown/20 bg-cream/95 backdrop-blur-md shadow-xl z-50 fixed left-0 top-0 bottom-0 flex flex-col pt-24 pb-10">
        <div className="px-6 pb-4 border-b border-brown/10">
          <h2 className="font-serif text-3xl text-dark-brown italic mb-1">Your Stash</h2>
          <p className="font-hand text-brown/60 text-sm">Click to add items to your scrapbook.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-brown/10">
          <button 
            className={`flex-1 py-3 font-hand text-lg transition-colors ${activeTab === 'photos' ? 'text-moss bg-moss/5 border-b-2 border-moss' : 'text-brown/50 hover:text-brown background-transparent'}`}
            onClick={() => setActiveTab('photos')}
          >
            <ImageIcon size={16} className="inline mr-2 -mt-1" />
            Photos
          </button>
          <button 
            className={`flex-1 py-3 font-hand text-lg transition-colors ${activeTab === 'widgets' ? 'text-moss bg-moss/5 border-b-2 border-moss' : 'text-brown/50 hover:text-brown background-transparent'}`}
            onClick={() => setActiveTab('widgets')}
          >
            <Sparkles size={16} className="inline mr-2 -mt-1" />
            Widgets
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {activeTab === 'photos' ? (
            memories.filter(m => m.photoUrl).length > 0 ? (
              memories.filter(m => m.photoUrl).map(m => (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddItem('photo', m.id)}
                  className="cursor-pointer mx-auto flex justify-center"
                >
                  <div className="scale-75 origin-top -mb-[20%]">
                    {renderPhoto(m.id, false)}
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center font-hand text-brown/40 mt-10">No photos found.</p>
            )
          ) : (
            WIDGETS.map(w => (
              <motion.div
                key={w.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddItem('widget', w.id)}
                className="cursor-pointer bg-white p-4 rounded-xl border border-brown/10 shadow-sm text-center font-hand text-dark-brown hover:border-moss/40 transition-colors"
              >
                {w.label}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 ml-80 relative flex items-center justify-center p-8 lg:p-16 overflow-hidden">
        {/* Clipboard Base */}
        <div className="relative w-full max-w-5xl bg-[#c4a882] rounded-3xl shadow-2xl p-4 sm:p-8 border-4 border-[#8b5e3c]">
          {/* Clipboard Clip */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#a67c52] rounded-t-xl border-x-4 border-t-4 border-[#8b5e3c] flex items-center justify-center z-20">
            <div className="w-32 h-4 bg-[#8b5e3c] rounded-full" />
          </div>

          {/* Journal Paper Spread */}
          <div 
            ref={containerRef}
            className="bg-warm-white w-full min-h-[900px] rounded-lg shadow-inner relative overflow-hidden p-6 sm:p-12 border border-brown/10"
          >
            {/* Grid/Lines Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b5e3c 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />
            
            {placedItems.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="font-hand text-3xl text-brown/30 italic">Click items from your stash to add them here...</p>
              </div>
            )}

            {/* Render Placed Items */}
            <AnimatePresence>
              {placedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.5, rotate: item.rotation - 15 }}
                  animate={{ opacity: 1, scale: item.scale, rotate: item.rotation }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  drag
                  dragMomentum={false}
                  onDragStart={() => bringToFront(item.id)}
                  onDragEnd={(e, info) => updateItemPosition(item.id, info.offset.x, info.offset.y)}
                  style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    top: '50%',
                    marginLeft: '-10%',
                    marginTop: '-10%',
                    x: item.x, 
                    y: item.y, 
                    zIndex: item.zIndex 
                  }}
                  className="cursor-move group"
                >
                  <div className="relative w-max h-max">
                    {/* Delete button (visible on hover) */}
                    <button 
                      onClick={(e) => handleRemoveItem(item.id, e)}
                      className="absolute -top-3 -right-3 z-[100] bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                    >
                      <XIcon size={14} />
                    </button>
                    
                    {item.type === 'photo' ? renderPhoto(item.dataId) : renderWidget(item.dataId)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
