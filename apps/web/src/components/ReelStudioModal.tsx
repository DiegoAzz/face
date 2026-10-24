import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { CODIGO_VIRAL_BRAND } from '../assets/branding';
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
  Share2,
  ExternalLink,
  Send,
  Scissors,
  Maximize2,
  MoveVertical,
  Sliders,
  ArrowLeftRight,
  Type,
  RotateCcw,
  Edit3,
  Shield,
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
    id: 'podcast_host',
    name: 'Host Podcast Código Viral',
    badge: '🎙️ Modo Podcast Innovador',
    desc: 'Tono cercano, dinámico e íntimo estilo Spotify / YouTube Video Podcast',
    lang: 'es-US',
    rate: 1.12,
    pitch: 1.02,
    gender: 'male',
  },
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

// Efectos de Animación y Movimiento para las Imágenes (CapCut / Ken Burns / Motion)
export const IMAGE_EFFECTS = [
  { id: 'zoom_in', label: '🔍 Zoom In (Acercar)', desc: 'Acercamiento cinematográfico suave' },
  { id: 'zoom_out', label: '🔎 Zoom Out (Alejar)', desc: 'Alejamiento suave de cámara' },
  { id: 'pan_right', label: '➡️ Paneo Derecha', desc: 'Desplazamiento horizontal fluido a la derecha' },
  { id: 'pan_left', label: '⬅️ Paneo Izquierda', desc: 'Desplazamiento horizontal fluido a la izquierda' },
  { id: 'pan_up', label: '⬆️ Paneo Hacia Arriba', desc: 'Desplazamiento vertical suave hacia arriba' },
  { id: 'pan_down', label: '⬇️ Paneo Hacia Abajo', desc: 'Desplazamiento vertical suave hacia abajo' },
  { id: 'zoom_pan', label: '🔄 Ken Burns (Zoom + Diagonal)', desc: 'Acercamiento con movimiento diagonal' },
  { id: 'pulse', label: '💓 Pulso Dinámico', desc: 'Efecto de impacto y énfasis rítmico' },
  { id: 'shake', label: '⚡ Cámara en Mano', desc: 'Movimiento orgánico de reportaje en vivo' },
  { id: 'static', label: '⏹️ Foto Fija (Estática)', desc: 'Sin movimiento de cámara' },
] as const;

export type ImageEffectType = typeof IMAGE_EFFECTS[number]['id'];

// Estructura de Clip para la Línea de Tiempo estilo CapCut
export interface TimelineClip {
  id: string;
  url: string;
  duration: number; // en segundos
  transition: ImageEffectType;
  name: string;
  scale?: number; // 0.5 a 2.5 (1.0 default)
  offsetY?: number; // -180 a 180 (mover arriba/abajo en canvas)
  offsetX?: number; // -150 a 150 (mover izquierda/derecha en canvas)
  fitMode?: 'cover' | 'contain';
  mediaType?: 'image' | 'video';
}

