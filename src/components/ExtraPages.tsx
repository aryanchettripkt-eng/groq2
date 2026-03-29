import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, Search, Leaf, FolderHeart, History, Music, Check, Edit2, Star, Heart, Camera as CameraIcon, Mic, Type, Play, SkipBack, SkipForward, Smile, Pin } from 'lucide-react';
import { Memory, Album, DayReaction, searchMemories } from '../lib/groq';
import CalendarView from './CalendarView';
import AlbumDetail from './AlbumDetail';
import MusicPlayer from './MusicPlayer';
import TimelineOverlay from './TimelineOverlay';

interface ExtraPagesProps {
  activeOverlay: string | null;
  onClose: () => void;
  memories: Memory[];
  onDeleteMemory: (memoryId: string) => void;
  albums: Album[];
  onUpdateAlbums: (albums: Album[]) => void;
  onUpdateAlbumTitle: (albumId: string, newTitle: string) => void;
  onUpdateAlbum: (albumId: string, data: Partial<Album>) => void;
  dayReactions: DayReaction[];
  onUpdateDayReaction: (date: string, data: Partial<DayReaction>) => void;
  onSortAlbums: () => void;
  isSorting: boolean;
  onAddMemoryAtDate: (date: string) => void;
}

export default function ExtraPages({ 
  activeOverlay, 
  onClose, 
  memories,
  onDeleteMemory,
  albums,
  onUpdateAlbums,
  onUpdateAlbumTitle,
  onUpdateAlbum,
  dayReactions,
  onUpdateDayReaction,
  onSortAlbums,
  isSorting,
  onAddMemoryAtDate
}: ExtraPagesProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{intro: string, memoryId: string | null} | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!activeOverlay) return null;

  const startEditingAlbum = (album: Album) => {
    setEditingAlbumId(album.id);
    setEditTitleValue(album.title);
  };

  const saveAlbumTitle = (albumId: string) => {
    onUpdateAlbumTitle(albumId, editTitleValue);
    setEditingAlbumId(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const result = await searchMemories(searchQuery, memories);
      setSearchResult(result);
    } catch (e: any) {
      setSearchError(e.message || "Failed to search memories.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <motion.div 
      ref={scrollRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[10000] bg-warm-white overflow-y-auto"
    >
      <div className="film-grain" />
      
      <button 
        onClick={onClose}
        className="fixed top-8 right-8 z-[10001] p-3 bg-moss text-cream rounded-full shadow-xl hover:scale-110 transition-transform"
      >
        <X size={24} />
      </button>

      <div className="max-w-5xl mx-auto px-6 py-24">
        {activeOverlay === 'try-it' && (
          <section className="space-y-16">
            <div className="text-center">
              <div className="font-hand text-sm text-moss tracking-[0.12em] uppercase mb-3">✦ try a quiet search ✦</div>
              <h2 className="font-serif text-4xl md:text-6xl text-dark-brown leading-tight max-w-[700px] mx-auto">Write a feeling.<br /><em className="italic text-brown">Find a memory.</em></h2>
            </div>

            <div className="max-w-3xl mx-auto bg-cream border-[1.5px] border-light-brown rounded-[4px] shadow-2xl relative overflow-hidden">
              <div className="p-12 pl-20 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_31px,rgba(196,168,130,0.25)_31px,rgba(196,168,130,0.25)_32px)] relative before:content-[''] before:absolute before:left-16 before:top-0 before:bottom-0 before:w-[1px] before:bg-dusty-rose/50">
                <div className="font-hand text-lg text-brown mb-4">What are you trying to remember?</div>
                <textarea 
                  className="w-full border-none outline-none bg-transparent font-hand text-3xl text-ink resize-none leading-[2.5rem] min-h-[120px] placeholder:text-brown/40" 
                  placeholder="that late-night idea about the garden…" 
                  rows={3}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="mt-8 px-10 py-4 bg-moss text-cream font-hand text-xl cursor-pointer rounded-[2px] transition-all hover:bg-dark-brown hover:-translate-y-px tracking-wider shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSearching ? <span className="animate-spin">◌</span> : null}
                  {isSearching ? 'Searching...' : 'Find it in my Reminiq →'}
                </button>
                
                {searchError && (
                  <div className="mt-8 p-4 bg-red-50 text-red-800 font-hand text-lg border border-red-200">
                    {searchError}
                  </div>
                )}
                
                <AnimatePresence>
                  {searchResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-12 pt-8 border-t border-brown/20"
                    >
                      <p className="font-hand text-2xl text-dark-brown italic mb-6">"{searchResult.intro}"</p>
                      
                      {searchResult.memoryId && (
                        (() => {
                          const mem = memories.find(m => m.id === searchResult.memoryId);
                          if (!mem) return null;
                          return (
                            <div className="bg-white p-6 shadow-md border border-brown/10 transform rotate-1">
                              {mem.photoUrl && (
                                <img src={mem.photoUrl} className="w-full h-48 object-cover mb-4" referrerPolicy="no-referrer" />
                              )}
                              <h3 className="font-serif text-xl text-dark-brown mb-2">{mem.title}</h3>
                              <p className="font-hand text-lg text-brown/80 mb-4">{mem.desc}</p>
                              <div className="flex items-center gap-4 font-hand text-sm text-brown/50">
                                <span>{new Date(mem.date).toLocaleDateString()}</span>
                                {mem.location && <span>• {mem.location}</span>}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {activeOverlay === 'calendar' && (
          <CalendarView 
            memories={memories}
            dayReactions={dayReactions}
            onUpdateDayReaction={onUpdateDayReaction}
            onClose={onClose}
            onAddMemoryAtDate={onAddMemoryAtDate}
            onDeleteMemory={onDeleteMemory}
          />
        )}

        {activeOverlay === 'albums' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-4xl text-dark-brown italic">Your Curated Albums</h2>
                <p className="font-hand text-lg text-brown/50 italic">AI-sorted by time, place, and feeling...</p>
              </div>
              <button 
                onClick={onSortAlbums}
                disabled={isSorting}
                className="bg-sage/10 border border-sage/30 text-moss font-hand text-lg px-6 py-2 rounded-full hover:bg-sage/20 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={18} className={isSorting ? "animate-spin" : ""} />
                {isSorting ? "Sorting..." : "Re-sort with AI"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {albums.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-brown/30">
                  <FolderHeart size={64} className="mb-4 opacity-20" />
                  <p className="font-hand text-2xl italic">No albums yet. Click "Re-sort" to organize your memories.</p>
                </div>
              ) : (
                albums.map((album) => (
                  <div key={album.id} className="group cursor-pointer" onClick={() => setSelectedAlbum(album)}>
                    <div className="flex items-center justify-between mb-4">
                      {editingAlbumId === album.id ? (
                        <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveAlbumTitle(album.id)}
                            className="bg-parchment/40 border-b border-brown/30 font-serif italic text-xl text-dark-brown outline-none w-full px-1"
                          />
                          <button onClick={() => saveAlbumTitle(album.id)} className="text-moss hover:text-dark-brown">
                            <Check size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title">
                          <h3 className="font-serif text-2xl text-dark-brown italic">{album.title}</h3>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditingAlbum(album); }}
                            className="opacity-0 group-hover/title:opacity-100 text-brown/30 hover:text-brown transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      )}
                      <span className="font-hand text-sm text-brown/40">{album.memoryIds.length} items</span>
                    </div>
                    
                    <div className="relative aspect-square">
                      {[...Array(Math.min(3, album.memoryIds.length))].map((_, idx) => {
                        const memId = album.memoryIds[idx];
                        const mem = memories.find(m => m.id === memId);
                        return (
                          <div 
                            key={idx}
                            className="absolute inset-0 bg-white shadow-md border border-brown/5 p-2 transition-transform duration-500 group-hover:scale-[1.02]"
                            style={{ 
                              transform: `rotate(${idx * 3 - 3}deg) translate(${idx * 4}px, ${idx * 4}px)`,
                              zIndex: 3 - idx
                            }}
                          >
                            {mem?.photoUrl ? (
                              <img src={mem.photoUrl} className="w-full h-full object-cover grayscale-[0.1]" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-parchment flex items-center justify-center text-brown/10">
                                <BookOpen size={48} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <AnimatePresence>
              {selectedAlbum && (
                <AlbumDetail 
                  album={selectedAlbum}
                  memories={memories}
                  onBack={() => setSelectedAlbum(null)}
                  onUpdateAlbum={(data) => onUpdateAlbum(selectedAlbum.id, data)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {activeOverlay === 'timeline' && <TimelineOverlay memories={memories} scrollRef={scrollRef} />}

        {activeOverlay === 'scrapbook' && (
          <div className="relative min-h-[120vh] flex items-center justify-center p-4 sm:p-10">
            {/* Clipboard Base */}
            <div className="relative w-full max-w-5xl bg-[#c4a882] rounded-3xl shadow-2xl p-4 sm:p-8 border-4 border-[#8b5e3c]">
              {/* Clipboard Clip */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#a67c52] rounded-t-xl border-x-4 border-t-4 border-[#8b5e3c] flex items-center justify-center z-20">
                <div className="w-32 h-4 bg-[#8b5e3c] rounded-full" />
              </div>

              {/* Journal Paper Spread */}
              <div className="bg-warm-white w-full min-h-[1000px] rounded-lg shadow-inner relative overflow-hidden p-6 sm:p-12 border border-brown/10">
                {/* Grid/Lines Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b5e3c 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                {/* Scattered Memories */}
                {memories.map((m, i) => {
                  // Deterministic but scattered look
                  const rotation = (i * 13) % 20 - 10;
                  const left = (i * 23) % 65 + 5;
                  const top = (i * 37) % 75 + 5;
                  
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
                      animate={{ opacity: 1, scale: 1, rotate: rotation }}
                      whileHover={{ scale: 1.05, zIndex: 100 }}
                      className="absolute cursor-move group"
                      style={{ left: `${left}%`, top: `${top}%`, zIndex: i + 10 }}
                      drag
                      dragMomentum={false}
                    >
                      <div className="bg-white p-2 pb-10 shadow-lg border border-brown/5 relative w-48 sm:w-64">
                        {m.photoUrl ? (
                          <div className="relative aspect-square overflow-hidden">
                            <img src={m.photoUrl} className="w-full h-full object-cover grayscale-[0.1] sepia-[0.1]" referrerPolicy="no-referrer" />
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
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-faded-yellow/30 rotate-3 border border-brown/5 backdrop-blur-[1px]" />
                        
                        {/* Random doodles on some photos */}
                        {i % 3 === 0 && (
                          <div className="absolute -top-2 -right-2 text-dusty-rose rotate-12">
                            <Heart size={20} fill="currentColor" className="opacity-40" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Static Aesthetic Elements */}
                {/* Bunny Sticker (Mockup) */}
                <div className="absolute top-20 left-10 rotate-[-15deg] z-50 pointer-events-none">
                  <div className="w-24 h-24 bg-[#8b5e3c]/20 rounded-full flex flex-col items-center justify-center border-2 border-[#8b5e3c]/30 p-2">
                    <div className="w-12 h-12 bg-brown rounded-full mb-1" />
                    <span className="font-hand text-[10px] text-brown font-bold">MONSTER</span>
                  </div>
                </div>

                {/* Passport/ID Sticker */}
                <div className="absolute bottom-40 left-[15%] rotate-6 z-40">
                  <div className="bg-[#fdf6e3] p-4 border border-brown/20 shadow-md w-56 font-mono text-[10px] text-brown/70">
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
                </div>

                {/* Handwritten Notes */}
                <div className="absolute top-12 left-[30%] font-hand text-3xl text-brown/40 pointer-events-none">
                  i think i like this little life...
                </div>
                
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 font-hand text-4xl text-dark-brown/50 pointer-events-none whitespace-nowrap">
                  live, laugh, and love... :)
                </div>

                {/* Music Widget Mockup */}
                <div className="absolute bottom-20 right-10 w-72 bg-zinc-900/95 p-5 rounded-2xl shadow-2xl rotate-[-2deg] z-50 border border-white/10">
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

                {/* Locket Photos Mockup */}
                <div className="absolute top-[40%] right-10 flex gap-2 rotate-12 z-40">
                  <div className="w-24 h-32 rounded-full border-4 border-faded-yellow bg-white shadow-xl overflow-hidden">
                    <img src="https://picsum.photos/seed/locket1/200/300" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                  </div>
                  <div className="w-24 h-32 rounded-full border-4 border-faded-yellow bg-white shadow-xl overflow-hidden -mt-4">
                    <img src="https://picsum.photos/seed/locket2/200/300" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                  </div>
                </div>

                {/* Stickers scattered */}
                <div className="absolute top-1/4 left-1/4 opacity-30 pointer-events-none">
                  <Smile size={64} className="text-faded-yellow" />
                </div>
                <div className="absolute bottom-1/3 right-1/3 opacity-20 pointer-events-none">
                  <Pin size={48} className="text-brown rotate-45" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeOverlay === 'music' && (
          <div className="max-w-2xl mx-auto space-y-12">
            <div className="text-center">
              <h2 className="font-serif text-4xl text-dark-brown italic">The Soundtrack of Your Life</h2>
              <p className="font-hand text-lg text-brown/50 italic mt-2">Melodies tied to your most precious moments.</p>
            </div>
            
            <div className="space-y-6">
              {memories.filter(m => m.music).map((m, i) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-parchment/40 p-6 rounded-2xl border border-light-brown/10"
                >
                  <MusicPlayer 
                    song={m.music!.song}
                    artist={m.music!.artist}
                    albumArt={m.music!.albumArt}
                    audioUrl={m.musicUrl}
                  />
                  <div className="mt-4 font-hand text-sm text-brown/60 italic text-right">
                    — from "{m.title}"
                  </div>
                </motion.div>
              ))}
              
              {memories.filter(m => m.music).length === 0 && (
                <div className="text-center py-20 text-brown/30">
                  <Music size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="font-hand text-2xl italic">No music memories yet. Add a song to your next entry!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
