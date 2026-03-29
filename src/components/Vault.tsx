import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mic, 
  Music, 
  Type, 
  X, 
  Plus, 
  Play, 
  Pause, 
  MapPin, 
  History, 
  Volume2, 
  VolumeX,
  ChevronLeft,
  BookOpen,
  FolderHeart,
  Sparkles,
  Edit2,
  Check,
  Calendar as CalendarIcon,
  Disc,
  Trash2,
  Square,
  Settings
} from 'lucide-react';
import { Memory, Album, DayReaction, sortMemoriesIntoAlbums } from '../lib/groq';
import { LOCAL_TRACKS, Track } from '../lib/music';
import AlbumDetail from './AlbumDetail';
import CalendarView from './CalendarView';
import MusicPlayer from './MusicPlayer';

interface VaultProps {
  onBack: () => void;
  memories: Memory[];
  onAddMemory: (memory: Memory) => void;
  onDeleteMemory: (memoryId: string) => void;
  albums: Album[];
  onUpdateAlbums: (albums: Album[]) => void;
  onUpdateAlbumTitle: (albumId: string, newTitle: string) => void;
  onUpdateAlbum: (albumId: string, data: Partial<Album>) => void;
  dayReactions: DayReaction[];
  onUpdateDayReaction: (date: string, data: Partial<DayReaction>) => void;
  activeOverlay: string | null;
  onCloseOverlay: () => void;
  onSortAlbums: () => void;
  isSorting: boolean;
  isAddModalOpen: boolean;
  onSetIsAddModalOpen: (open: boolean) => void;
  prefilledDate: string | null;
  onClearPrefilledDate: () => void;
  googleToken: string | null;
  googlePhotos: any[];
  isFetchingPhotos: boolean;
  onConnectGoogle: () => void;
  onFetchPhotos: (token: string) => void;
  spotifyToken: string | null;
  onConnectSpotify: () => void;
}

