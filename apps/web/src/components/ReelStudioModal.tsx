import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Film,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Music,
  Clock,
  Sparkles,
  Layers,
  Youtube,
  Radio,
  Search,
  Mic,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

interface ReelStudioModalProps {
  draft: any;
  title: string;
  body: string;
  onClose: () => void;
}

// Opciones de narradores profesionales estilo CapCut y TV
export interface NarratorOption {
  id: string;
  name: string;
  badge: string;
  desc: string;
  lang: string;
  rate: number;
  pitch: number;
  gender: 'male' | 'female';
}

const NARRATORS: NarratorOption[] = [
  {
    id: 'capcut_viral',
    name: 'Narrador CapCut Viral',
    badge: '🔥 Clásico TikTok / CapCut',
    desc: 'Voz masculina dinámica con ritmo latino enérgico y punch',
    lang: 'es-US',
    rate: 1.18,
    pitch: 1.05,
    gender: 'male',
  },
  {
    id: 'noticiero_tv',
    name: 'Presentador TV Formal',
    badge: '📺 Noticias Serias',
    desc: 'Tono informativo institucional, solemne y creíble',
    lang: 'es',
    rate: 1.02,
    pitch: 0.95,
    gender: 'male',
  },
  {
    id: 'presentadora_tv',
    name: 'Presentadora Informativa',
    badge: '🎙️ Voz Femenina TV',
    desc: 'Conductora de televisión femenina, clara y cercana',
    lang: 'es-US',
    rate: 1.08,
    pitch: 1.15,
    gender: 'female',
  },
  {
    id: 'shorts_rapido',
    name: 'Locutor Flash Shorts',
    badge: '⚡ Ultra Dinámico (15s)',
    desc: 'Ritmo rápido 1.25x directo al punto para retención instantánea',
    lang: 'es-US',
    rate: 1.28,
    pitch: 1.08,
    gender: 'male',
  },
  {
    id: 'documental_pro',
    name: 'Narrador Documental',
    badge: '🎬 Cine / Misterio',
    desc: 'Cadencia cinematográfica y profunda para historias de impacto',
    lang: 'es',
    rate: 0.94,
    pitch: 0.90,
    gender: 'male',
  },
];

// Limpieza estricta de emojis, símbolos raros y agregadores
export function cleanNewsForNarration(text: string): string {
  if (!text) return '';
  return text
    // Quitar tags HTML
    .replace(/<[^>]*>?/gm, '')
    // Quitar emojis unicode completos
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}]/gu, '')
    // Quitar prefijos comunes de agregador / referencias
    .replace(/^Actualidad:\s*/i, '')
    .replace(/^Última hora:?\s*/i, '')
    .replace(/^Noticia:?\s*/i, '')
    .replace(/^De acuerdo con la información reportada por [^,]+,\s*/i, '')
    .replace(/^Según reportes de [^,]+,\s*/i, '')
    .replace(/^Según información de [^,]+,\s*/i, '')
    .replace(/\.\.\s*Los detalles continúan bajo seguimiento editorial\./i, '.')
    .replace(/Fuente:\s*[^.\n]+/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/#\w+/g, '')
    // Quitar símbolos extraños que los TTS leen en voz alta
    .replace(/[*_#~`\\/|•–—«»]/g, ' ')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Catálogo de imágenes periodísticas temáticas HD por categoría
const THEMATIC_IMAGES: Record<string, string[]> = {
  deportes: [
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1080&auto=format&fit=crop&q=80',
  ],
  entretenimiento: [
    'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578022761797-b8636ac1773c?w=1080&auto=format&fit=crop&q=80',
  ],
  salud_detox: [
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1080&auto=format&fit=crop&q=80',
  ],
  seguridad_policia: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop&q=80',
  ],
  colombia_actualidad: [
    'https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1080&auto=format&fit=crop&q=80',
  ],
  economia: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1080&auto=format&fit=crop&q=80',
  ],
  tecnologia: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&auto=format&fit=crop&q=80',
  ],
  bebes_medicina: [
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1080&auto=format&fit=crop&q=80',
  ],
};

function detectThemeCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('boxeo') || lower.includes('tyson') || lower.includes('fútbol') || lower.includes('futbol') || lower.includes('deporte') || lower.includes('gol') || lower.includes('campeón')) {
    return 'deportes';
  }
  if (lower.includes('netflix') || lower.includes('serie') || lower.includes('película') || lower.includes('cine') || lower.includes('documental') || lower.includes('actor') || lower.includes('música') || lower.includes('shakira')) {
    return 'entretenimiento';
  }
  if (lower.includes('zumo') || lower.includes('detox') || lower.includes('chef') || lower.includes('receta') || lower.includes('comida') || lower.includes('nutrición')) {
    return 'salud_detox';
  }
  if (lower.includes('bomba') || lower.includes('atentado') || lower.includes('policía') || lower.includes('seguridad') || lower.includes('heridos') || lower.includes('crimen')) {
    return 'seguridad_policia';
  }
  if (lower.includes('cuatrillizo') || lower.includes('bebé') || lower.includes('embarazo') || lower.includes('nacieron')) {
    return 'bebes_medicina';
  }
  if (lower.includes('dólar') || lower.includes('dolar') || lower.includes('econom') || lower.includes('inflación')) {
    return 'economia';
  }
  if (lower.includes('ia') || lower.includes('inteligencia artificial') || lower.includes('tecnología') || lower.includes('whatsapp') || lower.includes('openai')) {
    return 'tecnologia';
  }
  return 'colombia_actualidad';
}

