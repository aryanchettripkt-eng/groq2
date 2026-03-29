import React from 'react';
import { motion } from 'motion/react';
import { Camera as CameraIcon, Star, Mic, Type } from 'lucide-react';
import { Memory } from '../lib/groq';

const FilmStrip: React.FC<{ stripMemories: Memory[], stripIdx: number }> = ({ stripMemories, stripIdx }) => {
  const fromLeft = stripIdx % 2 === 0;

  return (
    <motion.div
      className="relative w-full max-w-5xl mx-auto"
      initial={{ opacity: 0, x: fromLeft ? -120 : 120 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {/* Film Strip */}
      <div className="bg-zinc-900 py-10 px-4 shadow-2xl relative border-y-[12px] border-zinc-950">
        {/* Top sprocket holes */}
        <div className="absolute top-2 left-0 right-0 flex justify-around px-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-white/10 rounded-sm" />
          ))}
        </div>

        <div className="flex justify-center gap-2 overflow-x-auto py-2">
          {stripMemories.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.06, y: -8, zIndex: 10 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 w-56 aspect-[4/3] bg-zinc-800 relative group cursor-pointer border-x border-zinc-950/60 shadow-lg"
            >
              {m.photoUrl ? (
                <img
                  src={m.photoUrl}
                  className="w-full h-full object-cover grayscale-[0.3] sepia-[0.2] group-hover:grayscale-0 group-hover:sepia-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                  alt={m.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 bg-zinc-800">
                  {m.type === 'voice' ? <Mic size={40} /> : <Type size={40} />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-white text-sm font-semibold truncate">{m.title}</p>
                <p className="text-white/70 text-xs">{new Date(m.date).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom sprocket holes */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-around px-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-white/10 rounded-sm" />
          ))}
        </div>
      </div>

      {/* Caption */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <span className="text-2xl text-[#e8d890]/90 italic" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
          {stripIdx === 0 ? 'the early days...' : stripIdx === 1 ? 'bits of joy' : 'and so it goes...'}
        </span>
      </motion.div>
    </motion.div>
  );
};

const Slide: React.FC<{ memory: Memory, index: number }> = ({ memory, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: index === 0 ? -12 : 12 }}
      whileInView={{ opacity: 1, y: 0, rotate: index === 0 ? -4 : 4 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
      whileHover={{ scale: 1.08, rotate: 0, zIndex: 100, transition: { duration: 0.25 } }}
      className="flex justify-center cursor-pointer"
    >
      <div className="bg-[#f2e8d5] p-5 pb-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative w-72 border border-[#c4a882]/30">
        <div className="text-center mb-3">
          <span className="text-[#e24a3b] font-bold text-xs tracking-tighter">Kodachrome</span>
          <div className="text-[#e24a3b] text-[10px] font-bold -mt-1">SLIDE</div>
        </div>
        <div className="aspect-square bg-zinc-900 overflow-hidden relative">
          {memory.photoUrl ? (
            <img src={memory.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={memory.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-lg p-4 text-center font-semibold">
              {memory.title}
            </div>
          )}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] pointer-events-none" />
        </div>
        <div className="absolute bottom-5 left-5 text-xs text-[#7d6348]/80 font-bold">
          {new Date(memory.date).toLocaleDateString()}
        </div>
        <div className="absolute bottom-5 right-5 text-[#e24a3b] font-bold text-xl">+</div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-[#e24a3b] text-[7px] font-bold uppercase tracking-widest">Processed by Kodak</div>

        {index === 0 && (
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 text-[#e8d890]/90 text-xl rotate-12 hidden lg:block whitespace-nowrap" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            this one!! ✦
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function TimelineOverlay({ memories }: { memories: Memory[], scrollRef?: React.RefObject<HTMLDivElement> }) {
  return (
    <div className="relative text-white overflow-x-hidden">
      {/* Fixed background — scoped via absolute positioning inside the overlay's scroll container */}
      <div className="sticky top-0 h-0 overflow-visible pointer-events-none" style={{ zIndex: -1 }}>
        <div
          className="absolute inset-x-0"
          style={{
            top: '-100vh',
            height: '200vh',
            backgroundImage: `url('https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=1920')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35)',
          }}
        />
        <div
          className="absolute inset-x-0"
          style={{
            top: '-100vh',
            height: '200vh',
            background: 'linear-gradient(to bottom, rgba(10,17,40,0.88) 0%, rgba(0,0,0,0.5) 50%, rgba(44,20,12,0.82) 100%)',
          }}
        />
      </div>

      {/* Hero */}
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <CameraIcon size={52} className="mx-auto mb-6 text-[#e8d890] opacity-50" />
          <h2
            className="text-5xl md:text-7xl font-bold -rotate-2 mb-6 text-[#e8d890]"
            style={{ textShadow: '0 4px 16px rgba(0,0,0,0.85)' }}
          >
            Vibin' through the stash
          </h2>
          <p
            className="text-xl md:text-2xl italic text-white/80"
            style={{ textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
          >
            A reel of moments, unspooled by the fire...
          </p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="mt-16 opacity-50 text-[#e8d890]"
          >
            <span className="text-base tracking-widest uppercase">scroll down</span>
            <div className="mx-auto mt-2 w-px h-16 bg-gradient-to-b from-[#e8d890] to-transparent" />
          </motion.div>
        </motion.div>
      </div>

      {/* Film Strips */}
      {memories.length > 0 ? (
        <div className="space-y-32 px-4 pb-20">
          {Array.from({ length: Math.ceil(memories.length / 4) }).map((_, stripIdx) => {
            const stripMemories = memories.slice(stripIdx * 4, (stripIdx + 1) * 4);
            return <FilmStrip key={stripIdx} stripMemories={stripMemories} stripIdx={stripIdx} />;
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 text-white/40"
        >
          <CameraIcon size={64} className="mx-auto mb-4 opacity-20" />
          <p className="text-xl italic">No memories yet. Start adding some!</p>
        </motion.div>
      )}

      {/* Kodachrome Slides */}
      {memories.slice(0, 2).length > 0 && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 pt-24 pb-32 px-8">
          {memories.slice(0, 2).map((m, i) => (
            <Slide key={`slide-${m.id}`} memory={m} index={i} />
          ))}
        </div>
      )}

      {/* Outro */}
      <div className="h-64 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9 }}
          className="relative text-center"
        >
          <div
            className="text-4xl md:text-5xl italic text-[#e8d890]/90"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
          >
            to be continued...
          </div>
          <Star className="absolute -top-8 -right-10 text-[#e8d890] animate-pulse" size={28} />
        </motion.div>
      </div>
    </div>
  );
}
