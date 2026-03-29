import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Camera as CameraIcon, Heart, Star, Mic, Type } from 'lucide-react';
import { Memory } from '../lib/groq';

const FilmStrip: React.FC<{ stripMemories: Memory[], stripIdx: number }> = ({ stripMemories, stripIdx }) => {
  const ref = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Parallax properties tied to scroll position
  const xMove = useTransform(scrollYProgress, [0, 1], [stripIdx % 2 === 0 ? 100 : -100, stripIdx % 2 === 0 ? -100 : 100]);
  const rotateMove = useTransform(scrollYProgress, [0, 1], [stripIdx % 2 === 0 ? 8 : -8, stripIdx % 2 === 0 ? -4 : 4]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div 
      ref={ref}
      style={{ x: xMove, rotate: rotateMove, opacity }}
      className="relative w-full max-w-5xl mx-auto"
    >
      <div className="bg-zinc-900 py-10 px-4 shadow-2xl relative border-y-[12px] border-zinc-950">
        <div className="absolute top-2 left-0 right-0 flex justify-around px-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-warm-white/10 rounded-sm" />
          ))}
        </div>

        <div className="flex justify-center gap-2 overflow-x-auto scrollbar-hide py-2">
          {stripMemories.map((m) => (
            <motion.div 
              key={m.id}
              whileHover={{ scale: 1.05, zIndex: 10, y: -10 }}
              className="flex-shrink-0 w-64 aspect-[4/3] bg-zinc-800 relative group cursor-pointer border-x border-zinc-950/50 shadow-lg"
            >
              {m.photoUrl ? (
                <img 
                  src={m.photoUrl} 
                  className="w-full h-full object-cover grayscale-[0.2] sepia-[0.2] group-hover:grayscale-0 group-hover:sepia-0 transition-all duration-700" 
                  referrerPolicy="no-referrer" 
                  alt={m.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 bg-zinc-800">
                  {m.type === 'voice' ? <Mic size={48} /> : <Type size={48} />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="font-hand text-white text-lg truncate drop-shadow-md">{m.title}</p>
                <p className="font-hand text-white/80 text-xs drop-shadow-md">{new Date(m.date).toLocaleDateString()}</p>
              </div>
              
              <div className="absolute -bottom-8 left-2 font-mono text-[10px] text-white/30">
                {Math.floor(Math.random() * 36) + 1}A
              </div>
            </motion.div>
          ))}
        </div>

        <div className="absolute bottom-2 left-0 right-0 flex justify-around px-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-warm-white/10 rounded-sm" />
          ))}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <span className="font-hand text-3xl text-faded-yellow/90 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {stripIdx === 0 ? "the early days..." : stripIdx === 1 ? "bits of joy" : "and so it goes..."}
        </span>
      </div>
    </motion.div>
  );
};