export const ReelStudioModal: React.FC<ReelStudioModalProps> = ({
  draft,
  title,
  body,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Modo de duración: youtube_15 (14s para Shorts) vs reels_30 vs reels_60
  const [durationMode, setDurationMode] = useState<'youtube_15' | 'reels_30' | 'reels_60'>('youtube_15');
  const durationSeconds = durationMode === 'youtube_15' ? 14 : durationMode === 'reels_30' ? 30 : 55;

  // Narrador seleccionado (Voz de CapCut por defecto)
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>('capcut_viral');
  const activeNarrator = NARRATORS.find((n) => n.id === selectedNarratorId) || NARRATORS[0];

  // Estilo de subtítulos CapCut
  const [subtitleStyle, setSubtitleStyle] = useState<'capcut_yellow' | 'tiktok_box' | 'breaking_red'>('capcut_yellow');

  // Ajustes de volumen
  const [musicVolume, setMusicVolume] = useState<number>(0.25);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);

  // Limpieza estricta: SIN EMOJIS, SOLO LA NOTICIA PURA
  const cleanPureTitle = cleanNewsForNarration(title || draft?.title || '');
  const cleanPureBody = cleanNewsForNarration(body || draft?.body || '');

  // Subtítulos virales con ráfagas cortas (2 a 3 palabras por pantalla)
  const subtitleChunks = React.useMemo(() => {
    const fullText = `${cleanPureTitle}. ${cleanPureBody}`;
    const words = fullText.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks.length > 0 ? chunks : [cleanPureTitle];
  }, [cleanPureTitle, cleanPureBody]);

  // Escenas en la línea de tiempo (Mini CapCut Timeline)
  const categoryKey = detectThemeCategory(`${cleanPureTitle} ${cleanPureBody}`);
  const suggestedStock = THEMATIC_IMAGES[categoryKey] || THEMATIC_IMAGES['colombia_actualidad'];

  const initialMainImage = draft?.imageUrl && draft.imageUrl.startsWith('http')
    ? `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`
    : suggestedStock[0];

  const [scenes, setScenes] = useState<string[]>([
    initialMainImage,
    suggestedStock[1] || suggestedStock[0],
    suggestedStock[2] || suggestedStock[0],
  ]);

  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);

  // Buscador de imágenes de Internet
  const initialSearchWord = cleanPureTitle.split(' ').slice(0, 3).join(' ');
  const [searchQuery, setSearchQuery] = useState(initialSearchWord);
  const [searchResults, setSearchResults] = useState<{ url: string; thumbUrl: string; title: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Precargar imágenes de la línea de tiempo
  useEffect(() => {
    loadedImagesRef.current = [];
    scenes.forEach((url, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        loadedImagesRef.current[idx] = img;
        if (idx === 0) drawFrame(0);
      };
      img.onerror = () => {
        if (suggestedStock[idx]) {
          img.src = suggestedStock[idx];
        }
      };
    });
    drawFrame(0);
  }, [scenes]);

  // Buscar imágenes en internet
  const handleSearchImages = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/media/search-images?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn('Error al buscar imágenes:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Asignar imagen a la escena activa
  const handleSelectImageForActiveScene = (url: string) => {
    setScenes((prev) => {
      const updated = [...prev];
      updated[activeSceneIndex] = url;
      return updated;
    });
  };

  // Agregar nueva escena al timeline
  const handleAddScene = (url: string) => {
    setScenes((prev) => [...prev, url]);
    setActiveSceneIndex(scenes.length);
  };

  // Eliminar escena
  const handleRemoveScene = (idxToRemove: number) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setActiveSceneIndex((prev) => Math.max(0, Math.min(prev, scenes.length - 2)));
  };

  // Subir archivo local desde PC
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleSelectImageForActiveScene(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // SINTETIZADOR DE AUDIO (Música de fondo + Narrador CapCut)
  const setupAudioGraph = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // 1. Música TV News sintetizada
      if (musicVolume > 0) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(65.41, ctx.currentTime);
        bassGain.gain.setValueAtTime(0.05 * musicVolume, ctx.currentTime);
        bassOsc.connect(bassGain);
        bassGain.connect(dest);
        bassGain.connect(ctx.destination);
        bassOsc.start();

        const pulseOsc = ctx.createOscillator();
        const pulseGain = ctx.createGain();
        pulseOsc.type = 'sine';
        pulseOsc.frequency.setValueAtTime(130.81, ctx.currentTime);
        pulseGain.gain.setValueAtTime(0.04 * musicVolume, ctx.currentTime);
        pulseOsc.connect(pulseGain);
        pulseGain.connect(dest);
        pulseGain.connect(ctx.destination);
        pulseOsc.start();
      }

      // 2. Voz en off del narrador (SOLO LA NOTICIA PURA, SIN EMOJIS NI REFERENCIAS)
      if (voiceVolume > 0) {
        const textToSpeak = `${cleanPureTitle}. ${cleanPureBody.slice(0, 220)}`;
        const ttsUrl = `/api/media/tts?text=${encodeURIComponent(textToSpeak.slice(0, 250))}&lang=${activeNarrator.lang}&t=${Date.now()}`;
        const audio = new Audio(ttsUrl);
        audio.crossOrigin = 'anonymous';
        audio.playbackRate = activeNarrator.rate;
        audioElementRef.current = audio;

        audio.oncanplay = () => {
          try {
            audio.playbackRate = activeNarrator.rate;
            const source = ctx.createMediaElementSource(audio);
            const voiceGain = ctx.createGain();
            voiceGain.gain.setValueAtTime(0.95 * voiceVolume, ctx.currentTime);
            source.connect(voiceGain);
            voiceGain.connect(dest);
            voiceGain.connect(ctx.destination);
            audio.play();
          } catch {
            audio.play();
          }
        };

        audio.onerror = () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(textToSpeak);
            utt.rate = activeNarrator.rate;
            utt.pitch = activeNarrator.pitch;
            const voices = window.speechSynthesis.getVoices();
            const esVoice = voices.find((v) =>
              activeNarrator.gender === 'female'
                ? v.lang.startsWith('es') && (v.name.includes('Sabina') || v.name.includes('Helena') || v.name.includes('Mónica'))
                : v.lang.startsWith('es') && !v.name.includes('Sabina') && !v.name.includes('Helena')
            ) || voices.find((v) => v.lang.startsWith('es'));

            if (esVoice) utt.voice = esVoice;
            window.speechSynthesis.speak(utt);
          }
        };
      }

      return dest.stream.getAudioTracks();
    } catch (err) {
      console.warn('Error en audio graph:', err);
      return [];
    }
  };

  // DIBUJAR FRAME (720x1280 Vertical 9:16)
  const drawFrame = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 720;
    const height = 1280;

    // Calcular qué escena está activa (Cortes de video reales estilo CapCut)
    const sceneCount = Math.max(scenes.length, 1);
    const currentSceneIdx = Math.min(Math.floor(progress * sceneCount), sceneCount - 1);
    const sceneProgress = (progress * sceneCount) % 1;

    // 1. DIBUJAR IMAGEN DE LA ESCENA ACTUAL CON EFECTO KEN BURNS DINÁMICO
    const img = loadedImagesRef.current[currentSceneIdx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      let zoom = 1.06;
      let panX = 0;
      let panY = 0;

      if (currentSceneIdx % 3 === 0) {
        zoom = 1.05 + sceneProgress * 0.12;
      } else if (currentSceneIdx % 3 === 1) {
        zoom = 1.12;
        panX = (sceneProgress - 0.5) * 50;
      } else {
        zoom = 1.18 - sceneProgress * 0.1;
      }

      ctx.translate(width / 2, height * 0.42);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height * 0.42);

      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = width;
      let drawH = width / aspect;
      if (drawH < 860) {
        drawH = 860;
        drawW = drawH * aspect;
      }
      ctx.drawImage(img, (width - drawW) / 2 + panX, panY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. DEGRADADO CINEMATOGRÁFICO DE CONTRASTE
    const grad = ctx.createLinearGradient(0, 320, 0, height);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.82)');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 3. BARRA SUPERIOR DE TV EN VIVO (Canal de Noticias)
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, width, 84);

    // Píldora de EN VIVO con punto parpadeante
    const isBlink = Math.floor(progress * 24) % 2 === 0;
    ctx.fillStyle = isBlink ? '#ffffff' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(42, 42, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 23px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      durationMode === 'youtube_15' ? 'NOTICIAS AL INSTANTE' : 'EN VIVO • NOTICIAS COLOMBIA',
      65,
      50
    );

    // Reloj digital y duración
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${timeStr} COT`, width - 35, 50);
    ctx.restore();

    // 4. INDICADOR DE ESCENA / TIPO CORTE (Estilo CapCut)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(40, 105, 175, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ESCENA ${currentSceneIdx + 1} DE ${sceneCount}`, 127, 127);
    ctx.restore();

    // 5. TITULAR EN LETRAS GRANDES DE ALTO IMPACTO (Texto limpio, sin emojis distorsionados)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';

    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let cur = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const test = cur + ' ' + words[i];
        if (ctx.measureText(test).width < maxWidth) {
          cur = test;
        } else {
          lines.push(cur);
          cur = words[i];
        }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const titleLines = wrapText(cleanPureTitle, width - 90).slice(0, 3);
    titleLines.forEach((line, idx) => {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 7;
      ctx.strokeText(line, 45, 720 + idx * 46);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, 45, 720 + idx * 46);
    });
    ctx.restore();

    // 6. SUBTÍTULOS ANIMADOS ESTILO CAPCUT VIRAL (Más pequeños, centrados y seguros sin desbordarse)
    ctx.save();
    ctx.textAlign = 'center';

    const activeIndex = Math.min(
      Math.floor(progress * subtitleChunks.length),
      subtitleChunks.length - 1
    );
    const rawSubtitle = (subtitleChunks[activeIndex] || '').toUpperCase();

    // Auto-escalado de fuente para que NUNCA se salga del marco seguro (max 500px)
    let subFontSize = 26;
    ctx.font = `900 ${subFontSize}px system-ui, -apple-system, sans-serif`;
    let measuredWidth = ctx.measureText(rawSubtitle).width;

    while (measuredWidth > 490 && subFontSize > 18) {
      subFontSize -= 2;
      ctx.font = `900 ${subFontSize}px system-ui, -apple-system, sans-serif`;
      measuredWidth = ctx.measureText(rawSubtitle).width;
    }

    const pillPaddingX = 28;
    const pillWidth = Math.min(measuredWidth + pillPaddingX * 2, 540);
    const pillHeight = subFontSize + 24;
    const pillX = (width - pillWidth) / 2;
    const pillY = 940;
    const textY = pillY + pillHeight / 2 + subFontSize * 0.35;

    if (subtitleStyle === 'capcut_yellow') {
      // Estilo 1: CapCut Amarillo Pro (Fondo negro satinado con contorno amarillo neón y texto amarillo)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 14);
      ctx.fill();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(rawSubtitle, width / 2, textY);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(rawSubtitle, width / 2, textY);
    } else if (subtitleStyle === 'breaking_red') {
      // Estilo 2: Franja roja de alerta con texto blanco
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(rawSubtitle, width / 2, textY);
    } else {
      // Estilo 3: Caja blanca limpia TikTok minimalista
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillText(rawSubtitle, width / 2, textY);
    }
    ctx.restore();

    // 7. CINTILLO / TICKER INFERIOR EN MOVIMIENTO CONTINUO
    ctx.save();
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 1135, width, 55);

    const tickerText = `🚨 ÚLTIMA HORA • NOTICIA CONFIRMADA • FUENTE: ${draft?.sourceAttribution || 'EL TIEMPO'} • COMPARTE ESTE VIDEO EN TIKTOK, REELS Y SHORTS • `;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    const textWidth = ctx.measureText(tickerText).width;
    const tickerOffset = (progress * 1800) % textWidth;
    ctx.fillText(tickerText, -tickerOffset, 1170);
    ctx.fillText(tickerText, textWidth - tickerOffset, 1170);
    ctx.restore();

    // 8. BARRA DE PROGRESO DE TIEMPO ESTILO REEL
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, height - 8, width * progress, 8);
  };

  // CONTROL DE REPRODUCCIÓN EN VIVO
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    setupAudioGraph();
    startTimeRef.current = performance.now();
    const totalMs = durationSeconds * 1000;

    const loop = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / totalMs, 1);

      drawFrame(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(loop);
      } else {
        stopPlayback();
        drawFrame(1);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // EXPORTAR VIDEO COMPLETO CON AUDIO Y SUBTÍTULOS INCORPORADOS
  const handleExportVideo = async () => {
    stopPlayback();
    setIsRecording(true);
    setRecordProgress(0);
    recordedChunksRef.current = [];

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsRecording(false);
      return;
    }

    try {
      const canvasStream = canvas.captureStream(30);
      const audioTracks = setupAudioGraph();

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
        ? 'video/mp4;codecs=avc1,mp4a.40.2'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setIsRecording(false);

        const a = document.createElement('a');
        a.href = url;
        const prefix = durationMode === 'youtube_15' ? 'Short_15s' : 'Reel';
        const cleanName = cleanPureTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `${prefix}_${cleanName}.mp4`;
        a.click();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      const totalMs = durationSeconds * 1000;
      const startTime = performance.now();

      const recordLoop = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalMs, 1);

        drawFrame(progress);
        setRecordProgress(Math.round(progress * 100));

        if (progress < 1) {
          requestAnimationFrame(recordLoop);
        } else {
          recorder.stop();
          stopPlayback();
        }
      };

      requestAnimationFrame(recordLoop);
    } catch (err: any) {
      console.error('Error exportando video:', err);
      alert('Error exportando video: ' + err.message);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl text-white space-y-4 my-auto max-h-[96vh] overflow-y-auto">
        {/* Cabecera del Estudio */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-pink-500/25">
              <Film className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                <span>Estudio Mini CapCut para Noticias</span>
                <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Cortes Reales + Voz CapCut + Subtítulos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona narrador, busca fotos en internet o sube las tuyas, y exporta tu video listo para Shorts y Reels
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopPlayback();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Responsivo: 2 Columnas (Player + Suite de Edición) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUMNA 1: REPRODUCTOR VERTICAL 9:16 */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black">
              <canvas
                ref={canvasRef}
                width={720}
                height={1280}
                className="w-full h-full object-contain"
              />

              {/* Botón flotante Play */}
              <button
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition opacity-0 hover:opacity-100 disabled:opacity-0"
              >
                <div className="w-14 h-14 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-2xl transform hover:scale-110 transition">
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </div>
              </button>
            </div>

            {/* Controles de reproducción */}
            <div className="flex items-center space-x-3 mt-3">
              <button
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pausar' : 'Previsualizar'}</span>
              </button>

              <button
                onClick={() => drawFrame(0)}
                disabled={isRecording}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Reiniciar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* COLUMNA 2: HERRAMIENTAS MINI CAPCUT */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* 1. Selector de Plataforma y Duración */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Formato y Duración</span>
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setDurationMode('youtube_15')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    durationMode === 'youtube_15'
                      ? 'bg-red-600/20 border-red-500 text-white font-bold shadow-md shadow-red-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>YT Shorts</span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold mt-0.5">Máx. 15s (Rápido)</div>
                </button>

                <button
                  onClick={() => setDurationMode('reels_30')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    durationMode === 'reels_30'
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <Film className="w-3.5 h-3.5 text-blue-400" />
                    <span>FB / IG Reel</span>
                  </div>
                  <div className="text-[10px] text-blue-300 font-semibold mt-0.5">30 segundos</div>
                </button>

                <button
                  onClick={() => setDurationMode('reels_60')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    durationMode === 'reels_60'
                      ? 'bg-purple-600/20 border-purple-500 text-white font-bold shadow-md shadow-purple-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    <span>Reel Completo</span>
                  </div>
                  <div className="text-[10px] text-purple-300 font-semibold mt-0.5">60 segundos</div>
                </button>
              </div>
            </div>

            {/* 2. Selector de Opciones de Narrador (Voz de CapCut y más) */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Mic className="w-4 h-4 text-pink-400" />
                  <span>Voz del Narrador (Locución Automática)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Lectura pura sin emojis ni referencias
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NARRATORS.map((narrator) => (
                  <button
                    key={narrator.id}
                    onClick={() => setSelectedNarratorId(narrator.id)}
                    className={`p-2 rounded-xl border text-left transition ${
                      selectedNarratorId === narrator.id
                        ? 'bg-pink-600/20 border-pink-500 text-white font-bold shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>{narrator.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-pink-300 font-semibold">
                        {narrator.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
                      {narrator.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Línea de Tiempo de Escenas (Timeline con Cortes reales) */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Línea de Tiempo de Escenas ({scenes.length} cortes)</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Haz clic en una escena para reemplazar su foto
                </span>
              </div>

              {/* Selector de escenas */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {scenes.map((sceneUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveSceneIndex(idx)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition group ${
                      activeSceneIndex === idx
                        ? 'border-sky-400 scale-[1.02] shadow-lg shadow-sky-500/20'
                        : 'border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-video w-full bg-slate-900">
                      <img src={sceneUrl} alt={`Escena ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-300">
                      Escena {idx + 1}
                    </div>
                    {scenes.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveScene(idx);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition"
                        title="Eliminar escena"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 4. Buscador de Imágenes de Internet & Subida de Archivos */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">
                    Asignar foto a <span className="text-sky-400 font-bold">Escena {activeSceneIndex + 1}</span>:
                  </span>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Subir desde PC</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                </div>

                {/* Formulario de búsqueda en internet */}
                <form onSubmit={handleSearchImages} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar fotos en internet (ej. Mike Tyson, Boxeo, Netflix)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </form>

                {/* Resultados encontrados en internet */}
                {searchResults.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                      <span>Resultados de internet (clic para aplicar a Escena {activeSceneIndex + 1}):</span>
                      <span className="text-sky-400">{searchResults.length} fotos encontradas</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                      {searchResults.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectImageForActiveScene(item.url)}
                          title={item.title}
                          className="aspect-video rounded-lg overflow-hidden border border-slate-700 hover:border-sky-400 cursor-pointer transition relative group"
                        >
                          <img src={item.thumbUrl} alt={item.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[9px] font-bold text-white">
                            Usar
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Galería de stock sugerido de la noticia */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold">Fotos sugeridas para esta temática:</div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {draft?.imageUrl && (
                      <div
                        onClick={() =>
                          handleSelectImageForActiveScene(
                            `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`
                          )
                        }
                        className="aspect-video rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-sky-400 transition"
                        title="Foto original de la noticia"
                      >
                        <img
                          src={`/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {suggestedStock.map((url, i) => (
                      <div
                        key={url}
                        onClick={() => handleSelectImageForActiveScene(url)}
                        className="aspect-video rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-sky-400 transition"
                      >
                        <img src={url} alt={`Stock ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Estilo de Subtítulos CapCut */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Estilo de Subtítulos CapCut (Ajuste Seguro sin Salirse)</span>
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'capcut_yellow', label: '🟡 CapCut Amarillo', desc: 'Borde negro + Amarillo viral' },
                  { id: 'breaking_red', label: '🔴 Noticia Urgente', desc: 'Franja roja de alerta' },
                  { id: 'tiktok_box', label: '⚪ Moderno Blanco', desc: 'Minimalista en caja' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSubtitleStyle(st.id as any)}
                    className={`p-2 rounded-xl border text-left transition ${
                      subtitleStyle === st.id
                        ? 'bg-yellow-500/20 border-yellow-500 text-white font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{st.label}</div>
                    <div className="text-[9px] text-slate-400 font-normal">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Mezclador de Audio */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>Mezclador de Audio Incrustado en el Video</span>
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Música de TV:</span>
                    <span className="font-bold text-emerald-400">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Voz Narradora ({activeNarrator.name}):</span>
                    <span className="font-bold text-blue-400">{Math.round(voiceVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 7. Botón de Exportación Directa */}
            <div className="pt-1">
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-pink-600/30 transition transform active:scale-98 disabled:opacity-50 text-sm"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      Exportando {durationMode === 'youtube_15' ? 'Short (15s)' : 'Reel'} con Audio...{' '}
                      {recordProgress}%
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>
                      Descargar {durationMode === 'youtube_15' ? 'YouTube Short (15s)' : 'Reel de Facebook (MP4)'}
                    </span>
                  </>
                )}
              </button>

              <div className="mt-2 text-center space-y-0.5">
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cortes reales + Voz limpia sin emojis + Subtítulos ajustados</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Listo para publicar directamente en YouTube Shorts, Facebook Reels e Instagram.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
