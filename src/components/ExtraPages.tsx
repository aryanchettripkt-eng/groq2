import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, Search, Leaf, FolderHeart, History, Music, Check, Edit2, Star, Heart, Camera as CameraIcon, Mic, Type, Play, SkipBack, SkipForward, Smile, Pin } from 'lucide-react';
import { Memory, Album, DayReaction, searchMemories } from '../lib/groq';
import CalendarView from './CalendarView';
import AlbumDetail from './AlbumDetail';
import MusicPlayer from './MusicPlayer';
import TimelineOverlay from './TimelineOverlay';
import InteractiveScrapbook from './InteractiveScrapbook';

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

      {activeOverlay === 'scrapbook' && (
        <InteractiveScrapbook memories={memories} />
      )}
    </motion.div>
  );
}