const Slide: React.FC<{ memory: Memory, index: number }> = ({ memory, index }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const yMove = useTransform(scrollYProgress, [0, 1], [150, -50]);
  const rotateMove = useTransform(scrollYProgress, [0, 1], [index === 0 ? -20 : 20, index === 0 ? 5 : -5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div 
      ref={ref}
      style={{ y: yMove, rotate: rotateMove, scale, opacity }}
      whileHover={{ scale: 1.15, rotate: 0, zIndex: 100, transition: { duration: 0.3 } }}
      className="flex justify-center cursor-pointer"
    >
      <div className="bg-[#f2e8d5] p-5 pb-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative w-72 border border-brown/10">
        <div className="text-center mb-3">
          <span className="text-[#e24a3b] font-bold text-xs tracking-tighter">Kodachrome</span>
          <div className="text-[#e24a3b] text-[10px] font-bold -mt-1">SLIDE</div>
        </div>
        <div className="aspect-square bg-zinc-900 overflow-hidden relative">
          {memory.photoUrl ? (
            <img src={memory.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={memory.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/5 font-hand text-xl p-4 text-center">
              {memory.title}
            </div>
          )}
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] pointer-events-none" />
        </div>
        <div className="absolute bottom-5 left-5 font-hand text-xs text-brown/60 font-bold">
          {new Date(memory.date).toLocaleDateString()}
        </div>
        <div className="absolute bottom-5 right-5 text-[#e24a3b] font-bold text-xl">+</div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-[#e24a3b] text-[7px] font-bold uppercase tracking-widest">Processed by Kodak</div>
        
        {index === 0 && (
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 font-hand text-faded-yellow/90 drop-shadow-md text-2xl rotate-12 hidden lg:block whitespace-nowrap">
            this one!! ✦
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function TimelineOverlay({ memories }: { memories: Memory[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Background slow parallax
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  
  // Hero section fades out as you scroll down
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.1], [0, -100]);

  return (
    <div ref={containerRef} className="pb-32 relative text-cream min-h-[200vh] overflow-x-hidden">
      {/* Immersive Campfire/Night Background */}
      <motion.div 
        className="fixed inset-0 z-[-1] pointer-events-none"
        style={{ y: bgY }}
      >
        <img 
          src="https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=1920" 
          className="w-full h-full object-cover brightness-[0.35]" 
          alt="Campfire background"
        />
        {/* Soft elegant gradients to blend UI and background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/90 via-black/50 to-[#2c140c]/80" />
        <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-orange-950/80 to-transparent" />
      </motion.div>

      {/* Hero Intro */}
      <div className="h-screen flex flex-col items-center justify-center relative sticky top-0 -z-10">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="text-center px-4">
          <div className="opacity-40 mb-6 flex justify-center">
            <CameraIcon size={56} className="text-faded-yellow" />
          </div>
          <h2 className="font-hand text-6xl md:text-8xl text-faded-yellow drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] -rotate-2 mb-6">
            Vibin' through the stash
          </h2>
          <p className="font-hand text-2xl md:text-3xl text-cream/90 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            A reel of moments, unspooled by the fire...
          </p>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-20 opacity-50 text-faded-yellow mix-blend-screen"
          >
            <span className="font-hand text-lg">scroll down</span>
            <div className="mx-auto mt-2 w-px h-16 bg-gradient-to-b from-faded-yellow to-transparent" />
          </motion.div>
        </motion.div>
      </div>

      {/* Interactive Film Strips */}
      <div className="space-y-48 mt-[50vh] relative z-10 hidden sm:block">
        {Array.from({ length: Math.ceil(memories.length / 4) }).map((_, stripIdx) => {
          const stripMemories = memories.slice(stripIdx * 4, (stripIdx + 1) * 4);
          return <FilmStrip key={stripIdx} stripMemories={stripMemories} stripIdx={stripIdx} />;
        })}
      </div>
      
      {/* Mobile-friendly stack for small screens since film strips are wide */}
      <div className="space-y-12 mt-[20vh] relative z-10 sm:hidden px-4">
        {memories.map(m => (
          <div key={m.id} className="bg-zinc-900 p-4 border border-zinc-800 rounded-sm">
            {m.photoUrl ? (
              <img src={m.photoUrl} className="w-full aspect-square object-cover grayscale-[0.2] sepia-[0.2]" />
            ) : (
              <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center text-white/10">
                {m.type === 'voice' ? <Mic size={32} /> : <Type size={32} />}
              </div>
            )}
            <p className="font-hand text-faded-yellow text-lg mt-3">{m.title}</p>
          </div>
        ))}
      </div>

      {/* Scattered Slides (Interactive) */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 pt-48 pb-64 px-8 relative z-10 overflow-hidden">
        {memories.slice(0, 2).map((m, i) => (
          <Slide key={`slide-${m.id}`} memory={m} index={i} />
        ))}
      </div>

      {/* Final Outro */}
      <div className="h-[50vh] flex items-center justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ duration: 1 }}
          className="relative text-center"
        >
          <div className="font-hand text-4xl md:text-5xl text-faded-yellow/90 italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            to be continued...
          </div>
          <Star className="absolute -top-8 -right-12 text-faded-yellow animate-pulse" size={32} />
        </motion.div>
      </div>
    </div>
  );
}