// Limpieza estricta de emojis, símbolos raros y agregadores
export function cleanNewsForNarration(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}]/gu, '')
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
    .replace(/[*_#~`\\/|•–—«»]/g, ' ')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Condensa y optimiza titulares de noticias para YouTube Shorts y Reels.
 * YouTube tiene un límite estricto de 100 caracteres, y en la app móvil de Shorts
 * los títulos de más de 65 caracteres se cortan con "...".
 * Además, añade espacio para tags como " #Shorts".
 * Esta función extrae la frase principal de alto impacto en 50-65 caracteres,
 * respetando límites de palabras y eliminando preposiciones colgantes.
 */
export function formatShortViralTitle(raw: string, maxLen = 65): string {
  if (!raw) return '';
  let clean = cleanNewsForNarration(raw).replace(/[\r\n\t]+/g, ' ').trim();
  clean = clean.replace(/^(Atención|Urgente|En video|Última hora|Noticia|Mire aquí|Conozca|Revelan):?\s*/i, '');
  if (clean.length <= maxLen) return clean;

  // 1. Probar división por delimitadores de cláusula natural (dos puntos, coma, guion, punto)
  const delimiters = [':', ' - ', ' – ', '—', ',', '. '];
  for (const delim of delimiters) {
    if (clean.includes(delim)) {
      const firstClause = clean.split(delim)[0]?.trim();
      if (firstClause && firstClause.length >= 25 && firstClause.length <= maxLen) {
        return firstClause;
      }
    }
  }

  // 2. Si ninguna cláusula natural encajó, cortar en la última palabra completa antes de maxLen
  const truncated = clean.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  let result = (lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated).trim();

  // 3. Limpiar preposiciones, artículos o palabras huérfanas al final
  result = result.replace(/\s+(de|en|con|a|por|para|que|y|o|el|la|los|las|un|una|unos|unas|al|del|tras|se|su|sus|sobre)$/i, '').trim();

  return result;
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
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Modo de formato y duración
  const [durationMode, setDurationMode] = useState<'youtube_15' | 'reels_30' | 'reels_60'>('youtube_15');
  const targetDuration = durationMode === 'youtube_15' ? 14 : durationMode === 'reels_30' ? 30 : 55;

  // Tiempo actual de reproducción en segundos (Scrubbing / Playhead de CapCut)
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Modo Podcast Innovador y Guía de Zona Segura
  const [isPodcastMode, setIsPodcastMode] = useState<boolean>(true);
  const [showSafeZoneGuide, setShowSafeZoneGuide] = useState<boolean>(false);

  // Narrador seleccionado
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>('podcast_host');
  const activeNarrator = NARRATORS.find((n) => n.id === selectedNarratorId) || NARRATORS[0];

  // Estilo de subtítulos CapCut
  const [subtitleStyle, setSubtitleStyle] = useState<'capcut_yellow' | 'tiktok_box' | 'breaking_red'>('capcut_yellow');

  // Ajustes de volumen
  const [musicVolume, setMusicVolume] = useState<number>(0.25);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);

  // Limpieza estricta: Titular optimizado para YouTube Shorts (50-65 chars) y texto limpio
  const cleanPureTitle = formatShortViralTitle(title || draft?.title || '');
  const cleanPureBody = cleanNewsForNarration(body || draft?.body || '');
  const [customTitle, setCustomTitle] = useState<string>(formatShortViralTitle(title || draft?.title || ''));
  const [customBody, setCustomBody] = useState<string>(cleanNewsForNarration(body || draft?.body || ''));

  // Cintillo Inferior Rojo editable por el usuario
  const defaultTicker = `🎙️ CÓDIGO VIRAL PODCAST • REDES · APPS · DINERO · VIDA • SÍGUENOS EN @CodigoViralOficial14 • `;
  const [tickerText, setTickerText] = useState<string>(defaultTicker);
  const [showTicker, setShowTicker] = useState<boolean>(true);

  // Detección de imágenes sugeridas
  const categoryKey = detectThemeCategory(`${cleanPureTitle} ${cleanPureBody}`);
  const suggestedStock = THEMATIC_IMAGES[categoryKey] || THEMATIC_IMAGES['colombia_actualidad'];

  const initialMainImage = draft?.imageUrl && draft.imageUrl.startsWith('http')
    ? `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`
    : suggestedStock[0];

    // LÍNEA DE TIEMPO MULTI-PISTA (4 ESCENAS AUTOMÁTICAS ESTILO CAPCUT)
  const initialPerClip = parseFloat((targetDuration / 4).toFixed(1));
  const [clips, setClips] = useState<TimelineClip[]>([
    {
      id: 'clip_1',
      url: initialMainImage,
      duration: initialPerClip,
      transition: 'zoom_in',
      name: 'Escena 1 (Gancho)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
    {
      id: 'clip_2',
      url: suggestedStock[1] || suggestedStock[0],
      duration: initialPerClip,
      transition: 'pan_right',
      name: 'Escena 2 (Desarrollo)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
    {
      id: 'clip_3',
      url: suggestedStock[2] || suggestedStock[0],
      duration: initialPerClip,
      transition: 'zoom_pan',
      name: 'Escena 3 (Detalles)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
    {
      id: 'clip_4',
      url: suggestedStock[3] || suggestedStock[0],
      duration: parseFloat((targetDuration - initialPerClip * 3).toFixed(1)),
      transition: 'zoom_out',
      name: 'Escena 4 (Cierre)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
  ]);

  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const clipsSum = clips.reduce((acc, c) => acc + c.duration, 0);
  // La duración del video coincide con donde terminan las escenas para que se exporte hasta ahí y no siga
  const totalClipsDuration = clips.length > 0
    ? (clipsSum > 0 ? parseFloat(clipsSum.toFixed(1)) : targetDuration)
    : targetDuration;

  // Subtítulos virales con ráfagas cortas adaptadas exactamente a la locución
  const { subtitleChunks, spokenWords } = React.useMemo(() => {
    // Palabras calculadas para cubrir con dinamismo el relato y dejar remate final
    const wordsCount = Math.max(10, Math.round(totalClipsDuration * 2.6));
    const fullText = `${customTitle}. ${customBody}`;
    const words = fullText.split(/\s+/).filter(Boolean).slice(0, wordsCount);
    const chunks: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return {
      subtitleChunks: chunks.length > 0 ? chunks : [customTitle],
      spokenWords: words,
    };
  }, [customTitle, customBody, totalClipsDuration]);

  // Duración real detectada del audio TTS
  const [detectedAudioDuration, setDetectedAudioDuration] = useState<number>(0);
  const audioDurationRef = useRef<number>(0);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Estimación matemática de duración según ritmo del narrador
  const estimatedSpeechDuration = React.useMemo(() => {
    const wordsTotal = spokenWords.length || 10;
    const dur = wordsTotal * (0.33 / (activeNarrator.rate || 1.0));
    return Math.min(dur, totalClipsDuration);
  }, [spokenWords.length, activeNarrator.rate, totalClipsDuration]);

  const effectiveAudioDuration = detectedAudioDuration > 0
    ? detectedAudioDuration
    : estimatedSpeechDuration;

  // Pre-cargar audio TTS al cambiar narrador o texto para respuesta y sincronía instantánea
  useEffect(() => {
    if (voiceVolume <= 0 || !customTitle) return;
    const spokenText = spokenWords.join(' ');
    const ttsUrl = `/api/media/tts?text=${encodeURIComponent(spokenText)}&lang=${activeNarrator.lang}`;
    const audio = new Audio(ttsUrl);
    audio.crossOrigin = 'anonymous';
    audio.playbackRate = activeNarrator.rate;
    audio.onloadedmetadata = () => {
      if (audio.duration && audio.duration > 0 && !isNaN(audio.duration)) {
        const dur = audio.duration / (activeNarrator.rate || 1.0);
        audioDurationRef.current = dur;
        setDetectedAudioDuration(dur);
      }
    };
    preloadedAudioRef.current = audio;
  }, [spokenWords, activeNarrator.lang, activeNarrator.rate, voiceVolume, customTitle]);

  // Buscador de imágenes de Internet
  const initialSearchWord = cleanPureTitle.split(' ').slice(0, 3).join(' ');
  const [searchQuery, setSearchQuery] = useState(initialSearchWord);
  const [searchResults, setSearchResults] = useState<{ url: string; thumbUrl: string; title: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estados de exportación y publicación directa a redes
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [isPublishingToFb, setIsPublishingToFb] = useState<boolean>(false);

  const [youtubeChannels, setYoutubeChannels] = useState<any[]>([]);
  const [selectedYtChannelId, setSelectedYtChannelId] = useState<string>('');
  const [isPublishingToYt, setIsPublishingToYt] = useState<boolean>(false);

  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  // MANIPULACIÓN DIRECTA DE ELEMENTOS EN CANVAS (ESTILO CAPCUT)
  const [selectedElement, setSelectedElement] = useState<'image' | 'title' | 'subtitles' | 'ticker' | 'none' | string>('image');
  // Calibración estricta de Zona Segura YouTube Shorts (evita botones Me gusta/Comentarios a la derecha y título inferior)
  const [titlePos, setTitlePos] = useState<{ x: number; y: number }>({ x: 45, y: 500 });
  const [subtitlesPos, setSubtitlesPos] = useState<{ x: number; y: number }>({ x: 285, y: 720 });
  const [overlays, setOverlays] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    bgColor: string;
    isBadge?: boolean;
  }>>([
    {
      id: 'badge_alerta',
      text: '🚨 ÚLTIMA HORA',
      x: 360,
      y: 190,
      fontSize: 22,
      color: '#ffffff',
      bgColor: '#dc2626',
      isBadge: true,
    },
  ]);
  const isDraggingElementRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    target: string;
  } | null>(null);
  const activeClipIndexRef = useRef<number>(0);
  activeClipIndexRef.current = activeClipIndex;

  // Referencias multimedia
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos'>('photos');
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const previewEffectAnimRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const [loadingNewsImages, setLoadingNewsImages] = useState(false);

  // Cargar automáticamente 4 fotos frescas relacionadas de la noticia actual
  useEffect(() => {
    let isCancelled = false;
    setLoadingNewsImages(true);
    setPublishNotice('⏳ Analizando noticia y cargando 4+ fotos frescas relacionadas...');

    api.get('/media/news-images', {
      params: {
        url: draft?.sourceUrl,
        title: cleanPureTitle,
        imageUrl: draft?.imageUrl,
      },
    })
      .then((res) => {
        if (isCancelled) return;
        const fetched = res.data;
        if (Array.isArray(fetched) && fetched.length > 0) {
          setSearchResults(fetched);
          // Garantizar que las escenas iniciales automáticas sean fotos nítidas (mediaType: 'image')
          const photos = fetched.filter((item: any) => item.mediaType !== 'video');
          const photoPool = photos.length >= 4
            ? photos
            : [...photos, ...suggestedStock.map((url) => ({ url, mediaType: 'image' }))];

          if (photoPool.length >= 4) {
            const perSec = parseFloat((targetDuration / 4).toFixed(1));
            const transitions: ImageEffectType[] = ['zoom_in', 'pan_right', 'zoom_pan', 'zoom_out'];
            const names = [
              'Escena 1 (Gancho)',
              'Escena 2 (Desarrollo)',
              'Escena 3 (Detalles)',
              'Escena 4 (Cierre)',
            ];

            setClips([
              {
                id: `clip_${Date.now()}_1`,
                url: photoPool[0].url,
                duration: perSec,
                transition: transitions[0],
                name: names[0],
                scale: 1.0,
                offsetY: 0,
                offsetX: 0,
                fitMode: 'cover',
                mediaType: 'image',
              },
              {
                id: `clip_${Date.now()}_2`,
                url: photoPool[1].url,
                duration: perSec,
                transition: transitions[1],
                name: names[1],
                scale: 1.0,
                offsetY: 0,
                offsetX: 0,
                fitMode: 'cover',
                mediaType: 'image',
              },
              {
                id: `clip_${Date.now()}_3`,
                url: photoPool[2].url,
                duration: perSec,
                transition: transitions[2],
                name: names[2],
                scale: 1.0,
                offsetY: 0,
                offsetX: 0,
                fitMode: 'cover',
                mediaType: 'image',
              },
              {
                id: `clip_${Date.now()}_4`,
                url: photoPool[3].url,
                duration: parseFloat((targetDuration - perSec * 3).toFixed(1)),
                transition: transitions[3],
                name: names[3],
                scale: 1.0,
                offsetY: 0,
                offsetX: 0,
                fitMode: 'cover',
                mediaType: 'image',
              },
            ]);
            setPublishNotice(`🎉 ¡4 fotos frescas relacionadas con esta noticia listas en la línea de tiempo!`);
          }
        }
      })
      .catch((e) => console.warn('Error cargando fotos de noticia:', e))
      .finally(() => {
        if (!isCancelled) setLoadingNewsImages(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [draft?.id, draft?.sourceUrl]);

  // Carga del Logo Oficial de CÓDIGO VIRAL en memoria para Canvas
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = CODIGO_VIRAL_BRAND.logoBase64;
    img.onload = () => {
      logoImgRef.current = img;
      if (canvasRef.current) {
        drawFrame(currentTime / totalClipsDuration);
      }
    };
  }, []);

  // Función para adaptar cualquier noticia a guión conversacional de podcast innovador
  const handleConvertToPodcastScript = () => {
    let clean = cleanNewsForNarration(customBody || cleanPureBody);
    if (!clean) return;

    clean = clean.replace(/^(Oigan|Hola a todos|Bienvenidos|Atención|Escuchen bien):?\s*/i, '');

    const podcastHooks = [
      '¡Oigan, les tengo que contar esto que acaba de confirmarse! Pónganle mucha atención a este dato en Código Viral:',
      '¡Miren esto tan impresionante que acaba de salir a la luz! Les cuento los detalles en Código Viral:',
      '¿Ustedes ya se enteraron de lo que acaba de pasar? Escuchen bien esta noticia:',
    ];
    const randomHook = podcastHooks[Math.floor(Math.random() * podcastHooks.length)];
    const cta = '¿Ustedes qué opinan de todo esto? Déjenmelo saber en los comentarios y suscríbanse a Código Viral para no perderse ninguna noticia al instante.';

    const podcastBody = `${randomHook} ${clean}. ${cta}`;
    setCustomBody(podcastBody);
    setSelectedNarratorId('podcast_host');
    setIsPodcastMode(true);
    setPublishNotice('🎙️ ¡Noticia adaptada a formato Podcast Viral con gancho conversacional y locutor dinámico!');
  };

  // Cargar páginas de Facebook y canales de YouTube disponibles (con token JWT)
  useEffect(() => {
    api.get('/pages')
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setFacebookPages(data);
          setSelectedPageId(data[0].id);
        }
      })
      .catch((err) => console.warn('Error cargando páginas de Facebook:', err));

    api.get('/youtube/channels')
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setYoutubeChannels(data);
          setSelectedYtChannelId(data[0].id);
        }
      })
      .catch((err) => console.warn('Error cargando canales de YouTube:', err));
  }, []);

  // Precargar imágenes de todos los clips
  useEffect(() => {
    clips.forEach((clip, idx) => {
      if (!clip.url) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.url;
      img.onload = () => {
        loadedImagesRef.current[idx] = img;
        drawFrame(currentTime / totalClipsDuration);
      };
      img.onerror = () => {
        // Si falla con crossOrigin, reintentar carga directa
        const retry = new Image();
        retry.src = clip.url;
        retry.onload = () => {
          loadedImagesRef.current[idx] = retry;
          drawFrame(currentTime / totalClipsDuration);
        };
        retry.onerror = () => {
          if (suggestedStock[idx]) {
            const fallbackUrl = suggestedStock[idx % suggestedStock.length] || suggestedStock[0];
            const stockImg = new Image();
            stockImg.crossOrigin = 'anonymous';
            stockImg.src = fallbackUrl;
            stockImg.onload = () => {
              loadedImagesRef.current[idx] = stockImg;
              drawFrame(currentTime / totalClipsDuration);
            };
          }
        };
      };
    });
    drawFrame(currentTime / totalClipsDuration);
  }, [clips]);

  // Cambiar modo de formato y recalcular duraciones proporcionales de forma limpia
  const handleSelectDurationMode = (mode: 'youtube_15' | 'reels_30' | 'reels_60') => {
    stopPlayback();
    setDurationMode(mode);
    const newTarget = mode === 'youtube_15' ? 14 : mode === 'reels_30' ? 30 : 55;
    setClips((prev) => {
      if (prev.length === 0) return [];
      const equalSec = parseFloat((newTarget / prev.length).toFixed(1));
      return prev.map((c) => ({
        ...c,
        duration: Math.max(1.0, equalSec),
      }));
    });
    setCurrentTime(0);
    setTimeout(() => {
      drawFrame(0);
    }, 50);
  };

  // HERRAMIENTAS DE EDICIÓN CAPCUT:
  // 1. Dividir Clip en la posición actual del cursor (✂️ Split)
  const handleSplitActiveClip = () => {
    let accum = 0;
    let targetIdx = -1;
    let relSec = 0;

    for (let i = 0; i < clips.length; i++) {
      const end = accum + clips[i].duration;
      if (currentTime >= accum && currentTime <= end) {
        targetIdx = i;
        relSec = currentTime - accum;
        break;
      }
      accum = end;
    }

    if (targetIdx === -1) {
      targetIdx = activeClipIndex;
      relSec = clips[targetIdx].duration / 2;
    }

    const clip = clips[targetIdx];
    if (!clip) return;

    // Asegurar un margen mínimo de corte de 0.6s
    if (relSec < 0.6 || clip.duration - relSec < 0.6) {
      relSec = clip.duration / 2;
    }

    const firstDuration = parseFloat(relSec.toFixed(1));
    const secondDuration = parseFloat((clip.duration - relSec).toFixed(1));

    const firstPart: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}_1`,
      duration: firstDuration,
      name: `${clip.name} (Parte 1)`,
    };

    const secondPart: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}_2`,
      duration: secondDuration,
      name: `${clip.name} (Parte 2)`,
      transition: clip.transition === 'zoom_in' ? 'pan_right' : 'zoom_out',
    };

    setClips((prev) => {
      const updated = [...prev];
      updated.splice(targetIdx, 1, firstPart, secondPart);
      return updated;
    });

    setActiveClipIndex(targetIdx + 1);
    setPublishNotice('✓ Escena dividida con éxito. Ahora puedes cambiar la foto o transición de cada parte.');
  };

  // 2. Ajustar duración de la escena activa (+ / -)
  const handleAdjustClipDuration = (delta: number) => {
    setClips((prev) => {
      const updated = [...prev];
      const cur = updated[activeClipIndex];
      if (!cur) return prev;
      const newDur = Math.max(0.6, Math.min(30, parseFloat((cur.duration + delta).toFixed(1))));
      updated[activeClipIndex] = { ...cur, duration: newDur };
      return updated;
    });
  };

  // Igualar duración de todas las escenas para que cubran exactamente el targetDuration
  const handleEqualizeClipDurations = () => {
    if (clips.length === 0) return;
    const equalSec = parseFloat((targetDuration / clips.length).toFixed(1));
    setClips((prev) =>
      prev.map((c) => ({
        ...c,
        duration: Math.max(1.0, equalSec),
      }))
    );
    setPublishNotice('✓ Escenas ajustadas para cubrir exactamente el tiempo total.');
  };

  // 1 sola foto para todo el video
  const handleSetSingleImageFullVideo = () => {
    const activeUrl = clips[activeClipIndex]?.url || clips[0]?.url || initialMainImage;
    const singleClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      url: activeUrl,
      duration: targetDuration,
      transition: 'zoom_in',
      name: 'Foto Completa (Todo el Video)',
      scale: clips[activeClipIndex]?.scale || 1.0,
      offsetY: clips[activeClipIndex]?.offsetY || 0,
      offsetX: clips[activeClipIndex]?.offsetX || 0,
      fitMode: clips[activeClipIndex]?.fitMode || 'cover',
    };
    setClips([singleClip]);
    setActiveClipIndex(0);
    setPublishNotice('✓ Ahora 1 sola imagen cubre el 100% de la duración del video.');
  };

  // Ajustes de tamaño y encuadre en el Canvas
  const handleUpdateActiveClipScale = (delta: number) => {
    setClips((prev) => {
      const updated = [...prev];
      const cur = updated[activeClipIndex];
      if (!cur) return prev;
      const newScale = Math.max(0.5, Math.min(2.5, parseFloat(((cur.scale || 1.0) + delta).toFixed(2))));
      updated[activeClipIndex] = { ...cur, scale: newScale };
      return updated;
    });
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleSetActiveClipScaleExact = (val: number) => {
    setClips((prev) => {
      const updated = [...prev];
      const cur = updated[activeClipIndex];
      if (!cur) return prev;
      updated[activeClipIndex] = { ...cur, scale: val };
      return updated;
    });
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleUpdateActiveClipOffsetY = (val: number) => {
    setClips((prev) => {
      const updated = [...prev];
      const cur = updated[activeClipIndex];
      if (!cur) return prev;
      updated[activeClipIndex] = { ...cur, offsetY: val };
      return updated;
    });
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleToggleFitMode = () => {
    setClips((prev) => {
      const updated = [...prev];
      const cur = updated[activeClipIndex];
      if (!cur) return prev;
      const newMode = cur.fitMode === 'contain' ? 'cover' : 'contain';
      updated[activeClipIndex] = { ...cur, fitMode: newMode };
      return updated;
    });
    drawFrame(currentTime / totalClipsDuration);
  };

  // 3. Cambiar efecto de animación o movimiento de cámara
  const handleChangeTransition = (tr: ImageEffectType) => {
    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = { ...updated[activeClipIndex], transition: tr };
      }
      return updated;
    });

    // Vista previa animada en vivo de 1.8 segundos para comprobar el movimiento de cámara en el canvas
    if (!isPlaying) {
      if (previewEffectAnimRef.current) cancelAnimationFrame(previewEffectAnimRef.current);
      const animStart = performance.now();
      const animDuration = 1800;
      const runEffectPreview = (now: number) => {
        const elapsed = now - animStart;
        const normP = Math.min(elapsed / animDuration, 1);
        let accum = 0;
        for (let i = 0; i < activeClipIndex; i++) accum += clips[i]?.duration || 0;
        const clipDur = clips[activeClipIndex]?.duration || 3.5;
        const simulatedSec = accum + normP * clipDur;
        const overallP = totalClipsDuration > 0 ? simulatedSec / totalClipsDuration : normP;
        drawFrame(overallP);
        if (normP < 1) {
          previewEffectAnimRef.current = requestAnimationFrame(runEffectPreview);
        } else {
          drawFrame(currentTime / totalClipsDuration);
        }
      };
      previewEffectAnimRef.current = requestAnimationFrame(runEffectPreview);
    } else {
      drawFrame(currentTime / totalClipsDuration);
    }
  };

  const handleApplyTransitionToAll = (tr: ImageEffectType) => {
    const effObj = IMAGE_EFFECTS.find((e) => e.id === tr);
    setClips((prev) => prev.map((c) => ({ ...c, transition: tr })));
    setPublishNotice(`✓ Efecto "${effObj?.label || tr}" aplicado a todas las escenas.`);
    drawFrame(currentTime / totalClipsDuration);
  };

  // 4. Eliminar escena seleccionada
  const handleDeleteActiveClip = () => {
    if (clips.length === 0) return;
    handleDeleteClipByIndex(activeClipIndex);
  };

  // Eliminar escena específica por índice (permite eliminar hasta 0 imágenes o tener 1 sola imagen)
  const handleDeleteClipByIndex = (idxToDelete: number) => {
    setClips((prev) => {
      const remaining = prev.filter((_, idx) => idx !== idxToDelete);
      return remaining;
    });
    setActiveClipIndex((prev) => Math.max(0, Math.min(prev, clips.length - 2)));
    setPublishNotice('✓ Escena eliminada.');
  };

  // 5. Añadir nueva escena
  const handleAddClip = (url?: string) => {
    const newUrl = url || suggestedStock[clips.length % suggestedStock.length] || suggestedStock[0];
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      url: newUrl,
      duration: 3.5,
      transition: clips.length % 2 === 0 ? 'zoom_in' : 'pan_right',
      name: `Escena ${clips.length + 1}`,
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    };
    setClips((prev) => [...prev, newClip]);
    setActiveClipIndex(clips.length);
    setPublishNotice('✓ Nueva escena añadida.');
  };

  // 6. Cambiar foto o video del clip activo
  const handleSelectMediaForActiveClip = (url: string, explicitType?: 'image' | 'video') => {
    const isVideo = explicitType === 'video' ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) ||
      url.startsWith('data:video/') ||
      url.startsWith('blob:');

    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

    if (isVideo) {
      let v = loadedVideosRef.current.get(url);
      if (!v) {
        v = document.createElement('video');
        v.src = url;
        v.muted = true;
        v.playsInline = true;
        v.crossOrigin = 'anonymous';
        v.preload = 'auto';
        v.loop = true;
        v.onloadeddata = () => {
          drawFrame(currentTime / totalClipsDuration);
        };
        v.load();
        loadedVideosRef.current.set(url, v);
      }
      setPublishNotice(`✓ Video asignado con éxito a la Escena ${activeClipIndex + 1}`);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        loadedImagesRef.current[activeClipIndex] = img;
        drawFrame(currentTime / totalClipsDuration);
      };
      img.onerror = () => {
        const fallback = new Image();
        fallback.src = url;
        fallback.onload = () => {
          loadedImagesRef.current[activeClipIndex] = fallback;
          drawFrame(currentTime / totalClipsDuration);
        };
      };
      setPublishNotice(`✓ Foto asignada con éxito a la Escena ${activeClipIndex + 1}`);
    }

    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = { ...updated[activeClipIndex], url, mediaType };
      }
      return updated;
    });
  };

  const handleSelectImageForActiveClip = (url: string) => handleSelectMediaForActiveClip(url, 'image');

  // Buscar fotos en internet
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

  // Subir archivo (Foto o Video) desde PC o celular
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      handleSelectMediaForActiveClip(objectUrl, 'video');
      setMediaTab('videos');
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          handleSelectMediaForActiveClip(dataUrl, 'image');
          setMediaTab('photos');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Scrubbing fluido y arrastre del cabezal de tiempo (Playhead) estilo CapCut
  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef(false);

  const seekToClientX = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    const newTime = percent * totalClipsDuration;
    setCurrentTime(newTime);

    // Sincronizar audio en vivo con el cursor si está reproduciendo
    if (audioElementRef.current) {
      const targetAudioSec = newTime * (activeNarrator.rate || 1.0);
      if (audioElementRef.current.duration && targetAudioSec < audioElementRef.current.duration) {
        try {
          audioElementRef.current.currentTime = targetAudioSec;
        } catch {}
      } else if (audioElementRef.current.duration) {
        audioElementRef.current.pause();
      }
    }

    drawFrame(percent);

    // Auto-seleccionar el clip activo bajo el cursor
    let accum = 0;
    for (let i = 0; i < clips.length; i++) {
      const clipDur = clips[i]?.duration || 0.1;
      const endSec = accum + clipDur;
      if (newTime < endSec || i === clips.length - 1) {
        setActiveClipIndex(i);
        break;
      }
      accum = endSec;
    }
  };

  const handleStartScrubbing = (e: React.MouseEvent | React.TouchEvent) => {
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX);

    const onMove = (moveEv: MouseEvent | TouchEvent) => {
      if (!isScrubbingRef.current) return;
      const curX = 'touches' in moveEv ? moveEv.touches[0].clientX : moveEv.clientX;
      seekToClientX(curX);
    };

    const onEnd = () => {
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Arrastrar el borde derecho de una escena para ponerla más angosta o ancha
  const handleStartResizeClip = (e: React.MouseEvent, clipIdx: number) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startDur = clips[clipIdx].duration;
    const initialTotal = totalClipsDuration;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const onMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaSec = (deltaX / rect.width) * initialTotal;
      const newDur = Math.max(0.6, Math.min(60, parseFloat((startDur + deltaSec).toFixed(1))));
      setClips((prev) => {
        const updated = [...prev];
        if (updated[clipIdx]) {
          updated[clipIdx] = { ...updated[clipIdx], duration: newDur };
        }
        return updated;
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Formato MM:SS.S
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${String(m).padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}`;
  };

  // CONFIGURACIÓN DE AUDIO (VOZ CRISTALINA SIN RUIDOS NI ZUMBIDOS MOLESTOS)
  const setupAudioGraph = (initialTime: number = 0) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const dest = ctx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // Portadora continua silenciosa para mantener vivos los paquetes de audio del MediaRecorder y YouTube
      const osc = ctx.createOscillator();
      const carrierGain = ctx.createGain();
      carrierGain.gain.setValueAtTime(0.00001, ctx.currentTime);
      osc.connect(carrierGain);
      carrierGain.connect(dest);
      try {
        osc.start();
      } catch {}

      // Voz en off del narrador limpia y nítida
      if (voiceVolume > 0) {
        const spokenText = spokenWords.join(' ');
        const ttsUrl = `/api/media/tts?text=${encodeURIComponent(spokenText)}&lang=${activeNarrator.lang}`;
        const audio = new Audio(ttsUrl);
        audio.crossOrigin = 'anonymous';
        audio.playbackRate = activeNarrator.rate;
        audioElementRef.current = audio;

        const connectAndPlay = () => {
          try {
            audio.playbackRate = activeNarrator.rate;
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
              const realDur = audio.duration / (activeNarrator.rate || 1.0);
              audioDurationRef.current = realDur;
              setDetectedAudioDuration(realDur);
            }
            if (initialTime > 0) {
              const targetSec = initialTime * (activeNarrator.rate || 1.0);
              if (audio.duration && targetSec >= audio.duration) {
                return;
              }
              audio.currentTime = targetSec;
            }
            const source = ctx.createMediaElementSource(audio);
            const voiceGain = ctx.createGain();
            voiceGain.gain.setValueAtTime(0.95 * voiceVolume, ctx.currentTime);
            source.connect(voiceGain);
            voiceGain.connect(dest);
            voiceGain.connect(ctx.destination);
            audio.play().catch(() => {});
          } catch {
            audio.play().catch(() => {});
          }
        };

        if (audio.readyState >= 2) {
          connectAndPlay();
        } else {
          audio.oncanplay = connectAndPlay;
        }

        audio.onerror = () => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(spokenText);
            speechSynthesisUtteranceRef.current = utt; // Previene recolección de basura por Chrome
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

  // MANIPULACIÓN DIRECTA DE ELEMENTOS EN EL CANVAS (ESTILO CAPCUT)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 1280 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startElementDrag = (canvasX: number, canvasY: number, clientX: number, clientY: number) => {
    // 1. Ticker inferior rojo (y: 1120 a 1200)
    if (showTicker && canvasY >= 1120 && canvasY <= 1200) {
      setSelectedElement('ticker');
      isDraggingElementRef.current = false;
      drawFrame(currentTime / totalClipsDuration);
      return;
    }

    // 2. Overlays / Stickers personalizados
    for (let i = overlays.length - 1; i >= 0; i--) {
      const ov = overlays[i];
      const estW = ov.text.length * (ov.fontSize * 0.6) + 36;
      const estH = ov.fontSize + 24;
      if (
        canvasX >= ov.x - estW / 2 &&
        canvasX <= ov.x + estW / 2 &&
        canvasY >= ov.y - estH / 2 &&
        canvasY <= ov.y + estH / 2
      ) {
        setSelectedElement(ov.id);
        isDraggingElementRef.current = true;
        dragStartRef.current = {
          startX: clientX,
          startY: clientY,
          origX: ov.x,
          origY: ov.y,
          target: ov.id,
        };
        drawFrame(currentTime / totalClipsDuration);
        return;
      }
    }

    // 3. Subtítulos (alrededor de subtitlesPos.y)
    if (canvasY >= subtitlesPos.y - 15 && canvasY <= subtitlesPos.y + 65) {
      setSelectedElement('subtitles');
      isDraggingElementRef.current = true;
      dragStartRef.current = {
        startX: clientX,
        startY: clientY,
        origX: subtitlesPos.x,
        origY: subtitlesPos.y,
        target: 'subtitles',
      };
      drawFrame(currentTime / totalClipsDuration);
      return;
    }

    // 4. Titular (alrededor de titlePos.y)
    if (canvasY >= titlePos.y - 45 && canvasY <= titlePos.y + 190) {
      setSelectedElement('title');
      isDraggingElementRef.current = true;
      dragStartRef.current = {
        startX: clientX,
        startY: clientY,
        origX: titlePos.x,
        origY: titlePos.y,
        target: 'title',
      };
      drawFrame(currentTime / totalClipsDuration);
      return;
    }

    // 5. De lo contrario, manipula la Foto activa
    setSelectedElement('image');
    isDraggingElementRef.current = true;
    const curClip = clips[activeClipIndex];
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      origX: curClip?.offsetX || 0,
      origY: curClip?.offsetY || 0,
      target: 'image',
    };
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    startElementDrag(x, y, e.clientX, e.clientY);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    startElementDrag(x, y, touch.clientX, touch.clientY);
  };

  const moveElementDrag = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !dragStartRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 720 / rect.width;
    const deltaX = (clientX - dragStartRef.current.startX) * scale;
    const deltaY = (clientY - dragStartRef.current.startY) * scale;
    const target = dragStartRef.current.target;

    if (target === 'image') {
      const newOffsetX = Math.max(-280, Math.min(280, Math.round(dragStartRef.current.origX + deltaX)));
      const newOffsetY = Math.max(-280, Math.min(280, Math.round(dragStartRef.current.origY + deltaY)));
      setClips((prev) => {
        const updated = [...prev];
        if (updated[activeClipIndex]) {
          updated[activeClipIndex] = {
            ...updated[activeClipIndex],
            offsetX: newOffsetX,
            offsetY: newOffsetY,
          };
        }
        return updated;
      });
    } else if (target === 'title') {
      const newX = Math.max(10, Math.min(250, Math.round(dragStartRef.current.origX + deltaX)));
      const newY = Math.max(120, Math.min(1050, Math.round(dragStartRef.current.origY + deltaY)));
      setTitlePos({ x: newX, y: newY });
    } else if (target === 'subtitles') {
      const newX = Math.max(120, Math.min(600, Math.round(dragStartRef.current.origX + deltaX)));
      const newY = Math.max(180, Math.min(1080, Math.round(dragStartRef.current.origY + deltaY)));
      setSubtitlesPos({ x: newX, y: newY });
    } else {
      setOverlays((prev) =>
        prev.map((ov) => {
          if (ov.id === target) {
            return {
              ...ov,
              x: Math.max(60, Math.min(660, Math.round(dragStartRef.current!.origX + deltaX))),
              y: Math.max(90, Math.min(1150, Math.round(dragStartRef.current!.origY + deltaY))),
            };
          }
          return ov;
        })
      );
    }

    drawFrame(currentTime / totalClipsDuration);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingElementRef.current || !dragStartRef.current) return;
    moveElementDrag(e.clientX, e.clientY);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingElementRef.current || !dragStartRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    moveElementDrag(touch.clientX, touch.clientY);
  };

  const endElementDrag = () => {
    isDraggingElementRef.current = false;
    dragStartRef.current = null;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    handleUpdateActiveClipScale(delta);
  };

  const handleAddCustomTextOverlay = (initialText?: string) => {
    const text = initialText || prompt('Texto para el distintivo o sticker del video:', '🔥 EXCLUSIVO') || '';
    if (!text.trim()) return;
    const newOv = {
      id: `overlay_${Date.now()}`,
      text: text.trim().toUpperCase(),
      x: 360,
      y: 420,
      fontSize: 24,
      color: '#ffffff',
      bgColor: '#dc2626',
      isBadge: true,
    };
    setOverlays((prev) => [...prev, newOv]);
    setSelectedElement(newOv.id);
    setPublishNotice(`✓ Elemento "${text.trim()}" añadido al Canvas. Arrástralo a cualquier posición.`);
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleDeleteSelectedElement = () => {
    if (selectedElement === 'image' || selectedElement === 'title' || selectedElement === 'subtitles' || selectedElement === 'ticker') {
      return;
    }
    setOverlays((prev) => prev.filter((ov) => ov.id !== selectedElement));
    setSelectedElement('image');
    setPublishNotice('✓ Elemento eliminado del Canvas.');
    drawFrame(currentTime / totalClipsDuration);
  };

  const handleResetPositions = () => {
    setTitlePos({ x: 45, y: 500 });
    setSubtitlesPos({ x: 285, y: 720 });
    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = {
          ...updated[activeClipIndex],
          offsetX: 0,
          offsetY: 0,
          scale: 1.0,
        };
      }
      return updated;
    });
    setPublishNotice('✓ Posiciones restablecidas al centro original.');
    drawFrame(currentTime / totalClipsDuration);
  };

  // DIBUJAR FRAME (720x1280 Vertical 9:16)
  const drawFrame = (progress: number, isExporting = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 720;
    const height = 1280;

    // Calcular segundo actual y qué clip está activo
    const currentSec = Math.max(0, Math.min(progress * totalClipsDuration, totalClipsDuration));

    let activeIdx = 0;
    let clipStartSec = 0;
    let accum = 0;

    for (let i = 0; i < clips.length; i++) {
      const clipDur = clips[i]?.duration || 0.1;
      const endSec = accum + clipDur;
      if (currentSec < endSec || i === clips.length - 1) {
        activeIdx = i;
        clipStartSec = accum;
        break;
      }
      accum = endSec;
    }

    if (activeIdx !== activeClipIndexRef.current) {
      activeClipIndexRef.current = activeIdx;
      setActiveClipIndex(activeIdx);
    }

    // 1. DIBUJAR IMAGEN O FONDO CINEMATOGRÁFICO DE ESTUDIO (Si no hay fotos o se eliminaron)
    if (clips.length === 0) {
      ctx.save();
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.35, '#0f172a');
      bgGrad.addColorStop(0.7, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Líneas y ondas dinámicas de emisión
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) {
        const y = 340 + i * 75 + Math.sin(progress * 10 + i) * 15;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(width * 0.35, y - 35, width * 0.65, y + 35, width, y);
        ctx.stroke();
      }

      // Emblema central de emisión de noticias
      const pulse = 1 + Math.sin(progress * 12) * 0.08;
      ctx.save();
      ctx.translate(width / 2, 450);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOTICIA', 0, -4);
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('EN VIVO', 0, 22);
      ctx.restore();

      ctx.restore();
    } else {
      const currentClip = clips[activeIdx];
      const clipProgress = currentClip && currentClip.duration > 0
        ? Math.min(Math.max((currentSec - clipStartSec) / currentClip.duration, 0), 1)
        : 0;

      const isVideoClip = currentClip?.mediaType === 'video' ||
        /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(currentClip?.url || '') ||
        (currentClip?.url || '').startsWith('data:video/') ||
        (currentClip?.url || '').startsWith('blob:');

      let mediaDrawable: CanvasImageSource | null = null;
      let mediaNaturalW = 0;
      let mediaNaturalH = 0;

      if (isVideoClip && currentClip?.url) {
        let v = loadedVideosRef.current.get(currentClip.url);
        if (!v) {
          v = document.createElement('video');
          v.src = currentClip.url;
          v.muted = true;
          v.playsInline = true;
          v.crossOrigin = 'anonymous';
          v.preload = 'auto';
          v.loop = true;
          v.load();
          loadedVideosRef.current.set(currentClip.url, v);
        }
        if (v && v.readyState >= 2) {
          mediaDrawable = v;
          mediaNaturalW = v.videoWidth || 1080;
          mediaNaturalH = v.videoHeight || 1920;

          const clipElapsed = Math.max(currentSec - clipStartSec, 0);

          if (isPlaying || isRecording) {
            // Reproducción suave hacia adelante: sin seek continuo a 60fps
            if (v.duration && v.currentTime >= v.duration - 0.05) {
              // Si el video concluye antes del fin de la escena, congelar en el último frame (estilo TV)
              v.pause();
            } else if (v.paused) {
              v.play().catch(() => {});
            }
          } else {
            // En pausa o arrastre manual: sincronizar tiempo con precisión
            const targetTime = v.duration && v.duration > 0
              ? Math.min(clipElapsed, v.duration - 0.05)
              : clipElapsed;
            if (Math.abs(v.currentTime - targetTime) > 0.1) {
              v.currentTime = targetTime;
            }
            if (!v.paused) v.pause();
          }
        }
      }

      if (!mediaDrawable) {
        let img = loadedImagesRef.current[activeIdx];
        if (!img || !img.complete || img.naturalWidth === 0) {
          img = loadedImagesRef.current.find((im) => im && im.complete && im.naturalWidth > 0) || null;
        }
        if (img && img.complete && img.naturalWidth > 0) {
          mediaDrawable = img;
          mediaNaturalW = img.naturalWidth;
          mediaNaturalH = img.naturalHeight;
        }
      }

      if (mediaDrawable && mediaNaturalW > 0 && mediaNaturalH > 0) {
        ctx.save();
        const clipScale = currentClip?.scale || 1.0;
        const clipOffsetX = currentClip?.offsetX || 0;
        const clipOffsetY = currentClip?.offsetY || 0;

        let zoom = 1.10 * clipScale;
        let panX = clipOffsetX;
        let panY = clipOffsetY;

        const transition = currentClip?.transition || 'zoom_in';
        if (transition === 'zoom_in') {
          zoom = (1.02 + clipProgress * 0.38) * clipScale;
        } else if (transition === 'zoom_out') {
          zoom = (1.40 - clipProgress * 0.38) * clipScale;
        } else if (transition === 'pan_right') {
          zoom = 1.20 * clipScale;
          panX += (clipProgress - 0.5) * 130;
        } else if (transition === 'pan_left') {
          zoom = 1.20 * clipScale;
          panX += (0.5 - clipProgress) * 130;
        } else if (transition === 'pan_up') {
          zoom = 1.20 * clipScale;
          panY += (clipProgress - 0.5) * 110;
        } else if (transition === 'pan_down') {
          zoom = 1.20 * clipScale;
          panY += (0.5 - clipProgress) * 110;
        } else if (transition === 'zoom_pan') {
          zoom = (1.06 + clipProgress * 0.32) * clipScale;
          panX += (clipProgress - 0.5) * 90;
          panY += (clipProgress - 0.5) * 70;
        } else if (transition === 'pulse') {
          const pulseFactor = Math.sin(clipProgress * Math.PI * 2);
          zoom = (1.14 + pulseFactor * 0.14) * clipScale;
        } else if (transition === 'shake') {
          zoom = 1.16 * clipScale;
          const shakeFactor = Math.sin(clipProgress * Math.PI * 6);
          panX += shakeFactor * 12;
          panY += Math.cos(clipProgress * Math.PI * 4) * 9;
        } else if (transition === 'static') {
          zoom = 1.05 * clipScale;
        }

        const aspect = mediaNaturalW / mediaNaturalH;
        let drawW = width;
        let drawH = width / aspect;
        if (currentClip?.fitMode === 'contain') {
          if (drawH > 800) {
            drawH = 800;
            drawW = drawH * aspect;
          }
        } else {
          if (drawH < 860) {
            drawH = 860;
            drawW = drawH * aspect;
          }
        }

        const imgCenterX = width / 2;
        const imgCenterY = Math.min(drawH / 2, 440);

        ctx.translate(imgCenterX + panX, imgCenterY + panY);
        ctx.scale(zoom, zoom);
        ctx.drawImage(mediaDrawable, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 2. DEGRADADO CINEMATOGRÁFICO DE CONTRASTE
    const grad = ctx.createLinearGradient(0, 320, 0, height);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.82)');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 3. BARRA SUPERIOR DE TV EN VIVO / PODCAST CÓDIGO VIRAL
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, width, 84);

    const isBlink = Math.floor(progress * 24) % 2 === 0;
    ctx.fillStyle = isBlink ? '#ffffff' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(42, 42, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 23px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      isPodcastMode
        ? '🎙️ PODCAST CÓDIGO VIRAL • AL INSTANTE'
        : durationMode === 'youtube_15'
        ? '🔴 CÓDIGO VIRAL • NOTICIAS'
        : 'EN VIVO • CÓDIGO VIRAL NOTICIAS',
      65,
      50
    );
    // SE ELIMINÓ EL RELOJ EN width - 35: Evita la colisión con el ícono de búsqueda y los 3 puntos de YouTube Shorts
    ctx.restore();

    // 3b. WATERMARK / LOGO OFICIAL CÓDIGO VIRAL CON IDENTIFICADOR DE CANAL
    if (logoImgRef.current) {
      ctx.save();
      const logoSize = 64;
      const logoX = 40;
      const logoY = 96;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImgRef.current, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 5;
      ctx.fillText('CÓDIGO VIRAL', logoX + logoSize + 12, logoY + 28);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('CANAL OFICIAL • @CodigoViralOficial14', logoX + logoSize + 12, logoY + 48);
      ctx.restore();
    }

    // 4. INDICADOR DE ESCENA / CORTE (Sólo en previsualización de edición, NUNCA en exportación)
    if (!isRecording && !isRecordingRef.current && !isExporting) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.roundRect(40, 105, 185, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ESCENA ${activeIdx + 1} DE ${clips.length}`, 132, 127);
      ctx.restore();
    }

    // 5. TITULAR EN LETRAS GRANDES DE ALTO IMPACTO (Completo, dinámico, nunca mocho)
    ctx.save();
    ctx.textAlign = 'left';

    // Determinar tamaño de fuente dinámico para que NUNCA se corte el titular
    let titleFontSize = 36;
    if (customTitle.length > 110) {
      titleFontSize = 25;
    } else if (customTitle.length > 80) {
      titleFontSize = 28;
    } else if (customTitle.length > 60) {
      titleFontSize = 32;
    } else {
      titleFontSize = 36;
    }
    ctx.font = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;

    const wrapTitle = (text: string, maxWidth: number) => {
      const words = text.split(/\s+/).filter(Boolean);
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

    // Ancho calibrado para Zona Segura: deja 210px limpios a la derecha para no tapar Me gusta / Comentarios
    const maxTitleWidth = width - 210;
    let titleLines = wrapTitle(customTitle, maxTitleWidth);

    // Si aún con ese tamaño salen más de 4 líneas, reducir un poco más la fuente para que quepa TODO
    if (titleLines.length > 4) {
      titleFontSize = 22;
      ctx.font = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
      titleLines = wrapTitle(customTitle, maxTitleWidth);
    }

    const lineHeight = titleFontSize + 11;
    const totalTitleHeight = titleLines.length * lineHeight;
    const startY = titlePos.y;

    titleLines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 7;
      ctx.strokeText(line, titlePos.x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, titlePos.x, y);
    });
    ctx.restore();

    // 6. SUBTÍTULOS ANIMADOS ESTILO CAPCUT SINCRONIZADOS CON LA VOZ
    ctx.save();
    ctx.textAlign = 'center';

    const wordsTotal = spokenWords.length || 10;
    const fallbackDuration = wordsTotal * (0.33 / (activeNarrator.rate || 1.0));
    const audioDur = audioDurationRef.current > 0 ? audioDurationRef.current : Math.min(fallbackDuration, totalClipsDuration);

    let rawSubtitle = '';
    let isCtaPhase = false;

    if (currentSec < audioDur) {
      // Mientras el narrador está hablando: ráfagas sincronizadas 1:1 con la voz
      const audioProgress = Math.min(currentSec / audioDur, 1);
      const activeSubtitleIndex = Math.min(
        Math.floor(audioProgress * subtitleChunks.length),
        subtitleChunks.length - 1
      );
      rawSubtitle = (subtitleChunks[activeSubtitleIndex] || '').toUpperCase();
    } else {
      // Cuando el narrador concluye: llamado a la acción viral (CTA) de alto impacto
      rawSubtitle = '🚨 SÍGUENOS EN CÓDIGO VIRAL';
      isCtaPhase = true;
    }

    let subFontSize = 26;
    ctx.font = `900 ${subFontSize}px system-ui, -apple-system, sans-serif`;
    let measuredWidth = ctx.measureText(rawSubtitle).width;

    while (measuredWidth > 490 && subFontSize > 18) {
      subFontSize -= 2;
      ctx.font = `900 ${subFontSize}px system-ui, -apple-system, sans-serif`;
      measuredWidth = ctx.measureText(rawSubtitle).width;
    }

    const pillPaddingX = 24;
    // Ancho de subtítulo dentro de la Zona Segura (máximo 480px)
    const pillWidth = Math.min(measuredWidth + pillPaddingX * 2, 480);
    const pillHeight = subFontSize + 24;
    const pillX = subtitlesPos.x - pillWidth / 2;
    const pillY = subtitlesPos.y;
    const textY = pillY + pillHeight / 2 + subFontSize * 0.35;

    if (isCtaPhase) {
      // Pastilla de cierre de alto impacto
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 14);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(rawSubtitle, subtitlesPos.x, textY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(rawSubtitle, subtitlesPos.x, textY);
    } else if (subtitleStyle === 'capcut_yellow') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 14);
      ctx.fill();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeText(rawSubtitle, subtitlesPos.x, textY);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(rawSubtitle, subtitlesPos.x, textY);
    } else if (subtitleStyle === 'breaking_red') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(rawSubtitle, subtitlesPos.x, textY);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillText(rawSubtitle, subtitlesPos.x, textY);
    }
    ctx.restore();

    // 6b. ELEMENTOS ADICIONALES / STICKERS / DISTINTIVOS AGREGADOS
    overlays.forEach((ov) => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `900 ${ov.fontSize}px system-ui, -apple-system, sans-serif`;
      const measured = ctx.measureText(ov.text).width;
      const padX = 18;
      const boxW = measured + padX * 2;
      const boxH = ov.fontSize + 16;
      const boxX = ov.x - boxW / 2;
      const boxY = ov.y - boxH / 2;

      ctx.fillStyle = ov.bgColor || '#dc2626';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = ov.color || '#ffffff';
      ctx.fillText(ov.text, ov.x, ov.y + ov.fontSize * 0.35);
      ctx.restore();
    });

    // 7. CINTILLO / ONDA DE AUDIO REACTIVA PODCAST (Zona Segura y visualización innovadora)
    if (isPodcastMode) {
      ctx.save();
      const waveX = 45;
      const waveY = 820;
      const numBars = 22;
      const barWidth = 6;
      const barGap = 5;

      for (let b = 0; b < numBars; b++) {
        const freq = Math.sin(progress * 35 + b * 0.7) * Math.cos(progress * 22 + b * 0.5);
        const barHeight = Math.max(8, Math.abs(freq) * 44 + 10);
        const bx = waveX + b * (barWidth + barGap);
        const by = waveY - barHeight / 2;

        const barGrad = ctx.createLinearGradient(0, by, 0, by + barHeight);
        barGrad.addColorStop(0, '#ef4444');
        barGrad.addColorStop(1, '#facc15');

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, barWidth, barHeight, 3);
        ctx.fill();
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🎙️ CÓDIGO VIRAL PODCAST', waveX + numBars * (barWidth + barGap) + 12, waveY + 5);
      ctx.restore();
    } else if (showTicker) {
      ctx.save();
      // Posición elevada a y=840 para que NUNCA lo tape la barra de navegación de YouTube
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 840, width, 40);

      const displayText = tickerText.endsWith(' • ') ? tickerText : `${tickerText} • `;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';

      const textWidth = Math.max(ctx.measureText(displayText).width, 100);
      const tickerOffset = (progress * 1600) % textWidth;
      ctx.fillText(displayText, -tickerOffset, 866);
      ctx.fillText(displayText, textWidth - tickerOffset, 866);
      ctx.fillText(displayText, textWidth * 2 - tickerOffset, 866);
      ctx.restore();
    }

    // 7b. GUÍA VISUAL DE ZONA SEGURA DE YOUTUBE SHORTS (Para edición visual)
    if (!isRecording && !isRecordingRef.current && !isExporting && showSafeZoneGuide) {
      ctx.save();
      // Columna derecha ocupada por botones de YouTube
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(550, 420, 170, 680);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(550, 420, 170, 680);

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOTONES YOUTUBE', 635, 750);
      ctx.fillText('(Me gusta, Comentarios)', 635, 770);

      // Área inferior ocupada por canal y título
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(0, 890, width, 390);
      ctx.strokeRect(0, 890, width, 390);
      ctx.fillText('ZONA CANAL Y TÍTULO YOUTUBE', width / 2, 980);

      // Caja de Zona Segura 100% visible
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(35, 90, 510, 780);
      ctx.fillStyle = '#86efac';
      ctx.fillText('✅ ZONA SEGURA 100% VISIBLE', 290, 130);
      ctx.restore();
    }

    // 8. BARRA DE PROGRESO INFERIOR
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, height - 8, width * progress, 8);

    // ==========================================
    // CONTROLES VISUALES CAPCUT EN VIVO (MANIPULACIÓN DIRECTA)
    // NUNCA DIBUJAR EN EL VIDEO EXPORTADO NI EN GRABACIÓN
    // ==========================================
    if (!isRecording && !isRecordingRef.current && !isExporting && selectedElement !== 'none') {
      ctx.save();
      if (selectedElement === 'title') {
        const boxLeft = titlePos.x - 10;
        const boxTop = titlePos.y - titleFontSize;
        const boxWidth = maxTitleWidth + 20;
        const boxHeight = totalTitleHeight + 20;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        [[boxLeft, boxTop], [boxLeft + boxWidth, boxTop], [boxLeft, boxTop + boxHeight], [boxLeft + boxWidth, boxTop + boxHeight]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.stroke();
        });

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTop - 32, 230, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🔤 Titular (Arrastra para mover)', boxLeft + 10, boxTop - 15);
      } else if (selectedElement === 'subtitles') {
        const boxLeft = pillX - 6;
        const boxTop = pillY - 6;
        const boxWidth = pillWidth + 12;
        const boxHeight = pillHeight + 12;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        [[boxLeft, boxTop], [boxLeft + boxWidth, boxTop], [boxLeft, boxTop + boxHeight], [boxLeft + boxWidth, boxTop + boxHeight]].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.stroke();
        });

        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.roundRect(boxLeft, boxTop - 32, 260, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('💬 Subtítulos (Arrastra para mover)', boxLeft + 10, boxTop - 15);
      } else if (selectedElement === 'ticker') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(0, 1133, width, 59);
        ctx.setLineDash([]);

        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.roundRect(20, 1100, 280, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🔴 Cintillo (Editable abajo o en panel)', 30, 1118);
      } else if (selectedElement === 'image') {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(8, 8, width - 16, height - 16);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(width / 2 - 200, height - 55, 400, 32, 16);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🖼️ Foto Activa: Arrastra para encuadrar • Rueda para zoom', width / 2, height - 34);
      } else {
        const selOv = overlays.find((ov) => ov.id === selectedElement);
        if (selOv) {
          const estW = selOv.text.length * (selOv.fontSize * 0.6) + 36;
          const estH = selOv.fontSize + 24;
          const boxLeft = selOv.x - estW / 2;
          const boxTop = selOv.y - estH / 2;
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(boxLeft, boxTop, estW, estH);
          ctx.setLineDash([]);

          ctx.fillStyle = '#be185d';
          ctx.beginPath();
          ctx.roundRect(boxLeft, boxTop - 28, 240, 24, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('⭐ Elemento (Arrastra para mover)', boxLeft + 8, boxTop - 12);
        }
      }
      ctx.restore();
    }
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
    setupAudioGraph(currentTime);
    startTimeRef.current = performance.now() - currentTime * 1000;
    const totalMs = totalClipsDuration * 1000;

    const loop = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / totalMs, 1);
      const curSec = progress * totalClipsDuration;

      setCurrentTime(curSec);

      // Sincronizar activeClipIndex automáticamente con el clip actual
      let syncAccum = 0;
      let curActive = 0;
      for (let i = 0; i < clips.length; i++) {
        if (curSec < syncAccum + clips[i].duration || i === clips.length - 1) {
          curActive = i;
          break;
        }
        syncAccum += clips[i].duration;
      }
      if (curActive !== activeClipIndexRef.current) {
        activeClipIndexRef.current = curActive;
        setActiveClipIndex(curActive);
      }
      drawFrame(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(loop);
      } else {
        stopPlayback();
        setCurrentTime(0);
        drawFrame(0);
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
    speechSynthesisUtteranceRef.current = null;
    loadedVideosRef.current.forEach((v) => {
      try { v.pause(); } catch {}
    });
  };

  // Renderizar video en memoria (Promise<Blob>)
  const renderVideoInMemory = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      stopPlayback();
      isRecordingRef.current = true;
      setIsRecording(true);
      const canvas = canvasRef.current;
      if (!canvas) {
        isRecordingRef.current = false;
        setIsRecording(false);
        reject(new Error('Canvas no disponible'));
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

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          isRecordingRef.current = false;
          setIsRecording(false);
          drawFrame(currentTime / totalClipsDuration, false);
          const rawBlob = new Blob(chunks, { type: mimeType });
          try {
            setPublishNotice('⏳ Procesando y normalizando video MP4 con FFmpeg...');
            const rawBase64 = await blobToBase64(rawBlob);
            const fixRes = await api.post('/media/fix-video', { videoBase64: rawBase64 });
            if (fixRes.data?.base64) {
              const byteCharacters = atob(fixRes.data.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const cleanBlob = new Blob([byteArray], { type: 'video/mp4' });
              resolve(cleanBlob);
              return;
            }
          } catch (e: any) {
            console.warn('Fallo transcodificación en backend, usando blob original:', e.message);
          }
          resolve(rawBlob);
        };

        recorder.start();
        const totalMs = totalClipsDuration * 1000;
        const startTime = performance.now();

        const recordLoop = (currentTimeMs: number) => {
          const elapsed = currentTimeMs - startTime;
          const progress = Math.min(elapsed / totalMs, 1);
          setCurrentTime(progress * totalClipsDuration);
          drawFrame(progress, true);
          setRecordProgress(Math.round(progress * 100));

          if (progress < 1) {
            requestAnimationFrame(recordLoop);
          } else {
            recorder.stop();
            stopPlayback();
          }
        };

        requestAnimationFrame(recordLoop);
      } catch (err) {
        reject(err);
      }
    });
  };

  // EXPORTAR Y DESCARGAR VIDEO COMPLETO CON AUDIO Y SUBTÍTULOS INCORPORADOS
  const handleExportVideo = async (): Promise<Blob | null> => {
    stopPlayback();
    setIsRecording(true);
    setRecordProgress(0);
    try {
      const blob = await renderVideoInMemory();
      setExportedBlob(blob);
      setIsRecording(false);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefix = durationMode === 'youtube_15' ? 'Short_15s' : 'Reel';
      const cleanName = cleanPureTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_');
      const isMp4 = blob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      a.download = `${prefix}_${cleanName}.${ext}`;
      a.click();
      setPublishNotice(`✓ ¡Video descargado (${ext.toUpperCase()}) en tu carpeta de Descargas! Títulos copiados al portapapeles.`);
      return blob;
    } catch (err: any) {
      console.error('Error exportando video:', err);
      alert('Error exportando video: ' + err.message);
      return null;
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
      drawFrame(currentTime / totalClipsDuration, false);
    }
  };

  // Función auxiliar para convertir Blob a base64 de forma asíncrona segura
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = (reader.result as string) || '';
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = (e) => reject(new Error('Error al procesar el archivo de video: ' + e));
      reader.readAsDataURL(blob);
    });
  };

  // 1. Subir a YouTube Shorts (Asistido 1-Clic con protección total contra bloqueo de popups)
  const handleOpenYouTubeStudio = async () => {
    // Abrir ventana INMEDIATAMENTE en el hilo síncrono del click para que Chrome/Edge NUNCA bloquee el popup
    let ytWindow: Window | null = null;
    try {
      ytWindow = window.open('https://studio.youtube.com/channel/videos/upload?d=ud', '_blank');
    } catch (e) {
      console.warn('Popup bloqueado:', e);
    }

    // Copiar titular viral optimizado y hashtags al portapapeles de inmediato en el gesto de usuario
    const finalHeadline = (customTitle || cleanPureTitle).trim();
    const shortTitle = finalHeadline.slice(0, 65).trim();
    const fullCopy = `${shortTitle} #Shorts #CodigoViral\n\n${customBody || cleanPureBody}\n\n🎙️ CÓDIGO VIRAL | Redes · Apps · Dinero · Vida\n🚨 Síguenos en @CodigoViralOficial14 para más análisis y noticias al instante.\n\n#CodigoViral #Shorts #PodcastViral #Noticias #Colombia #Tendencias`;
    try {
      await navigator.clipboard.writeText(fullCopy);
    } catch {}

    // Si aún no está renderizado el video, renderizarlo y descargarlo en la PC del usuario
    let blob = exportedBlob;
    if (!blob) {
      setPublishNotice('⏳ Preparando y descargando Short MP4 optimizado... En la pestaña de YouTube Studio que se acaba de abrir, arrastra el video cuando termine la descarga.');
      blob = await handleExportVideo();
      if (!blob) {
        if (ytWindow) ytWindow.close();
        return;
      }
    }

    setPublishNotice('🎉 ¡Short MP4 descargado y título copiado! En la pestaña de YouTube Studio abierta: 1) Arrastra el archivo descargado. 2) Pulsa Ctrl+V en el título. ¡Listo!');
  };

  const handlePublishYouTubeShorts = handleOpenYouTubeStudio;

  // 2. Publicar directamente a Página de Facebook conectada (Vía Meta Graph API 100% Automático)
  const handlePublishToFacebookPage = async () => {
    if (!selectedPageId) {
      alert('Debes tener al menos una página de Facebook conectada en la sección Páginas.');
      return;
    }

    setIsPublishingToFb(true);
    setPublishNotice('⏳ Procesando y subiendo Reel 100% automático a tu Fan Page de Facebook...');

    try {
      let blobToUpload = exportedBlob;
      if (!blobToUpload) {
        setPublishNotice('⏳ Renderizando Reel en memoria con subtítulos y audio...');
        blobToUpload = await renderVideoInMemory();
        setExportedBlob(blobToUpload);
      }

      setPublishNotice('⏳ Transfiriendo video a Facebook...');
      const base64data = await blobToBase64(blobToUpload);
      const finalHeadline = (customTitle || cleanPureTitle).trim();
      const res = await api.post(`/pages/${selectedPageId}/publish-video`, {
        title: finalHeadline.slice(0, 80),
        description: `${finalHeadline}\n\n${customBody || cleanPureBody}\n\n#Noticias #Reels #EnVivo #Colombia`,
        videoBase64: base64data,
      });

      if (res.data?.success) {
        setPublishNotice(`🎉 ¡Reel publicado 100% automático en "${res.data.pageName}" en Facebook sin necesidad de descargar!`);
      } else {
        alert('Error de Facebook: ' + (res.data?.message || 'Error publicando'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error desconocido';
      alert('Error de Facebook: ' + msg);
      setPublishNotice('❌ Error al subir a Facebook: ' + msg);
    } finally {
      setIsPublishingToFb(false);
    }
  };

// 2a. Subida delegada a handleOpenYouTubeStudio (ver arriba)

  // 2b. Publicar directamente a YouTube Shorts (100% Automático vía YouTube Data API v3 con JWT)
  const handlePublishToYouTubeDirect = async () => {
    const channelIdToUse = selectedYtChannelId || youtubeChannels[0]?.id;
    if (!channelIdToUse && youtubeChannels.length === 0) {
      alert('Debes tener al menos un canal de YouTube vinculado en la sección Canales/Páginas.');
      return;
    }

    setIsPublishingToYt(true);
    setPublishNotice('⏳ Procesando y subiendo Short 100% automático a YouTube vía API...');

    try {
      let blobToUpload = exportedBlob;
      if (!blobToUpload) {
        setPublishNotice('⏳ Renderizando Short en memoria con audio y efectos...');
        blobToUpload = await renderVideoInMemory();
        setExportedBlob(blobToUpload);
      }

      setPublishNotice('⏳ Transfiriendo video a YouTube...');
      const base64data = await blobToBase64(blobToUpload);
      const finalHeadline = (customTitle || cleanPureTitle).trim();
      const shortTitle = finalHeadline.slice(0, 65).trim();

      const res = await api.post('/youtube/publish-short', {
        channelDbId: channelIdToUse,
        title: shortTitle,
        description: `${shortTitle}\n\n${customBody || cleanPureBody}\n\n#Shorts #Noticias #Tendencias`,
        videoBase64: base64data,
      });

      if (res.data?.success) {
        setPublishNotice(`🎉 ¡Short subido con éxito a YouTube ("${res.data.channelTitle}")! Puedes verlo en YouTube Studio: ${res.data.url}`);
      } else {
        alert('Error de YouTube: ' + (res.data?.message || 'Error publicando Short'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al comunicarse con el servidor';
      alert('Error de YouTube: ' + msg);
      setPublishNotice('❌ Error al subir a YouTube: ' + msg);
    } finally {
      setIsPublishingToYt(false);
    }
  };

  // 3. Abrir Creador de Reels de Facebook (Para Perfil Personal con protección de popups)
  const handleOpenFacebookReelsPersonal = async () => {
    let fbWindow: Window | null = null;
    try {
      fbWindow = window.open('https://www.facebook.com/reels/create', '_blank');
    } catch {}

    const finalHeadline = (customTitle || cleanPureTitle).trim();
    try {
      await navigator.clipboard.writeText(`${finalHeadline}\n\n${customBody || cleanPureBody}\n\n#Noticias #Reels`);
    } catch {}

    let blob = exportedBlob;
    if (!blob) {
      setPublishNotice('⏳ Renderizando y descargando el Reel MP4 en tu PC primero... En la ventana de Facebook Reels que se acaba de abrir, arrastra el video al terminar la descarga.');
      blob = await handleExportVideo();
      if (!blob) {
        if (fbWindow) fbWindow.close();
        return;
      }
    }
    setPublishNotice('✓ ¡Video descargado en Descargas! En la pantalla de Facebook Reels abierta, arrastra el video recién descargado y pulsa Ctrl+V.');
  };

  // 4. Compartir nativo en apps del dispositivo
  const handleShareNative = async () => {
    if (!exportedBlob) {
      alert('Primero genera el video con el botón principal.');
      return;
    }
    if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
      const file = new File([exportedBlob], `${durationMode === 'youtube_15' ? 'Short' : 'Reel'}.mp4`, { type: 'video/mp4' });
      if ((navigator as any).canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: cleanPureTitle,
            text: `${cleanPureTitle}\n\n${cleanPureBody.slice(0, 140)} #Noticias #Reels`,
          });
          return;
        } catch (e) {
          console.warn(e);
        }
      }
    }
    alert('Tu navegador no soporta compartir archivos directamente. Usa los botones directos de YouTube o Facebook.');
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
                  Línea de Tiempo + Dividir + Voz CapCut
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Edita escenas con la línea de tiempo interactiva, divide cortes, busca fotos y publica en Shorts y Reels
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
          {/* COLUMNA 1: REPRODUCTOR VERTICAL 9:16 ESTILO CAPCUT */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* Barra CapCut: Selector de Elemento Activo en Canvas */}
            <div className="w-full max-w-[280px] mb-2 bg-slate-800/95 p-1.5 rounded-2xl border border-slate-700 shadow-md text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 mb-1 border-b border-slate-700/60">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Editor Directo en Pantalla</span>
                </span>
                <span className="text-[9px] text-sky-400 font-normal">Arrastra con el mouse</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => { setSelectedElement('image'); drawFrame(currentTime / totalClipsDuration); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedElement === 'image'
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🖼️ Foto
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedElement('title'); drawFrame(currentTime / totalClipsDuration); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedElement === 'title'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🔤 Título
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedElement('subtitles'); drawFrame(currentTime / totalClipsDuration); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedElement === 'subtitles'
                      ? 'bg-yellow-600 text-white shadow'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  💬 Subs
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedElement('ticker'); drawFrame(currentTime / totalClipsDuration); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedElement === 'ticker'
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🔴 Cintillo
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedElement('none'); drawFrame(currentTime / totalClipsDuration); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedElement === 'none'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Vista limpia sin recuadros de selección"
                >
                  👁️ Limpio
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomTextOverlay}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white transition flex items-center space-x-0.5"
                  title="Añadir texto personalizado o badge"
                >
                  <Plus className="w-3 h-3" />
                  <span>Texto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSafeZoneGuide((prev) => !prev);
                    setTimeout(() => drawFrame(currentTime / totalClipsDuration), 50);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                    showSafeZoneGuide
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Muestra en pantalla la zona segura para que los botones de YouTube Shorts no tapen nada"
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>{showSafeZoneGuide ? 'Ocultar Zona Segura' : '🛡️ Zona Segura Shorts'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPositions}
                  className="px-1.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  title="Restablecer posiciones a la zona segura"
                >
                  ↺ Calibrar
                </button>
              </div>
            </div>

            {/* Lienzo Canvas con Interacción Táctil y Ratón (CapCut Style) */}
            <div className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black">
              <canvas
                ref={canvasRef}
                width={720}
                height={1280}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={endElementDrag}
                onMouseLeave={endElementDrag}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={endElementDrag}
                onWheel={handleCanvasWheel}
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing select-none"
              />
            </div>

            {/* Controles de reproducción */}
            <div className="flex items-center space-x-3 mt-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pausar' : 'Previsualizar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopPlayback();
                  setCurrentTime(0);
                  drawFrame(0);
                }}
                disabled={isRecording}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Reiniciar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* PANEL INSPECTOR DEL ELEMENTO ACTIVO (CapCut) */}

            {/* 1. Si está seleccionada la FOTO / IMAGEN */}
            {selectedElement === 'image' && (
              clips.length > 0 ? (
                <div className="w-full max-w-[280px] bg-slate-800/80 p-3 rounded-2xl border border-sky-500/50 mt-3 space-y-2.5 text-xs shadow-lg animate-fade-in">
                  <div className="flex items-center justify-between text-sky-300 font-bold text-xs pb-1 border-b border-slate-700/60">
                    <span className="flex items-center space-x-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>{clips[activeClipIndex]?.name || `Escena ${activeClipIndex + 1}`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleFitMode}
                      className="text-[9px] px-2 py-0.5 rounded-lg bg-sky-600/30 text-sky-300 font-semibold hover:bg-sky-600/50 transition border border-sky-500/40"
                      title="Alternar entre llenar pantalla vertical o ver imagen completa"
                    >
                      {clips[activeClipIndex]?.fitMode === 'contain' ? 'Foto Entera' : 'Llenar'}
                    </button>
                  </div>

                  {/* Slider de Zoom / Tamaño */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Zoom / Tamaño:</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {Math.round((clips[activeClipIndex]?.scale || 1.0) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateActiveClipScale(-0.1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                        title="Hacer más pequeña"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="2.2"
                        step="0.05"
                        value={clips[activeClipIndex]?.scale || 1.0}
                        onChange={(e) => handleSetActiveClipScaleExact(parseFloat(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateActiveClipScale(0.1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                        title="Hacer más grande"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Slider de Posición Vertical (Subir / Bajar cara) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Subir / Bajar foto:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {clips[activeClipIndex]?.offsetY || 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-160"
                      max="160"
                      step="5"
                      value={clips[activeClipIndex]?.offsetY || 0}
                      onChange={(e) => handleUpdateActiveClipOffsetY(parseInt(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* Selector de Efecto de Movimiento / Animación */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="flex items-center space-x-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Efecto de Movimiento:</span>
                      </span>
                      {clips.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleApplyTransitionToAll(clips[activeClipIndex]?.transition || 'zoom_in')}
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                          title="Aplicar este mismo efecto de cámara a todas las escenas"
                        >
                          A todas
                        </button>
                      )}
                    </div>
                    <select
                      value={clips[activeClipIndex]?.transition || 'zoom_in'}
                      onChange={(e) => handleChangeTransition(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                    >
                      {IMAGE_EFFECTS.map((eff) => (
                        <option key={eff.id} value={eff.id}>
                          {eff.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[280px] bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 mt-3 space-y-2 text-xs shadow-lg text-center animate-fade-in">
                  <div className="text-slate-300 font-bold">📺 Modo Noticia Pura</div>
                  <div className="text-[10px] text-slate-400">Sin imágenes de fondo. El video transmite la noticia completa con locución y gráficos de TV.</div>
                  <button
                    type="button"
                    onClick={() => handleAddClip()}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow"
                  >
                    + Añadir Foto
                  </button>
                </div>
              )
            )}

            {/* 2. Si está seleccionado el TITULAR */}
            {selectedElement === 'title' && (
              <div className="w-full max-w-[280px] bg-slate-800/90 p-3 rounded-2xl border border-amber-500/50 mt-3 space-y-2.5 text-xs shadow-lg animate-fade-in">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs pb-1 border-b border-slate-700/60">
                  <span className="flex items-center space-x-1">
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>🔤 Editar Titular</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setTitlePos({ x: 40, y: 720 }); drawFrame(currentTime / totalClipsDuration); }}
                    className="text-[9px] px-2 py-0.5 rounded-lg bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white"
                  >
                    Centrar
                  </button>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 font-medium">Texto en Pantalla:</label>
                    <span className={`text-[10px] font-mono font-bold ${customTitle.length > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {customTitle.length}/65 chars {customTitle.length <= 65 ? '✓ Óptimo Shorts' : (customTitle.length <= 70 ? '• Aceptable' : '⚠️ Muy largo')}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      drawFrame(currentTime / totalClipsDuration);
                    }}
                    placeholder="Titular corto y directo de impacto..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTitle(formatShortViralTitle(draft?.title || title || ''));
                      drawFrame(currentTime / totalClipsDuration);
                    }}
                    className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                    title="Optimiza y corta automáticamente a longitud viral de Shorts (50-65 caracteres)"
                  >
                    Auto-ajustar a Shorts
                  </button>
                  <span className="text-[9px] text-slate-400">Arrastra en pantalla</span>
                </div>
              </div>
            )}

            {/* 3. Si están seleccionados los SUBTÍTULOS */}
            {selectedElement === 'subtitles' && (
              <div className="w-full max-w-[280px] bg-slate-800/90 p-3 rounded-2xl border border-yellow-500/50 mt-3 space-y-2.5 text-xs shadow-lg animate-fade-in">
                <div className="flex items-center justify-between text-yellow-300 font-bold text-xs pb-1 border-b border-slate-700/60">
                  <span>💬 Subtítulos de Locución</span>
                  <button
                    type="button"
                    onClick={() => { setSubtitlesPos({ x: 360, y: 940 }); drawFrame(currentTime / totalClipsDuration); }}
                    className="text-[9px] px-2 py-0.5 rounded-lg bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600 hover:text-white"
                  >
                    Centrar
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400">Posición rápida:</div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => { setSubtitlesPos({ x: 360, y: 350 }); drawFrame(currentTime / totalClipsDuration); }}
                      className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-[10px]"
                    >
                      Arriba
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSubtitlesPos({ x: 360, y: 640 }); drawFrame(currentTime / totalClipsDuration); }}
                      className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-[10px]"
                    >
                      Centro
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSubtitlesPos({ x: 360, y: 940 }); drawFrame(currentTime / totalClipsDuration); }}
                      className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-[10px]"
                    >
                      Abajo
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  💡 Tip: Puedes moverlos con el cursor a cualquier posición de la pantalla.
                </div>
              </div>
            )}

            {/* 4. Si está seleccionado el CINTILLO INFERIOR ROJO */}
            {selectedElement === 'ticker' && (
              <div className="w-full max-w-[280px] bg-slate-800/90 p-3 rounded-2xl border border-red-500/50 mt-3 space-y-2.5 text-xs shadow-lg animate-fade-in">
                <div className="flex items-center justify-between text-red-300 font-bold text-xs pb-1 border-b border-slate-700/60">
                  <span>🔴 Cintillo Inferior Rojo</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTicker}
                      onChange={(e) => {
                        setShowTicker(e.target.checked);
                        drawFrame(currentTime / totalClipsDuration);
                      }}
                      className="accent-red-600 rounded"
                    />
                    <span className="text-[10px] text-slate-300 font-normal">Mostrar</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">Texto en la franja roja:</label>
                  <textarea
                    rows={2}
                    value={tickerText}
                    onChange={(e) => {
                      setTickerText(e.target.value);
                      drawFrame(currentTime / totalClipsDuration);
                    }}
                    placeholder="CONFIRMADA • NOTICIA DE ÚLTIMA HORA • COMPARTE ESTE VIDEO..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTickerText('🔴 CONFIRMADA • NOTICIA DE ÚLTIMA HORA • COMPARTE ESTE VIDEO');
                      drawFrame(currentTime / totalClipsDuration);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                  >
                    Última Hora
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTickerText(`CONFIRMADA • FUENTE: ${draft?.sourceAttribution || 'Noticias'} • COMPARTE ESTE VIDEO`);
                      drawFrame(currentTime / totalClipsDuration);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                  >
                    Con Fuente
                  </button>
                </div>
              </div>
            )}

            {/* 5. Si está seleccionado un OVERLAY PERSONALIZADO */}
            {selectedElement && selectedElement.startsWith('ov_') && (
              <div className="w-full max-w-[280px] bg-slate-800/90 p-3 rounded-2xl border border-emerald-500/50 mt-3 space-y-2.5 text-xs shadow-lg animate-fade-in">
                <div className="flex items-center justify-between text-emerald-300 font-bold text-xs pb-1 border-b border-slate-700/60">
                  <span>✨ Texto / Sticker</span>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedElement}
                    className="text-[9px] px-2 py-0.5 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white"
                  >
                    Eliminar
                  </button>
                </div>
                {(() => {
                  const currentOv = overlays.find((o) => o.id === selectedElement);
                  if (!currentOv) return null;
                  return (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={currentOv.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOverlays((prev) =>
                            prev.map((o) => (o.id === selectedElement ? { ...o, text: val } : o))
                          );
                          drawFrame(currentTime / totalClipsDuration);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                      />
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-400">Color:</span>
                        {['#ffffff', '#facc15', '#ef4444', '#38bdf8', '#22c55e'].map((col) => (
                          <button
                            type="button"
                            key={col}
                            onClick={() => {
                              setOverlays((prev) =>
                                prev.map((o) => (o.id === selectedElement ? { ...o, color: col } : o))
                              );
                              drawFrame(currentTime / totalClipsDuration);
                            }}
                            className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* COLUMNA 2: HERRAMIENTAS MINI CAPCUT */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Modo Podcast Viral Innovador (CÓDIGO VIRAL) */}
            <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-purple-950/60 p-3 rounded-2xl border border-red-500/50 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-red-500 flex items-center justify-center bg-black shadow">
                    <img src={CODIGO_VIRAL_BRAND.logoBase64} alt="Código Viral" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-400 block">🎙️ Modo Podcast Código Viral</span>
                    <span className="text-[10px] text-slate-400">@CodigoViralOficial14 · Innovador</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPodcastMode}
                    onChange={(e) => {
                      setIsPodcastMode(e.target.checked);
                      if (e.target.checked) setSelectedNarratorId('podcast_host');
                      setTimeout(() => drawFrame(currentTime / totalClipsDuration), 50);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed">
                Entrega las noticias como un <strong className="text-white font-semibold">Micro-Podcast dinámico</strong>: incluye onda de audio animada en vivo, locución conversacional y el logo oficial de Código Viral.
              </div>

              <button
                type="button"
                onClick={handleConvertToPodcastScript}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition transform active:scale-98"
                title="Transforma el texto formal en un relato conversacional de podcast con gancho y llamado a la acción"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🎙️ Adaptar Guión a Podcast Conversacional</span>
              </button>
            </div>

            {/* 1. Selector de Plataforma y Duración */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Formato y Duración del Video</span>
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => handleSelectDurationMode('youtube_15')}
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
                  onClick={() => handleSelectDurationMode('reels_30')}
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
                  onClick={() => handleSelectDurationMode('reels_60')}
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

            {/* 2. Selector de Opciones de Narrador */}
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

            {/* 3. LÍNEA DE TIEMPO INTERACTIVA MULTI-PISTA ESTILO CAPCUT */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80 space-y-2.5">
              {/* Barra de herramientas CapCut */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>Línea de Tiempo</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-600/30 text-sky-300 font-mono">
                        {formatTime(currentTime)} / {formatTime(totalClipsDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de edición */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* 1 Foto para todo el video */}
                  <button
                    onClick={handleSetSingleImageFullVideo}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-300 hover:text-white text-xs font-semibold border border-purple-700/60 transition flex items-center space-x-1"
                    title="Usar solo 1 imagen para el 100% de todo el video"
                  >
                    <span>🖼️ 1 Foto (Todo)</span>
                  </button>

                  {/* Botón Dividir (✂️ Split) */}
                  <button
                    onClick={handleSplitActiveClip}
                    disabled={clips.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition active:scale-95 shadow-sm disabled:opacity-40"
                    title="Dividir escena en la posición actual del cursor"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Dividir</span>
                  </button>

                  {/* Poner más angosta / ancha */}
                  <button
                    onClick={() => handleAdjustClipDuration(-1.0)}
                    disabled={clips.length === 0}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-40"
                    title="Poner esta escena más angosta (-1s)"
                  >
                    <span>➖ Angosta</span>
                  </button>

                  <button
                    onClick={() => handleAdjustClipDuration(1.0)}
                    disabled={clips.length === 0}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-40"
                    title="Poner esta escena más ancha (+1s)"
                  >
                    <span>➕ Ancha</span>
                  </button>

                  <button
                    onClick={handleEqualizeClipDurations}
                    disabled={clips.length === 0}
                    className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-xs font-semibold border border-slate-700 transition disabled:opacity-40"
                    title="Ajustar todas las escenas para que cubran exactamente el tiempo total del video"
                  >
                    <span>✨ Ajustar al Total</span>
                  </button>

                  {/* Duración numérica fina */}
                  {clips.length > 0 && (
                    <div className="flex items-center space-x-0.5 bg-slate-800 border border-slate-700 rounded-xl p-0.5">
                      <button
                        onClick={() => handleAdjustClipDuration(-0.5)}
                        className="px-1.5 py-0.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
                        title="Disminuir 0.5s"
                      >
                        -0.5s
                      </button>
                      <span className="text-[10px] text-amber-400 font-mono px-1">
                        {clips[activeClipIndex]?.duration?.toFixed(1)}s
                      </span>
                      <button
                        onClick={() => handleAdjustClipDuration(0.5)}
                        className="px-1.5 py-0.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
                        title="Aumentar 0.5s"
                      >
                        +0.5s
                      </button>
                    </div>
                  )}

                  {/* Efecto de cámara / Animación */}
                  {clips.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
                      <select
                        value={clips[activeClipIndex]?.transition || 'zoom_in'}
                        onChange={(e) => handleChangeTransition(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[170px] truncate"
                        title="Efecto de movimiento para la escena seleccionada"
                      >
                        {IMAGE_EFFECTS.map((eff) => (
                          <option key={eff.id} value={eff.id}>
                            {eff.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Eliminar clip */}
                  <button
                    onClick={handleDeleteActiveClip}
                    disabled={clips.length === 0}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400 border border-slate-700 transition disabled:opacity-40"
                    title="Eliminar escena seleccionada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Añadir clip */}
                  <button
                    onClick={() => handleAddClip()}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1 transition active:scale-95 shadow-sm"
                    title="Añadir nueva escena al final"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

              {/* CONTENEDOR MULTI-PISTA CON REGLA Y PLAYHEAD */}
              <div
                ref={timelineRef}
                onMouseDown={handleStartScrubbing}
                onTouchStart={handleStartScrubbing}
                className="relative bg-slate-950/90 rounded-xl p-2.5 border border-slate-800 cursor-ew-resize select-none space-y-2 overflow-hidden"
              >
                {/* 1. Regla de Tiempo (Segundos 0s, 2s, 4s...) */}
                <div className="relative h-4 border-b border-slate-800 flex items-center text-[9px] font-mono text-slate-500 pointer-events-none">
                  {Array.from({ length: Math.ceil(totalClipsDuration) + 1 }).map((_, sec) => {
                    if (sec % 2 === 0 || sec === Math.ceil(totalClipsDuration)) {
                      const leftPercent = (sec / totalClipsDuration) * 100;
                      if (leftPercent > 100) return null;
                      return (
                        <div
                          key={sec}
                          className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                          style={{ left: `${leftPercent}%` }}
                        >
                          <span>{sec}s</span>
                          <div className="w-px h-1 bg-slate-700 mt-0.5" />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* 2. PISTA DE VIDEO (Clips con miniaturas proporcionales y tiradores de ancho) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Film className="w-3 h-3 text-sky-400" />
                      <span>Pista de Video ({clips.length} escenas)</span>
                    </span>
                    <span className="text-sky-400 text-[10px]">
                      Arrastra el borde derecho de cualquier escena para cambiar su ancho
                    </span>
                  </div>

                  <div className="flex w-full h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 gap-1 p-1">
                    {clips.length === 0 ? (
                      <div className="flex-1 flex items-center justify-between px-4 py-2 bg-slate-950/70 rounded-lg border border-dashed border-slate-700">
                        <div className="flex items-center space-x-2">
                          <Film className="w-4 h-4 text-sky-400" />
                          <span className="text-xs text-slate-300 font-medium">
                            📺 Modo Noticia Pura (Sin fotos): el video y la locución duran {targetDuration}s completos con gráficos de TV.
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddClip()}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Poner Foto</span>
                        </button>
                      </div>
                    ) : (
                      clips.map((clip, idx) => {
                        const clipWidthPercent = (clip.duration / totalClipsDuration) * 100;
                        const isSelected = activeClipIndex === idx;
                        return (
                          <div
                            key={clip.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveClipIndex(idx);
                              let accum = 0;
                              for (let i = 0; i < idx; i++) accum += clips[i].duration;
                              setCurrentTime(accum);
                              drawFrame(accum / totalClipsDuration);
                            }}
                            style={{ width: `${clipWidthPercent}%` }}
                            className={`relative h-full rounded-lg overflow-hidden border-2 transition cursor-pointer flex-shrink-0 group ${
                              isSelected
                                ? 'border-sky-400 shadow-lg shadow-sky-500/30 z-10'
                                : 'border-slate-700 hover:border-slate-500 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {clip.mediaType === 'video' ? (
                              <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                                <video src={clip.url} className="w-full h-full object-cover" muted playsInline />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Film className="w-4 h-4 text-white/90 drop-shadow" />
                                </div>
                              </div>
                            ) : (
                              <img src={clip.url} alt={clip.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                            <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] font-bold text-sky-300 truncate max-w-[70%] pointer-events-none flex items-center space-x-1">
                              <span>{clip.mediaType === 'video' ? '🎥' : '📸'}</span>
                              <span>{idx + 1}. {clip.name}</span>
                            </div>

                            {/* Botón de eliminar escena */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClipByIndex(idx);
                              }}
                              className="absolute top-1 right-1 p-1 bg-black/85 hover:bg-red-600 rounded text-slate-300 hover:text-white transition shadow z-20"
                              title="Eliminar esta escena"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>

                            <div className="absolute bottom-1 right-2 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-amber-400 pointer-events-none">
                              {clip.duration.toFixed(1)}s
                            </div>

                            {/* Tirador en borde derecho para poner la escena más angosta o más ancha arrastrando */}
                            <div
                              onMouseDown={(e) => handleStartResizeClip(e, idx)}
                              className="absolute top-0 bottom-0 right-0 w-2.5 bg-sky-500/70 hover:bg-sky-400 cursor-ew-resize flex items-center justify-center z-20 group-hover:opacity-100 transition shadow"
                              title="Arrastra para alargar o poner más angosta esta escena"
                            >
                              <div className="w-0.5 h-4 bg-white rounded-full" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. PISTA DE SUBTÍTULOS (Subtitles CapCut sincronizados con la voz) */}
                <div className="space-y-0.5 pointer-events-none">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span>Subtítulos en voz ({effectiveAudioDuration.toFixed(1)}s)</span>
                    </span>
                    <span className="text-[9px] text-red-400 font-mono">Cierre: Viral CTA</span>
                  </div>

                  <div className="flex w-full h-5 rounded-lg overflow-hidden bg-slate-900/60 border border-slate-800 gap-0.5 p-0.5">
                    <div
                      style={{ width: `${Math.min(100, (effectiveAudioDuration / totalClipsDuration) * 100)}%` }}
                      className="h-full flex gap-0.5"
                    >
                      {subtitleChunks.map((chunk, i) => (
                        <div
                          key={i}
                          style={{ width: `${(1 / subtitleChunks.length) * 100}%` }}
                          className="h-full rounded bg-yellow-500/25 border border-yellow-500/40 flex items-center justify-center text-[7.5px] font-bold text-yellow-300 truncate px-1"
                        >
                          {chunk}
                        </div>
                      ))}
                    </div>
                    {totalClipsDuration > effectiveAudioDuration && (
                      <div
                        style={{ width: `${Math.max(0, 100 - (effectiveAudioDuration / totalClipsDuration) * 100)}%` }}
                        className="h-full rounded bg-red-600/30 border border-red-500/50 flex items-center justify-center text-[7.5px] font-bold text-red-300 truncate px-1"
                      >
                        🚨 COMPARTE
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. PISTA DE AUDIO (Música de fondo + Narrador en off) */}
                <div className="space-y-0.5 pointer-events-none">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Music className="w-3 h-3 text-emerald-400" />
                      <span>Audio: {activeNarrator.name}</span>
                    </span>
                    <span className="text-emerald-400 text-[8px] font-mono">Banda Sonora TV</span>
                  </div>

                  <div className="w-full h-5 rounded-lg overflow-hidden bg-emerald-950/30 border border-emerald-800/40 flex items-center px-2 space-x-1">
                    {Array.from({ length: 44 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-emerald-500/60 rounded-full"
                        style={{ height: `${20 + ((i * 11) % 75)}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* 5. CABEZAL DE REPRODUCCIÓN (PLAYHEAD ROJO CAPCUT INTERACTIVO) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-30"
                  style={{
                    left: `${(currentTime / totalClipsDuration) * 100}%`,
                    transition: isScrubbing ? 'none' : 'left 60ms linear',
                  }}
                >
                  <div
                    onMouseDown={handleStartScrubbing}
                    onTouchStart={handleStartScrubbing}
                    className="w-4 h-4 bg-red-500 rounded-b-md transform -translate-x-[7px] shadow-lg shadow-red-500/80 flex items-center justify-center cursor-ew-resize pointer-events-auto"
                    title="Arrastra el cursor para moverte por el video"
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Asignar foto o video al clip activo */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <span>Multimedia de la <span className="text-sky-400 font-bold">Escena {activeClipIndex + 1}</span>:</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">
                      {clips[activeClipIndex]?.mediaType === 'video' ? '🎥 Modo Video' : '📸 Modo Foto'}
                    </span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sky-300 hover:text-white bg-sky-900/60 hover:bg-sky-800 border border-sky-600/60 px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 text-xs transition shadow"
                      title="Sube una foto o video MP4/WebM desde tu dispositivo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto o Video</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,video/mp4,video/webm,video/quicktime"
                      onChange={handleUploadFile}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Selector de Pestañas: Fotos vs Videos */}
                <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMediaTab('photos')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                      mediaTab === 'photos'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>📸 Fotos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaTab('videos')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                      mediaTab === 'videos'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>🎥 Videos ({searchResults.filter((r) => r.mediaType === 'video').length})</span>
                  </button>
                </div>

                {/* Contenido Pestaña FOTOS */}
                {mediaTab === 'photos' && (
                  <div className="space-y-2">
                    {/* Buscador de fotos en internet */}
                    <form onSubmit={handleSearchImages} className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar fotos en internet (ej. Mike Tyson, Bogotá)..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                      >
                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>Buscar</span>
                      </button>
                    </form>

                    {/* Resultados de fotos */}
                    {searchResults.filter((r) => r.mediaType !== 'video').length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                          <span>Fotos de la noticia y web:</span>
                          <span className="text-sky-400">{searchResults.filter((r) => r.mediaType !== 'video').length} fotos</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                          {searchResults.filter((r) => r.mediaType !== 'video').map((item, i) => (
                            <div
                              key={i}
                              onClick={() => handleSelectMediaForActiveClip(item.url, 'image')}
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

                    {/* Galería de fotos sugeridas */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {draft?.imageUrl && (
                        <div
                          onClick={() =>
                            handleSelectMediaForActiveClip(
                              `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`,
                              'image'
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
                          onClick={() => handleSelectMediaForActiveClip(url, 'image')}
                          className="aspect-video rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-sky-400 transition"
                          title="Foto temática sugerida"
                        >
                          <img src={url} alt={`Stock ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenido Pestaña VIDEOS */}
                {mediaTab === 'videos' && (
                  <div className="space-y-2 bg-slate-900/70 p-2.5 rounded-xl border border-rose-900/40 text-xs">
                    {/* Videos detectados de la noticia */}
                    {searchResults.filter((r) => r.mediaType === 'video').length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[10px] text-rose-300 font-bold block">
                          🎥 Videos detectados en la noticia (clic para asignar):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {searchResults.filter((r) => r.mediaType === 'video').map((vItem, vi) => (
                            <div
                              key={vi}
                              onClick={() => handleSelectMediaForActiveClip(vItem.url, 'video')}
                              className="p-2 rounded-xl bg-slate-800 border border-rose-600/50 hover:border-rose-400 cursor-pointer transition space-y-1 group"
                            >
                              <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                                <video src={vItem.url} className="w-full h-full object-cover" muted />
                                <Film className="w-5 h-5 text-rose-400 absolute drop-shadow" />
                              </div>
                              <div className="text-[10px] text-slate-200 font-semibold truncate">
                                {vItem.title || `Video ${vi + 1}`}
                              </div>
                              <div className="text-[9px] text-rose-400 font-bold">Usar en Escena {activeClipIndex + 1} →</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-center space-y-1">
                        <Film className="w-6 h-6 text-slate-400 mx-auto" />
                        <div className="text-slate-300 font-semibold text-xs">No se detectó video embebido en el enlace oficial</div>
                        <div className="text-slate-400 text-[10px]">Puedes subir un video desde tu PC o pegar su enlace directo abajo.</div>
                      </div>
                    )}

                    {/* Pegar URL directa de video MP4 */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <label className="text-[10px] text-slate-300 font-medium block">
                        O pega la URL directa de un video (.mp4 / .webm):
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          value={customVideoUrl}
                          onChange={(e) => setCustomVideoUrl(e.target.value)}
                          placeholder="https://servidor.com/video_noticia.mp4"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customVideoUrl.trim()) return;
                            handleSelectMediaForActiveClip(customVideoUrl.trim(), 'video');
                            setCustomVideoUrl('');
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow"
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edición Rápida de Cintillo Inferior y Titular (Editables) */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2.5">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Type className="w-4 h-4 text-red-400" />
                  <span>Cintillo Rojo Inferior y Titular (100% Editables)</span>
                </span>
                <span className="text-[10px] text-red-400 font-semibold">
                  Personaliza los textos que se ven en el video
                </span>
              </label>

              {/* Cintillo Rojo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    <span>Cintillo Rojo Inferior:</span>
                  </span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTicker}
                      onChange={(e) => {
                        setShowTicker(e.target.checked);
                        drawFrame(currentTime / totalClipsDuration);
                      }}
                      className="accent-red-600 rounded"
                    />
                    <span className="text-[10px] text-slate-300 font-normal">Mostrar en el video</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={tickerText}
                  onChange={(e) => {
                    setTickerText(e.target.value);
                    drawFrame(currentTime / totalClipsDuration);
                  }}
                  placeholder="CONFIRMADA • NOTICIA DE ÚLTIMA HORA • COMPARTE ESTE VIDEO..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Titular Editable con Contador de Caracteres para YouTube Shorts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Titular en Pantalla:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-mono font-bold ${customTitle.length > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {customTitle.length}/65 {customTitle.length <= 65 ? '✓ Óptimo Shorts' : '⚠️ Muy largo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTitle(formatShortViralTitle(draft?.title || title || ''));
                        drawFrame(currentTime / totalClipsDuration);
                      }}
                      className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                      title="Optimiza y corta automáticamente a longitud viral de Shorts (50-65 caracteres)"
                    >
                      Auto-ajustar Shorts
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    drawFrame(currentTime / totalClipsDuration);
                  }}
                  placeholder="Titular corto de impacto..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 4. Estilo de Subtítulos CapCut */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Estilo de Subtítulos CapCut</span>
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

            {/* 5. Control de Audio de la Locución */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <span>Audio de la Locución</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Audio limpio sin ruidos ni zumbidos
                </span>
              </label>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Volumen del Narrador ({activeNarrator.name}):</span>
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

            {/* 6. Botón de Exportación Directa */}
            <div className="pt-1 space-y-2">
              {publishNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
                  <span className="font-semibold">{publishNotice}</span>
                  <button
                    onClick={() => setPublishNotice(null)}
                    className="text-emerald-400 hover:text-white text-xs font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-pink-600/30 transition transform active:scale-98 disabled:opacity-50 text-sm"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      Renderizando {durationMode === 'youtube_15' ? 'Short (15s)' : 'Reel'} con Audio...{' '}
                      {recordProgress}%
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>
                      {exportedBlob
                        ? '1. Descargar Copia en MP4'
                        : `Generar y Descargar ${durationMode === 'youtube_15' ? 'YouTube Short (15s)' : 'Reel de Facebook (MP4)'}`}
                    </span>
                  </>
                )}
              </button>

              {/* Panel de Publicación a Redes (YouTube Shorts & Facebook) */}
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>Publicar en Redes Sociales</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    YouTube Shorts & Facebook Reels
                  </span>
                </div>

                {/* Subida Directa a Canal de YouTube Conectado */}
                {youtubeChannels.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Publicar a tu Canal de YouTube Shorts</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-red-600/30 text-red-300 rounded font-semibold">
                        Vía YouTube Data API v3
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                      <div className="text-[11px] text-slate-300 flex-1 w-full">
                        <select
                          value={selectedYtChannelId}
                          onChange={(e) => setSelectedYtChannelId(e.target.value)}
                          className="w-full bg-slate-900 border border-red-700/60 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          {youtubeChannels.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.channelTitle} (ID: {c.channelId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleOpenYouTubeStudio}
                          className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md"
                          title="Descarga el video MP4 listo y abre YouTube Studio con el título copiado para monetizar 100%"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Subir en Studio (1 Clic)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handlePublishToYouTubeDirect}
                          disabled={isPublishingToYt}
                          className="w-full sm:w-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-red-500/30 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5 shadow"
                          title="Sube automáticamente a tu canal como Privado vía API"
                        >
                          {isPublishingToYt ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Subiendo API...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-red-400" />
                              <span>Subir vía API</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {youtubeChannels.length === 0 && (
                  <div className="pt-1 border-t border-slate-700/60 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-red-400 block">Subir Short a YouTube</span>
                      <span className="text-[10px] text-slate-400">
                        Sube tu video directo a YouTube Studio con 1 clic (monetización activa) o vincula tu canal en "Cuentas / Páginas".
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleOpenYouTubeStudio}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Subir en Studio</span>
                      </button>
                      <a
                        href="/pages"
                        target="_blank"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700"
                      >
                        Vincular API
                      </a>
                    </div>
                  </div>
                )}

                {/* Subida Directa a Fan Page Conectada (100% Automático) */}
                {facebookPages.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>100% Automático: Publicar a tu Fan Page de Facebook</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600/30 text-emerald-300 rounded font-semibold">
                        Vía Meta API (Sin descargas)
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                      <div className="text-[11px] text-slate-300 flex-1 w-full">
                        <select
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageId(e.target.value)}
                          className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          {facebookPages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.pageName} (ID: {p.pageId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handlePublishToFacebookPage}
                        disabled={isPublishingToFb}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md flex-shrink-0"
                      >
                        {isPublishingToFb ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Subiendo automáticamente a Facebook...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Publicar Reel Automático</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {facebookPages.length === 0 && (
                  <div className="pt-1 border-t border-slate-700/60 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-bold text-amber-300 block">¿Quieres publicación 100% automática a Facebook?</span>
                      <span className="text-[10px] text-slate-400">
                        Conecta tu Página de Facebook en el menú "Páginas" con Meta API para publicar Reels sin abrir pestañas ni arrastrar archivos.
                      </span>
                    </div>
                    <a
                      href="/pages"
                      target="_blank"
                      className="ml-2 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow"
                    >
                      Conectar Página
                    </a>
                  </div>
                )}

                {/* Subida Asistida con 1-Clic para YouTube y Perfiles Personales */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-slate-400">
                    <span>Subida Asistida (Descarga automática del MP4 + copia de textos listos):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* YouTube Shorts */}
                    <button
                      onClick={handlePublishYouTubeShorts}
                      className="p-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-white text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-red-600 text-white">
                          <Youtube className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold flex items-center space-x-1">
                            <span>Subir a YouTube Shorts</span>
                            <ExternalLink className="w-3 h-3 text-red-400 opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="text-[10px] text-slate-400">Descarga MP4 + abre YouTube Studio</div>
                        </div>
                      </div>
                    </button>

                    {/* Facebook Reels (Perfil Personal) */}
                    <button
                      onClick={handleOpenFacebookReelsPersonal}
                      className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-white text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold flex items-center space-x-1">
                            <span>FB Reels (Perfil Personal)</span>
                            <ExternalLink className="w-3 h-3 text-blue-400 opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="text-[10px] text-slate-400">Descarga MP4 + abre Creador de Reels</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Compartir a apps */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>¿Estás en tu celular o tablet?</span>
                  <button
                    onClick={handleShareNative}
                    className="text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir a TikTok / Instagram / WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="mt-2 text-center space-y-0.5">
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Línea de tiempo real + Herramienta Dividir + Audio incrustado</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Totalmente responsivo para YouTube Shorts y Facebook Reels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