export default function Vault({ 
  onBack, 
  memories, 
  onAddMemory, 
  onDeleteMemory,
  albums, 
  onUpdateAlbums, 
  onUpdateAlbumTitle,
  onUpdateAlbum,
  dayReactions,
  onUpdateDayReaction,
  activeOverlay,
  onCloseOverlay,
  onSortAlbums,
  isSorting,
  isAddModalOpen,
  onSetIsAddModalOpen,
  prefilledDate,
  onClearPrefilledDate,
  googleToken,
  googlePhotos,
  isFetchingPhotos,
  onConnectGoogle,
  onFetchPhotos,
  spotifyToken,
  onConnectSpotify
}: VaultProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [currentMood, setCurrentMood] = useState<'golden' | 'night' | 'morning'>('golden');
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [memoryCount, setMemoryCount] = useState(memories.length);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Spotify state
  const [spotifyTracks, setSpotifyTracks] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [musicSource, setMusicSource] = useState<'local' | 'spotify'>('local');
  const [selectedLocalTrack, setSelectedLocalTrack] = useState<Track | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const memoryObjectsRef = useRef<THREE.Group[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const cameraStateRef = useRef({ theta: 0, phi: 0.3, radius: 14, targetTheta: 0, targetPhi: 0.3 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Form state
  const [newType, setNewType] = useState<Memory['type']>('photo');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMood, setNewMood] = useState('joy');
  const [newLocation, setNewLocation] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Music state
  const [newSong, setNewSong] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    audioChunksRef.current = [];
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    initThree();
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [memories, sortBy]);

  useEffect(() => {
    if (sceneRef.current) applyMoodLighting(currentMood);
  }, [currentMood]);

  const searchSpotify = async (q: string) => {
    if (!spotifyToken || !q) return;
    setIsSearchingSpotify(true);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${spotifyToken}` }
      });
      const data = await response.json();
      setSpotifyTracks(data.tracks?.items || []);
    } catch (error) {
      console.error('Spotify Search Error:', error);
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  useEffect(() => {
    setMemoryCount(memories.length);
    // Sync Three.js objects with memories
    if (sceneRef.current) {
      rebuildMemories();
    }
  }, [sortedMemories]);

  useEffect(() => {
    if (sceneRef.current) applyMoodLighting(currentMood);
  }, [currentMood]);

  // Refs for animated scene objects
  const vineGroupRef = useRef<THREE.Group | null>(null);
  const lampLightRef = useRef<THREE.PointLight | null>(null);
  const fairyLightsRef = useRef<THREE.Points | null>(null);

  const initThree = () => {
    const scene = new THREE.Scene();
    // Dark wood attic loft — cozy rainy night
    scene.fog = new THREE.FogExp2(0x1a1510, 0.025);
    scene.background = new THREE.Color(0x0e0c08);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    rendererRef.current = renderer;

    // ══════════════════════════════════════════════════════════
    // COZY A-FRAME ATTIC LOFT — Rainy night, candles, fairy lights
    // ══════════════════════════════════════════════════════════

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3220, roughness: 0.88, metalness: 0.04,
      emissive: new THREE.Color(0x1a120a), emissiveIntensity: 0.2
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3a2216, roughness: 0.9, metalness: 0.02,
      emissive: new THREE.Color(0x120a06), emissiveIntensity: 0.15
    });

    // ── FLOOR — aged dark wood planks ──
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), woodMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -5;
    floor.receiveShadow = true; scene.add(floor);

    // ── A-FRAME STRUCTURE ──
    // Side walls (pushed wide at x = -18 and 18 to avoid blocking camera/photos)
    const sideWallGeo = new THREE.PlaneGeometry(50, 16);
    const lw = new THREE.Mesh(sideWallGeo, woodMat);
    lw.position.set(-18, 0, 0); lw.rotation.y = Math.PI / 2; scene.add(lw);
    const rw = new THREE.Mesh(sideWallGeo, woodMat.clone());
    rw.position.set(18, 0, 0); rw.rotation.y = -Math.PI / 2; scene.add(rw);

    // Back wall
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), woodMat);
    bw.position.set(0, 2, -14); bw.receiveShadow = true; scene.add(bw);

    // Sloped A-frame roof panels (pushed wide)
    const roofGeo = new THREE.PlaneGeometry(22, 32);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x442b1a, roughness: 0.92,
      emissive: new THREE.Color(0x100806), emissiveIntensity: 0.15
    });
    const leftRoof = new THREE.Mesh(roofGeo, roofMat);
    leftRoof.position.set(-10, 8, 0); leftRoof.rotation.z = Math.PI * 0.22;
    leftRoof.rotation.x = 0; scene.add(leftRoof);
    const rightRoof = new THREE.Mesh(roofGeo, roofMat.clone());
    rightRoof.position.set(10, 8, 0); rightRoof.rotation.z = -Math.PI * 0.22;
    scene.add(rightRoof);

    // Exposed A-frame beams (heavy timber, pushed out to match roof)
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x4a3220, roughness: 0.82,
      emissive: new THREE.Color(0x1a120a), emissiveIntensity: 0.15
    });
    // Main ridge beam
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 34), beamMat);
    ridgeBeam.position.set(0, 11, 0); scene.add(ridgeBeam);
    // Angled rafters
    for (let rz = -12; rz <= 8; rz += 5) {
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 16), beamMat);
      lb.position.set(-7, 8.5, rz); lb.rotation.z = Math.PI * 0.18; scene.add(lb);
      const rb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 16), beamMat);
      rb.position.set(7, 8.5, rz); rb.rotation.z = -Math.PI * 0.18; scene.add(rb);
    }
    // Cross beams
    for (let cbz = -10; cbz <= 6; cbz += 8) {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(14, 0.18, 0.18), beamMat);
      cb.position.set(0, 4, cbz); scene.add(cb);
    }

    // ── SKYLIGHT WINDOW ──
    // Window frame
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1e, roughness: 0.7, metalness: 0.1,
      emissive: new THREE.Color(0x1a0e06), emissiveIntensity: 0.1
    });
    const wfOuter = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.2, 8.5), windowFrameMat);
    wfOuter.position.set(-4, 6.8, -4); wfOuter.rotation.z = Math.PI * 0.25;
    scene.add(wfOuter);
    
    // Glass pane — dark translucent blue-green (rainy night outside)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a3a, roughness: 0.1, metalness: 0.15,
      transparent: true, opacity: 0.55,
      emissive: new THREE.Color(0x0a2018), emissiveIntensity: 0.2
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 7.8), glassMat);
    glass.position.set(-3.95, 6.85, -4); glass.rotation.z = Math.PI * 0.25;
    glass.rotation.y = Math.PI * 0.08; scene.add(glass);

    // Window mullions (cross bars)
    const mullionMat = windowFrameMat.clone();
    const hMullion = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.08, 0.1), mullionMat);
    hMullion.position.set(-3.95, 6.85, -4); hMullion.rotation.z = Math.PI * 0.25;
    scene.add(hMullion);
    const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 7.5), mullionMat);
    vMullion.position.set(-3.95, 6.85, -4); vMullion.rotation.z = Math.PI * 0.25;
    scene.add(vMullion);

    // Dim blue-green light through window (moonlit forest outside) - brighter
    const windowLight = new THREE.PointLight(0x5aad9a, 2.5, 20);
    windowLight.position.set(-5, 7.5, -4); scene.add(windowLight);

    // ── RAIN PARTICLES (falling strictly OUTSIDE the window) ──
    const rainCount = 200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i*3]   = -7 + Math.random() * 6; // X covers the window
      rainPos[i*3+1] = 4 + Math.random() * 8; // Y starts high
      rainPos[i*3+2] = -4.5 + Math.random() * 0.3; // Z is behind the window at -4
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x8ab8b0, size: 0.06, transparent: true, opacity: 0.35, sizeAttenuation: true
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.userData.isRain = true;
    scene.add(rain);

    // ── COZY NOOK — triangular back shelf area ──
    // Low shelf built into the A-frame nook
    const nookShelfMat = new THREE.MeshStandardMaterial({
      color: 0x3a2815, roughness: 0.82,
      emissive: new THREE.Color(0x0a0604), emissiveIntensity: 0.08
    });
    // Bottom shelf
    const nookShelf = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 1.2), nookShelfMat);
    nookShelf.position.set(0, -1.5, -13); scene.add(nookShelf);
    // Upper shelf
    const nookShelf2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 0.9), nookShelfMat);
    nookShelf2.position.set(0, 1.5, -13.2); scene.add(nookShelf2);

    // Books stacked and leaning on shelves
    const bookColors = [0x2a1e12, 0x4a3820, 0x3a4a3e, 0x2a2a3a, 0x4a3228, 0x3e3018, 0x1e2a22];
    for (let i = 0; i < 8; i++) {
      const bh = 0.7 + Math.random() * 0.5;
      const bw = 0.22 + Math.random() * 0.12;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.6),
        new THREE.MeshStandardMaterial({
          color: bookColors[i % bookColors.length], roughness: 0.85,
          emissive: new THREE.Color(bookColors[i % bookColors.length]).multiplyScalar(0.15),
          emissiveIntensity: 0.12
        })
      );
      if (i < 5) {
        book.position.set(-3.2 + i * 0.42, -1.5 + bh/2 + 0.08, -13);
        book.rotation.y = (Math.random() - 0.5) * 0.15;
      } else {
        // Stacked horizontal on upper shelf
        book.rotation.z = Math.PI / 2;
        book.position.set(1.5 + (i-5) * 0.35, 1.5 + 0.12 + (i-5)*0.25, -13.1);
      }
      book.castShadow = true; scene.add(book);
    }

    // ── BED / SLEEPING AREA (low, on the floor) ──
    const bedBase = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.4, 7),
      darkWoodMat
    );
    bedBase.position.set(0, -4.8, 2); bedBase.receiveShadow = true; scene.add(bedBase);

    // Thick duvet — deep teal-green linen, rumpled
    const duvetMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a42, roughness: 0.96,
      emissive: new THREE.Color(0x081a14), emissiveIntensity: 0.06
    });
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.6, 6), duvetMat);
    duvet.position.set(0.2, -4.2, 2.5); duvet.rotation.y = 0.03;
    duvet.castShadow = true; scene.add(duvet);

    // Rumpled fabric bumps
    const bumpColors = [0x3a5a50, 0x2e4840, 0x3e6058, 0x2a4a44];
    for (let i = 0; i < 7; i++) {
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 + Math.random() * 0.6, 8, 6),
        new THREE.MeshStandardMaterial({
          color: bumpColors[i % bumpColors.length], roughness: 1,
          emissive: new THREE.Color(0x081510), emissiveIntensity: 0.04
        })
      );
      bump.scale.y = 0.18; bump.scale.x = 1 + Math.random() * 0.5;
      bump.position.set((Math.random()-0.5) * 8, -3.7, 1 + Math.random() * 4);
      bump.rotation.y = Math.random() * Math.PI;
      scene.add(bump);
    }

    // Scattered cushions & pillows
    const cushionConfigs = [
      { pos: [-3, -3.8, -0.2], color: 0x1e2e3e, s: [2.2, 0.55, 1.5], ry: -0.2 },
      { pos: [0, -3.7, -0.3], color: 0x3a5a52, s: [2.0, 0.65, 1.6], ry: 0.1 },
      { pos: [2.8, -3.8, 0], color: 0xb8a890, s: [2.3, 0.5, 1.5], ry: 0.3 },
      { pos: [-1, -3.9, 0.5], color: 0x2a3848, s: [1.8, 0.5, 1.4], ry: -0.4 },
      { pos: [1.5, -4.0, 3.5], color: 0x4a5a52, s: [1.6, 0.4, 1.3], ry: 0.8 },
      { pos: [-2.5, -4.0, 3], color: 0x3a4a5a, s: [1.5, 0.4, 1.2], ry: -0.6 },
    ];
    cushionConfigs.forEach(({ pos, color, s, ry }) => {
      const mat = new THREE.MeshStandardMaterial({
        color, roughness: 0.92,
        emissive: new THREE.Color(color).multiplyScalar(0.1), emissiveIntensity: 0.06
      });
      const c = new THREE.Mesh(new THREE.BoxGeometry(...s as [number,number,number]), mat);
      c.position.set(...pos as [number,number,number]);
      c.rotation.y = ry; c.castShadow = true; scene.add(c);
    });

    // ── OPEN BOOK on the floor ──
    const bookPageMat = new THREE.MeshStandardMaterial({
      color: 0xd8ccb0, roughness: 0.75,
      emissive: new THREE.Color(0x3a2810), emissiveIntensity: 0.15
    });
    const leftPage = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 1.4), bookPageMat);
    leftPage.position.set(2.8, -4.55, 5); leftPage.rotation.y = 0.15;
    leftPage.rotation.z = -0.08; scene.add(leftPage);
    const rightPage = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 1.4), bookPageMat);
    rightPage.position.set(3.8, -4.55, 5); rightPage.rotation.y = 0.15;
    rightPage.rotation.z = 0.08; scene.add(rightPage);
    const bookSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x3a2212, roughness: 0.8 })
    );
    bookSpine.position.set(3.3, -4.55, 5); bookSpine.rotation.y = 0.15;
    scene.add(bookSpine);
    // Fake text lines on pages
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x4a3a28, transparent: true, opacity: 0.2 });
    for (let pg = 0; pg < 2; pg++) {
      for (let ln = 0; ln < 8; ln++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.012), lineMat);
        line.position.set(pg === 0 ? 2.8 : 3.8, -4.53, 4.5 + ln * 0.12);
        line.rotation.x = -Math.PI / 2; line.rotation.z = 0.15;
        scene.add(line);
      }
    }

    // ── CANDLES (multiple, scattered around the nook) ──
    const candleWax = new THREE.MeshStandardMaterial({
      color: 0xd4c4a0, roughness: 0.65,
      emissive: new THREE.Color(0x3a2810), emissiveIntensity: 0.12
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffaa30, emissive: new THREE.Color(0xff8800),
      emissiveIntensity: 3.5, transparent: true, opacity: 0.92
    });
    const candleSpots = [
      {p: [3.2, -1.5, -12.8], h: 0.8, r: 0.1},
      {p: [3.8, -1.5, -12.7], h: 0.55, r: 0.08},
      {p: [-2.5, -1.5, -12.9], h: 0.65, r: 0.09},
      {p: [5, -4.3, 1], h: 0.7, r: 0.07},
      {p: [4.5, -4.3, 0.4], h: 0.5, r: 0.065},
    ];
    candleSpots.forEach(({p, h, r}) => {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), candleWax);
      candle.position.set(p[0], p[1] + h/2, p[2]); candle.castShadow = true;
      scene.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 8, 6), flameMat);
      flame.scale.y = 2.0;
      flame.position.set(p[0], p[1] + h + r * 0.4, p[2]);
      scene.add(flame);
    });

    // Candle glow lights - Brighter for warmth
    const lampLight = new THREE.PointLight(0xffbe60, 5.0, 16);
    lampLight.position.set(3.5, -0.5, -12.5); lampLight.castShadow = true;
    scene.add(lampLight); lampLightRef.current = lampLight;
    const candleLight2 = new THREE.PointLight(0xffbe60, 3.5, 12);
    candleLight2.position.set(4.8, -3.5, 0.7); scene.add(candleLight2);
    const candleLight3 = new THREE.PointLight(0xffa840, 2.5, 10);
    candleLight3.position.set(-2.5, -0.5, -12.5); scene.add(candleLight3);

    // ── FAIRY / STRING LIGHTS in the A-frame peak ──
    const fairyCount = 80;
    const fairyGeo = new THREE.BufferGeometry();
    const fairyPos = new Float32Array(fairyCount * 3);
    const fairyColors = new Float32Array(fairyCount * 3);
    for (let i = 0; i < fairyCount; i++) {
      const t2 = i / fairyCount;
      // Drape along the A-frame ridge and down the slopes
      const sx = (Math.random() - 0.5) * 12;
      const maxH = 9 - Math.abs(sx) * 0.4;
      fairyPos[i*3]   = sx;
      fairyPos[i*3+1] = maxH - Math.random() * 1.5;
      fairyPos[i*3+2] = -12 + t2 * 18 + (Math.random()-0.5) * 2;
      fairyColors[i*3]   = 1.0;
      fairyColors[i*3+1] = 0.82 + Math.random() * 0.18;
      fairyColors[i*3+2] = 0.35 + Math.random() * 0.25;
    }
    fairyGeo.setAttribute('position', new THREE.BufferAttribute(fairyPos, 3));
    fairyGeo.setAttribute('color', new THREE.BufferAttribute(fairyColors, 3));
    const fairyMat = new THREE.PointsMaterial({
      size: 0.28, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true
    });
    const fairyLights = new THREE.Points(fairyGeo, fairyMat);
    scene.add(fairyLights); fairyLightsRef.current = fairyLights;

    // Fairy light area glow
    const fg1 = new THREE.PointLight(0xffaa30, 1.5, 14);
    fg1.position.set(-3, 7, -6); scene.add(fg1);
    const fg2 = new THREE.PointLight(0xffcc50, 1.2, 12);
    fg2.position.set(3, 7, -2); scene.add(fg2);

    // ── VINE GROUP (minimal — just a subtle ref so animations don't crash) ──
    const vineGroup = new THREE.Group();
    vineGroupRef.current = vineGroup;
    scene.add(vineGroup);

    // ── DUST PARTICLES floating in candlelight ──
    const dustParticles = buildParticles();
    scene.add(dustParticles);

    applyMoodLighting('golden');
    rebuildMemories();
    animate();
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraStateRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 1, 0);
  };

  const buildParticles = () => {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Concentrate particles near lamp area in a cone of light
      const inLampCone = Math.random() > 0.45;
      if (inLampCone) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 4;
        pos[i * 3]     = -5.5 + Math.cos(angle) * r * 0.8;
        pos[i * 3 + 1] = -2.0 - Math.random() * 5;
        pos[i * 3 + 2] = 0.5 + Math.sin(angle) * r * 0.8;
      } else {
        pos[i * 3]     = (Math.random() - 0.5) * 24;
        pos[i * 3 + 1] = Math.random() * 14 - 5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xcc8840,
      size: 0.035,
      transparent: true,
      opacity: 0.15,
      sizeAttenuation: true
    }));
  };

  const applyMoodLighting = (mood: string) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    scene.children.filter(c => (c as any).isLight).forEach(l => scene.remove(l));

    const configs: any = {
      golden: { ambient: [0xffaa60, 1.2], dir: [0xffbb60, 1.0], bg: 0x0e0c08, fog: 0x1a1510 },
      night:  { ambient: [0x5070a0, 0.8], dir: [0x7090bb, 0.7], bg: 0x060810, fog: 0x101420 },
      morning:{ ambient: [0xffaa70, 1.0], dir: [0xffcc80, 0.9], bg: 0x0e0c08, fog: 0x1a1510 }
    };

    const c = configs[mood] || configs.golden;
    scene.add(new THREE.AmbientLight(c.ambient[0], c.ambient[1]));
    const dl = new THREE.DirectionalLight(c.dir[0], c.dir[1]);
    dl.position.set(3, 10, 5);
    dl.castShadow = true;
    scene.add(dl);
    scene.background = new THREE.Color(c.bg);
    scene.fog!.color.set(c.fog);
  };

  const rebuildMemories = () => {
    if (!sceneRef.current) return;
    memoryObjectsRef.current.forEach(obj => sceneRef.current?.remove(obj));
    memoryObjectsRef.current = [];

    sortedMemories.forEach((mem, i) => {
      const obj = createMemoryMesh(mem);
      // Random placement
      const angle = (i / sortedMemories.length) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 3 + Math.random() * 4;
      obj.position.set(Math.sin(angle) * dist, Math.random() * 3 - 0.5, Math.cos(angle) * dist);
      obj.rotation.y = Math.random() * Math.PI * 2;
      obj.userData = { memoryId: mem.id, floatOffset: Math.random() * Math.PI * 2 };
      sceneRef.current?.add(obj);
      memoryObjectsRef.current.push(obj);
    });
  };

  const createMemoryMesh = (mem: Memory) => {
    const group = new THREE.Group();
    if (mem.type === 'photo') {
      // Scrapbook Polaroid
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.0, 0.06), 
        new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.9 })
      );
      group.add(back);
      
      const photo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4), 
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      if (mem.photoUrl) {
        const tex = new THREE.TextureLoader().load(mem.photoUrl);
        photo.material = new THREE.MeshStandardMaterial({ map: tex });
      }
      photo.position.set(0, 0.2, 0.035);
      group.add(photo);

      // Washi tape at top
      const tape = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xc9a0a0, transparent: true, opacity: 0.8 })
      );
      tape.position.set(0, 0.95, 0.04);
      tape.rotation.z = Math.random() * 0.2 - 0.1;
      group.add(tape);
    } else {
      // Torn paper note
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.2, 0.04), 
        new THREE.MeshStandardMaterial({ color: 0xe6dcc5, roughness: 0.8 })
      );
      group.add(note);
      
      // Scribble lines
      const lineGeom = new THREE.PlaneGeometry(1.4, 0.02);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x4a342a, opacity: 0.3, transparent: true });
      for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.position.set(0, 0.6 - i * 0.3, 0.021);
        group.add(line);
      }
    }
    group.scale.setScalar(0.72);
    group.userData.memoryId = mem.id;
    return group;
  };

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    animIdRef.current = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;

    // Smooth camera
    cameraStateRef.current.theta += (cameraStateRef.current.targetTheta - cameraStateRef.current.theta) * 0.05;
    cameraStateRef.current.phi += (cameraStateRef.current.targetPhi - cameraStateRef.current.phi) * 0.05;
    updateCameraPosition();

    // Float memories
    memoryObjectsRef.current.forEach(obj => {
      obj.position.y += Math.sin(t * 0.6 + obj.userData.floatOffset) * 0.002;
      obj.rotation.y += 0.002;
    });

    // Gently sway vine group (if exists)
    if (vineGroupRef.current) {
      vineGroupRef.current.rotation.z = Math.sin(t * 0.18) * 0.012;
      vineGroupRef.current.rotation.x = Math.sin(t * 0.13 + 1.0) * 0.008;
    }

    // Candle flicker — subtle warm pulse
    if (lampLightRef.current) {
      lampLightRef.current.intensity = 3.2 + Math.sin(t * 3.1) * 0.3 + Math.sin(t * 8.5) * 0.15;
    }

    // Fairy lights twinkle
    if (fairyLightsRef.current) {
      (fairyLightsRef.current.material as THREE.PointsMaterial).opacity =
        0.8 + Math.sin(t * 1.2) * 0.15;
    }

    // Rain animation — particles fall and loop
    sceneRef.current.children.forEach(child => {
      if (child.userData.isRain && child instanceof THREE.Points) {
        const positions = (child.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) {
          let y = positions.getY(i);
          y -= 0.12; // fall speed
          if (y < -5) y = 10 + Math.random() * 2;
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };
  const animIdRef = useRef<number>(0);

  // Handle prefilled date from calendar
  useEffect(() => {
    if (prefilledDate) {
      setNewDate(prefilledDate);
    }
  }, [prefilledDate]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!cameraRef.current) return;
    mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const hits = raycasterRef.current.intersectObjects(memoryObjectsRef.current, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !obj.userData.memoryId) obj = obj.parent;
      if (obj.userData.memoryId) {
        const mem = memories.find(m => m.id === obj.userData.memoryId);
        if (mem) setSelectedMemory(mem);
      }
    }
  };

  const handleSave = () => {
    // Mock sentiment and emotion detection
    const emotions = ['happy', 'nostalgic', 'melancholic', 'peaceful'];
    const mockEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    const mockTranscript = newType === 'voice' ? "This is a mock transcription of your beautiful voice memory..." : undefined;

    const mem: Memory = {
      id: Math.random().toString(36).substr(2, 9),
      type: newType,
      title: newTitle || 'Untitled Moment',
      desc: newDesc,
      mood: newMood,
      location: newLocation,
      date: new Date(newDate).toISOString(),
      photoUrl: photoPreview || undefined,
      audioUrl: audioUrl || undefined,
      musicUrl: newType === 'music' ? (musicSource === 'local' ? selectedLocalTrack?.url : undefined) : undefined,
      transcript: mockTranscript,
      emotion: mockEmotion,
      music: newSong ? {
        song: newSong,
        artist: newArtist,
        albumArt: photoPreview || `https://picsum.photos/seed/${newSong}/300/300`
      } : undefined
    };
    onAddMemory(mem);
    onSetIsAddModalOpen(false);
    onClearPrefilledDate();
    // Reset
    setNewTitle(''); setNewDesc(''); setNewLocation(''); setPhotoPreview(null);
    setAudioUrl(null); setNewSong(''); setNewArtist('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-warm-white overflow-hidden">
      <div className="film-grain" />
      <div className="light-leak" />
      
      {/* Three.js Canvas */}
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        onMouseDown={(e) => { isDraggingRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; }}
        onMouseMove={(e) => {
          if (!isDraggingRef.current) return;
          const dx = e.clientX - lastMouseRef.current.x;
          const dy = e.clientY - lastMouseRef.current.y;
          cameraStateRef.current.targetTheta -= dx * 0.005;
          cameraStateRef.current.targetPhi -= dy * 0.004;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseUp={() => isDraggingRef.current = false}
        className="block w-full h-full cursor-move" 
      />

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-[1000] p-7 flex items-center justify-between pointer-events-none">
        <button 
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 font-hand text-brown/80 hover:text-dark-brown transition-colors"
        >
          <ChevronLeft size={18} />
          back to journal
        </button>
        <div className="flex gap-3 pointer-events-auto">
          <div className="flex bg-parchment/80 border border-light-brown/20 rounded-full p-0.5 backdrop-blur-md shadow-sm">
            <button 
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1 rounded-full font-hand text-xs transition-all ${sortBy === 'newest' ? 'bg-brown text-cream' : 'text-brown hover:bg-brown/10'}`}
            >
              Newest
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1 rounded-full font-hand text-xs transition-all ${sortBy === 'oldest' ? 'bg-brown text-cream' : 'text-brown hover:bg-brown/10'}`}
            >
              Oldest
            </button>
          </div>
          <button 
            onClick={() => onSortAlbums()}
            disabled={isSorting}
            className="bg-sage/20 border border-sage/30 text-moss font-hand text-sm px-4 py-1.5 rounded-full hover:bg-sage/30 transition-all backdrop-blur-md shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSorting ? (
              <span className="animate-pulse">Sorting...</span>
            ) : (
              <>
                <Sparkles size={14} />
                AI Albums
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mood Panel */}
      <div className="fixed bottom-24 left-6 z-[1000] flex flex-col gap-2">
        <div className="font-hand text-[10px] text-brown/50 uppercase tracking-widest">Atmosphere</div>
        <div className="flex gap-1.5">
          {(['golden', 'night', 'morning'] as const).map(m => (
            <button 
              key={m}
              onClick={() => setCurrentMood(m)}
              className={`w-8 h-8 rounded-full border border-light-brown/30 flex items-center justify-center transition-all backdrop-blur-md ${currentMood === m ? 'bg-sage/30 border-sage' : 'bg-parchment/60'}`}
            >
              {m === 'golden' ? '🌅' : m === 'night' ? '🌙' : '🌤'}
            </button>
          ))}
        </div>
      </div>

      {/* Add FAB */}
      <button 
        onClick={() => onSetIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 z-[1000] w-14 h-14 bg-moss border-[1.5px] border-light-brown rounded-full flex items-center justify-center text-2xl text-parchment shadow-2xl hover:scale-110 transition-transform"
      >
        <Plus />
      </button>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] flex items-center justify-center bg-cream/75 backdrop-blur-xl p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-warm-white border border-light-brown/20 rounded-[4px] p-9 max-w-[540px] w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
            >
              <button onClick={() => { onSetIsAddModalOpen(false); onClearPrefilledDate(); }} className="absolute top-4 right-4 text-brown/40 hover:text-dusty-rose"><X size={20} /></button>
              <h2 className="font-serif text-2xl text-dark-brown italic mb-1.5">New Journal Entry</h2>
              <p className="font-hand text-sm text-brown/50 mb-7">✦ what kind of moment is this? ✦</p>
              
              <div className="flex gap-2 flex-wrap mb-6">
                {(['photo', 'voice', 'text', 'music'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`px-4 py-1.5 rounded-full font-hand text-sm border transition-all ${newType === t ? 'bg-sage/20 border-sage text-moss' : 'bg-parchment/30 border-light-brown/20 text-brown/60'}`}
                  >
                    {t === 'photo' ? '📷 Photo' : t === 'voice' ? '🎙 Voice' : t === 'text' ? '✍️ Story' : '🎵 Music'}
                  </button>
                ))}
              </div>

              {newType === 'photo' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-hand text-xs text-brown/50 uppercase tracking-widest">Upload Photo</div>
                    {!googleToken ? (
                      <button 
                        onClick={onConnectGoogle}
                        className="font-hand text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Connect Google Photos
                      </button>
                    ) : (
                      <div className="font-hand text-[10px] text-green-600">Connected to Photos</div>
                    )}
                  </div>

                  {googleToken && googlePhotos.length > 0 && (
                    <div className="mb-4">
                      <div className="font-hand text-[10px] text-brown/40 mb-2 italic">Select from your recent Google Photos:</div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {googlePhotos.map((photo) => (
                          <img 
                            key={photo.id}
                            src={photo.baseUrl}
                            onClick={() => setPhotoPreview(photo.baseUrl)}
                            className={`w-16 h-16 object-cover rounded-[2px] cursor-pointer border-2 transition-all ${photoPreview === photo.baseUrl ? 'border-dusty-rose scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="block border-2 border-dashed border-light-brown/20 rounded-[4px] p-7 text-center cursor-pointer hover:border-dusty-rose/50 hover:bg-dusty-rose/5 transition-all">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Camera className="mx-auto mb-2 opacity-40" size={28} />
                    <div className="font-hand text-sm text-brown/40">Click to select a photo</div>
                  </label>
                  {photoPreview && <img src={photoPreview} className="mt-4 w-full h-32 object-cover rounded-[2px]" />}
                </div>
              )}

              {newType === 'voice' && (
                <div className="mb-6">
                  <div className="font-hand text-xs text-brown/50 uppercase tracking-widest mb-3">Record Voice Memory</div>
                  <div className="flex items-center gap-4 bg-parchment/30 p-6 rounded-2xl border border-light-brown/10">
                    {!audioUrl ? (
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-dark-brown text-cream hover:scale-105'}`}
                      >
                        {isRecording ? <Square size={24} /> : <Mic size={24} />}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <button className="w-12 h-12 rounded-full bg-sage text-white flex items-center justify-center shadow-md">
                          <Play size={20} fill="currentColor" />
                        </button>
                        <div className="flex-1 h-1 bg-brown/10 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-sage" />
                        </div>
                        <button onClick={deleteRecording} className="text-brown/30 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                    {!audioUrl && (
                      <div className="font-hand text-sm text-brown/60 italic">
                        {isRecording ? "Listening to your thoughts..." : "Tap to start recording"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {newType === 'music' && (
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-4 border-b border-light-brown/10 pb-2">
                    <button 
                      onClick={() => setMusicSource('local')}
                      className={`font-hand text-xs uppercase tracking-widest pb-1 transition-all ${musicSource === 'local' ? 'text-dark-brown border-b-2 border-dark-brown' : 'text-brown/40 hover:text-brown/60'}`}
                    >
                      Local Library
                    </button>
                    <button 
                      onClick={() => setMusicSource('spotify')}
                      className={`font-hand text-xs uppercase tracking-widest pb-1 transition-all ${musicSource === 'spotify' ? 'text-green-600 border-b-2 border-green-600' : 'text-brown/40 hover:text-brown/60'}`}
                    >
                      Spotify
                    </button>
                  </div>

                  {musicSource === 'local' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {LOCAL_TRACKS.map(track => (
                          <button 
                            key={track.id}
                            onClick={() => {
                              setSelectedLocalTrack(track);
                              setNewSong(track.title);
                              setNewArtist(track.artist);
                              setPhotoPreview(track.albumArt);
                            }}
                            className={`flex items-center gap-3 p-2 rounded-xl transition-all ${selectedLocalTrack?.id === track.id ? 'bg-dusty-rose/20 border border-dusty-rose/30' : 'bg-black/5 hover:bg-black/10'}`}
                          >
                            <img src={track.albumArt} className="w-10 h-10 rounded shadow-sm" />
                            <div className="text-left min-w-0">
                              <div className="text-[11px] font-hand text-ink truncate">{track.title}</div>
                              <div className="text-[9px] text-brown/50 font-hand truncate">{track.artist}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="font-hand text-[10px] text-brown/50 uppercase tracking-widest flex items-center justify-between">
                        <span>Spotify Search</span>
                        {!spotifyToken ? (
                          <button 
                            onClick={onConnectSpotify}
                            className="text-[10px] text-green-600 hover:underline flex items-center gap-1"
                          >
                            Connect Spotify
                          </button>
                        ) : (
                          <span className="text-[10px] text-green-600">Connected</span>
                        )}
                      </div>
                      
                      {spotifyToken && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input 
                              value={spotifySearchQuery}
                              onChange={(e) => setSpotifySearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && searchSpotify(spotifySearchQuery)}
                              className="flex-1 bg-parchment/20 border border-light-brown/15 rounded-[3px] px-3 py-2 text-ink font-hand outline-none"
                              placeholder="Search for a song..."
                            />
                            <button 
                              onClick={() => searchSpotify(spotifySearchQuery)}
                              className="bg-dark-brown text-cream px-4 rounded-[3px] font-hand text-sm"
                            >
                              Search
                            </button>
                          </div>
                          
                          {spotifyTracks.length > 0 && (
                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {spotifyTracks.map(track => (
                                <button 
                                  key={track.id}
                                  onClick={() => {
                                    setNewSong(track.name);
                                    setNewArtist(track.artists[0].name);
                                    setPhotoPreview(track.album.images[0].url);
                                  }}
                                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${newSong === track.name ? 'bg-dusty-rose/20 border border-dusty-rose/30' : 'bg-black/5 hover:bg-black/10'}`}
                                >
                                  <img src={track.album.images[2].url} className="w-10 h-10 rounded shadow-sm" />
                                  <div className="text-left">
                                    <div className="text-sm font-hand text-ink truncate max-w-[200px]">{track.name}</div>
                                    <div className="text-[10px] text-brown/50 font-hand">{track.artists[0].name}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-hand text-[10px] text-brown/40 uppercase mb-1">Song Name</label>
                      <input 
                        value={newSong}
                        onChange={(e) => setNewSong(e.target.value)}
                        className="w-full bg-parchment/20 border border-light-brown/15 rounded-[3px] px-3 py-2 text-ink font-hand outline-none"
                        placeholder="e.g. Moonlight Sonata"
                      />
                    </div>
                    <div>
                      <label className="block font-hand text-[10px] text-brown/40 uppercase mb-1">Artist</label>
                      <input 
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        className="w-full bg-parchment/20 border border-light-brown/15 rounded-[3px] px-3 py-2 text-ink font-hand outline-none"
                        placeholder="e.g. Beethoven"
                      />
                    </div>
                  </div>
                  <div className="bg-black/5 p-4 rounded-xl border border-dashed border-brown/10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-200 rounded-lg flex items-center justify-center text-brown/20 overflow-hidden">
                      {photoPreview && newType === 'music' ? (
                        <img src={photoPreview} className="w-full h-full object-cover" />
                      ) : (
                        <Disc size={24} className="animate-spin-slow" />
                      )}
                    </div>
                    <div className="font-hand text-xs text-brown/40 italic">
                      {newSong ? `Linking "${newSong}" to this memory...` : "Select a track to see preview"}
                    </div>
                  </div>
                </div>
              )}

              <div className="font-hand text-xs text-brown/50 uppercase tracking-widest mb-1.5">Title</div>
              <input 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-parchment/20 border border-light-brown/15 rounded-[3px] px-3.5 py-2.5 text-ink font-hand text-lg outline-none focus:border-light-brown/40 mb-4" 
                placeholder="a golden afternoon in October…" 
              />

              <div className="font-hand text-xs text-brown/50 uppercase tracking-widest mb-1.5">Write about it</div>
              <textarea 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-parchment/20 border border-light-brown/15 rounded-[3px] px-3.5 py-2.5 text-ink font-hand text-lg outline-none focus:border-light-brown/40 mb-4 resize-none" 
                rows={3}
                placeholder="What you felt, what you noticed…" 
              />

              <button 
                onClick={handleSave}
                className="w-full py-3.5 bg-moss border border-light-brown text-cream font-hand text-lg tracking-widest rounded-[3px] hover:bg-dark-brown transition-all mt-4"
              >
                ✦ Place this memory in my Reminiq ✦
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays are handled globally in App.tsx */}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[360px] bg-warm-white/95 backdrop-blur-2xl border-l border-light-brown/15 p-8 z-[6000] overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="inline-block font-hand text-[10px] text-sage border border-sage/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest">{selectedMemory.type}</div>
                
                {selectedMemory.emotion && (
                  <div className="inline-block ml-2 font-hand text-[10px] bg-dusty-rose/10 text-dusty-rose border border-dusty-rose/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                    {selectedMemory.emotion}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  onDeleteMemory(selectedMemory.id);
                  setSelectedMemory(null);
                }}
                className="text-brown/30 hover:text-red-500 transition-colors"
                title="Delete memory"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="date-stamp text-lg mb-3">{new Date(selectedMemory.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <h3 className="font-serif text-xl text-dark-brown italic mb-4 leading-tight">{selectedMemory.title}</h3>
            
            {selectedMemory.photoUrl && (
              <div className="bg-zinc-900 p-3 pb-10 shadow-2xl mb-6 relative rotate-1 rounded-sm group overflow-hidden">
                <img src={selectedMemory.photoUrl} className="w-full grayscale-[0.2] sepia-[0.1] group-hover:grayscale-0 transition-all duration-700" />
                <div className="absolute bottom-3 left-0 right-0 text-center font-hand text-[10px] text-white/40 uppercase tracking-widest">{selectedMemory.title}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
            )}

            {selectedMemory.music && (
              <div className="mb-6">
                <MusicPlayer 
                  song={selectedMemory.music.song}
                  artist={selectedMemory.music.artist}
                  albumArt={selectedMemory.music.albumArt}
                  audioUrl={selectedMemory.musicUrl}
                  autoPlay={true}
                />
              </div>
            )}

            {selectedMemory.transcript && (
              <div className="mb-6 p-4 bg-parchment/30 rounded-2xl border border-light-brown/10">
                <div className="font-hand text-[10px] text-brown/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Mic size={10} /> Transcript
                </div>
                <p className="font-hand text-sm text-brown italic leading-relaxed">"{selectedMemory.transcript}"</p>
              </div>
            )}

            <p className="font-body text-sm text-ink/70 leading-relaxed mb-6">{selectedMemory.desc}</p>
            
            {selectedMemory.location && (
              <div className="flex items-center gap-2 font-hand text-xs text-moss mb-4">
                <MapPin size={12} /> {selectedMemory.location}
              </div>
            )}
            
            <div className="font-hand text-sm text-sage">✦ {selectedMemory.mood}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal Timeline Strip is handled globally in App.tsx */}
    </div>
  );
}
