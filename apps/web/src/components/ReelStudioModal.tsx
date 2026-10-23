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
  Share2,
  ExternalLink,
  Send,
  Scissors,
  Maximize2,
  MoveVertical,
  Sliders,
  ArrowLeftRight,
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

// Estructura de Clip para la Línea de Tiempo estilo CapCut
export interface TimelineClip {
  id: string;
  url: string;
  duration: number; // en segundos
  transition: 'zoom_in' | 'zoom_out' | 'pan_right' | 'pan_left';
  name: string;
  scale?: number; // 0.5 a 2.5 (1.0 default)
  offsetY?: number; // -180 a 180 (mover arriba/abajo en canvas)
  offsetX?: number; // -150 a 150 (mover izquierda/derecha en canvas)
  fitMode?: 'cover' | 'contain';
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

  // Narrador seleccionado
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
    const charLimit = durationMode === 'youtube_15' ? 240 : durationMode === 'reels_30' ? 520 : 1200;
    const spokenBody = cleanPureBody.slice(0, charLimit);
    const fullText = `${cleanPureTitle}. ${spokenBody}`;
    const words = fullText.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks.length > 0 ? chunks : [cleanPureTitle];
  }, [cleanPureTitle, cleanPureBody, durationMode]);

  // Detección de imágenes sugeridas
  const categoryKey = detectThemeCategory(`${cleanPureTitle} ${cleanPureBody}`);
  const suggestedStock = THEMATIC_IMAGES[categoryKey] || THEMATIC_IMAGES['colombia_actualidad'];

  const initialMainImage = draft?.imageUrl && draft.imageUrl.startsWith('http')
    ? `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`
    : suggestedStock[0];

  // LÍNEA DE TIEMPO MULTI-PISTA (CLIPS ESTILO CAPCUT)
  const [clips, setClips] = useState<TimelineClip[]>([
    {
      id: 'clip_1',
      url: initialMainImage,
      duration: Math.round((targetDuration / 3) * 10) / 10,
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
      duration: Math.round((targetDuration / 3) * 10) / 10,
      transition: 'pan_right',
      name: 'Escena 2 (B-Roll)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
    {
      id: 'clip_3',
      url: suggestedStock[2] || suggestedStock[0],
      duration: Math.round((targetDuration - (targetDuration / 3) * 2) * 10) / 10,
      transition: 'zoom_out',
      name: 'Escena 3 (Cierre)',
      scale: 1.0,
      offsetY: 0,
      offsetX: 0,
      fitMode: 'cover',
    },
  ]);

  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const clipsSum = clips.reduce((acc, c) => acc + c.duration, 0);
  // La duración del video NUNCA se limita ni se reduce por debajo del objetivo aunque se eliminen imágenes
  const totalClipsDuration = clips.length > 0
    ? Math.max(targetDuration, clipsSum)
    : targetDuration;

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
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

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

  // Cargar páginas de Facebook disponibles
  useEffect(() => {
    fetch('/api/pages')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFacebookPages(data);
          setSelectedPageId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Precargar imágenes de todos los clips
  useEffect(() => {
    loadedImagesRef.current = [];
    clips.forEach((clip, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.url;
      img.onload = () => {
        loadedImagesRef.current[idx] = img;
        if (idx === activeClipIndex) drawFrame(currentTime / totalClipsDuration);
      };
      img.onerror = () => {
        if (suggestedStock[idx]) {
          img.src = suggestedStock[idx];
        }
      };
    });
    drawFrame(currentTime / totalClipsDuration);
  }, [clips]);

  // Cambiar modo de formato y recalcular duraciones proporcionales
  const handleSelectDurationMode = (mode: 'youtube_15' | 'reels_30' | 'reels_60') => {
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

  // 3. Cambiar efecto de cámara (Ken Burns)
  const handleChangeTransition = (tr: 'zoom_in' | 'zoom_out' | 'pan_right' | 'pan_left') => {
    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = { ...updated[activeClipIndex], transition: tr };
      }
      return updated;
    });
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
      if (remaining.length === 0) {
        return [];
      }
      // Re-distribuir la duración de las escenas restantes para que sumen el targetDuration
      const equalSec = parseFloat((targetDuration / remaining.length).toFixed(1));
      return remaining.map((c) => ({
        ...c,
        duration: Math.max(1.0, equalSec),
      }));
    });
    setActiveClipIndex((prev) => Math.max(0, Math.min(prev, clips.length - 2)));
    setPublishNotice('✓ Escena eliminada. Duración ajustada al tiempo completo.');
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
    setClips((prev) => {
      const updated = [...prev, newClip];
      const equalSec = parseFloat((targetDuration / updated.length).toFixed(1));
      return updated.map((c) => ({
        ...c,
        duration: Math.max(1.0, equalSec),
      }));
    });
    setActiveClipIndex(clips.length);
    setPublishNotice('✓ Nueva escena añadida.');
  };

  // 6. Cambiar foto del clip activo
  const handleSelectImageForActiveClip = (url: string) => {
    setClips((prev) => {
      const updated = [...prev];
      if (updated[activeClipIndex]) {
        updated[activeClipIndex] = { ...updated[activeClipIndex], url };
      }
      return updated;
    });
  };

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

  // Subir archivo desde PC
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleSelectImageForActiveClip(dataUrl);
      }
    };
    reader.readAsDataURL(file);
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
    drawFrame(percent);

    // Auto-seleccionar el clip activo bajo el cursor
    let accum = 0;
    for (let i = 0; i < clips.length; i++) {
      accum += clips[i].duration;
      if (newTime <= accum || i === clips.length - 1) {
        setActiveClipIndex(i);
        break;
      }
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
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const onMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaSec = (deltaX / rect.width) * totalClipsDuration;
      const newDur = Math.max(0.6, Math.min(35, parseFloat((startDur + deltaSec).toFixed(1))));
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
  const setupAudioGraph = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // Voz en off del narrador limpia y nítida
      if (voiceVolume > 0) {
        // Adaptar la cantidad de texto al formato de duración para que no se quede mudo antes de tiempo
        const charLimit = durationMode === 'youtube_15' ? 240 : durationMode === 'reels_30' ? 520 : 1200;
        const textToSpeak = `${cleanPureTitle}. ${cleanPureBody.slice(0, charLimit)}`;
        const ttsUrl = `/api/media/tts?text=${encodeURIComponent(textToSpeak.slice(0, 300))}&lang=${activeNarrator.lang}&t=${Date.now()}`;
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

  // DIBUJAR FRAME (720x1280 Vertical 9:16)
  const drawFrame = (progress: number) => {
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
      const end = accum + clips[i].duration;
      if (currentSec >= accum && currentSec <= end) {
        activeIdx = i;
        clipStartSec = accum;
        break;
      }
      accum = end;
    }
    if (currentSec >= accum && clips.length > 0) {
      activeIdx = clips.length - 1;
      clipStartSec = accum - clips[activeIdx].duration;
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

      const img = loadedImagesRef.current[activeIdx];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        const clipScale = currentClip?.scale || 1.0;
        const clipOffsetX = currentClip?.offsetX || 0;
        const clipOffsetY = currentClip?.offsetY || 0;

        let zoom = 1.08 * clipScale;
        let panX = clipOffsetX;
        let panY = clipOffsetY;

        const transition = currentClip?.transition || 'zoom_in';
        if (transition === 'zoom_in') {
          zoom = (1.05 + clipProgress * 0.14) * clipScale;
        } else if (transition === 'zoom_out') {
          zoom = (1.19 - clipProgress * 0.12) * clipScale;
        } else if (transition === 'pan_right') {
          zoom = 1.14 * clipScale;
          panX += (clipProgress - 0.5) * 60;
        } else if (transition === 'pan_left') {
          zoom = 1.14 * clipScale;
          panX += (0.5 - clipProgress) * 60;
        }

        ctx.translate(width / 2 + panX, height * 0.42 + panY);
        ctx.scale(zoom, zoom);
        ctx.translate(-(width / 2 + panX), -(height * 0.42 + panY));

        const aspect = img.naturalWidth / img.naturalHeight;
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
        ctx.drawImage(img, (width - drawW) / 2 + panX, panY, drawW, drawH);
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

    // 3. BARRA SUPERIOR DE TV EN VIVO
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
      durationMode === 'youtube_15' ? 'NOTICIAS AL INSTANTE' : 'EN VIVO • NOTICIAS COLOMBIA',
      65,
      50
    );

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${timeStr} COT`, width - 35, 50);
    ctx.restore();

    // 4. INDICADOR DE ESCENA / CORTE
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

    // 5. TITULAR EN LETRAS GRANDES DE ALTO IMPACTO (Limpio, sin emojis distorsionados)
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

    // 6. SUBTÍTULOS ANIMADOS ESTILO CAPCUT VIRAL
    ctx.save();
    ctx.textAlign = 'center';

    const activeSubtitleIndex = Math.min(
      Math.floor(progress * subtitleChunks.length),
      subtitleChunks.length - 1
    );
    const rawSubtitle = (subtitleChunks[activeSubtitleIndex] || '').toUpperCase();

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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillText(rawSubtitle, width / 2, textY);
    }
    ctx.restore();

    // 7. CINTILLO / TICKER INFERIOR
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

    // 8. BARRA DE PROGRESO INFERIOR
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
    startTimeRef.current = performance.now() - currentTime * 1000;
    const totalMs = totalClipsDuration * 1000;

    const loop = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / totalMs, 1);
      const curSec = progress * totalClipsDuration;

      setCurrentTime(curSec);
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
        setExportedBlob(blob);

        const a = document.createElement('a');
        a.href = url;
        const prefix = durationMode === 'youtube_15' ? 'Short_15s' : 'Reel';
        const cleanName = cleanPureTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `${prefix}_${cleanName}.mp4`;
        a.click();
        setPublishNotice('✓ ¡Video renderizado y descargado! Ya puedes publicarlo directo en YouTube Shorts o Facebook.');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      const totalMs = totalClipsDuration * 1000;
      const startTime = performance.now();

      const recordLoop = (currentTimeMs: number) => {
        const elapsed = currentTimeMs - startTime;
        const progress = Math.min(elapsed / totalMs, 1);

        setCurrentTime(progress * totalClipsDuration);
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

  // 1. Subir a YouTube Shorts (1-Clic)
  const handlePublishYouTubeShorts = async () => {
    const ytTitle = `${cleanPureTitle.slice(0, 80)} #Shorts #Noticias #Tendencias`;
    const ytDesc = `${cleanPureTitle}\n\n${cleanPureBody}\n\n🚨 Noticias de última hora. Síguenos para más información.\n\n#Shorts #Noticias #Colombia #Viral`;
    try {
      await navigator.clipboard.writeText(`${ytTitle}\n\n${ytDesc}`);
      setPublishNotice('✓ ¡Título y etiquetas de YouTube Shorts copiados! Abriendo panel de subida de YouTube...');
    } catch {}

    window.open('https://www.youtube.com/upload', '_blank');
  };

  // 2. Publicar directamente a Página de Facebook conectada (Vía Meta Graph API)
  const handlePublishToFacebookPage = async () => {
    if (!selectedPageId) {
      alert('Debes tener al menos una página de Facebook conectada en la sección Páginas.');
      return;
    }
    if (!exportedBlob) {
      alert('Primero haz clic en "Generar / Descargar Video" para preparar el Reel con audio.');
      return;
    }

    setIsPublishingToFb(true);
    setPublishNotice(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(exportedBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const res = await fetch(`/api/pages/${selectedPageId}/publish-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cleanPureTitle.slice(0, 100),
            description: `${cleanPureTitle}\n\n${cleanPureBody}\n\n#Noticias #Reels #EnVivo #Colombia`,
            videoBase64: base64data,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setPublishNotice(`🎉 ¡Reel publicado exitosamente en "${data.pageName}" en Facebook sin necesidad de descargar!`);
        } else {
          alert('Error de Facebook: ' + (data.message || 'Error publicando'));
        }
        setIsPublishingToFb(false);
      };
    } catch (err: any) {
      alert('Error: ' + err.message);
      setIsPublishingToFb(false);
    }
  };

  // 3. Abrir Creador de Reels de Facebook (Para Perfil Personal)
  const handleOpenFacebookReelsPersonal = async () => {
    try {
      await navigator.clipboard.writeText(`${cleanPureTitle}\n\n${cleanPureBody}\n\n#Noticias #Reels`);
      setPublishNotice('✓ ¡Texto copiado en el portapapeles! Abriendo el Creador de Reels de Facebook...');
    } catch {}
    window.open('https://www.facebook.com/reels/create', '_blank');
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

            {/* Controles de Tamaño y Encuadre en Canvas */}
            {clips.length > 0 ? (
              <div className="w-full max-w-[280px] bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 mt-3 space-y-2.5 text-xs shadow-lg">
                <div className="flex items-center justify-between text-slate-200 font-bold text-xs pb-1 border-b border-slate-700/60">
                  <span className="flex items-center space-x-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tamaño en Canvas ({clips[activeClipIndex]?.name || `Escena ${activeClipIndex + 1}`})</span>
                  </span>
                  <button
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
              </div>
            ) : (
              <div className="w-full max-w-[280px] bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 mt-3 space-y-2 text-xs shadow-lg text-center">
                <div className="text-slate-300 font-bold">📺 Modo Noticia Pura</div>
                <div className="text-[10px] text-slate-400">Sin imágenes de fondo. El video transmite la noticia completa con locución y gráficos de TV.</div>
                <button
                  onClick={() => handleAddClip()}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow"
                >
                  + Añadir Foto
                </button>
              </div>
            )}
          </div>

          {/* COLUMNA 2: HERRAMIENTAS MINI CAPCUT */}
          <div className="lg:col-span-7 space-y-3.5">
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

                  {/* Efecto de cámara / Ken Burns */}
                  {clips.length > 0 && (
                    <select
                      value={clips[activeClipIndex]?.transition || 'zoom_in'}
                      onChange={(e) => handleChangeTransition(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-300 focus:outline-none"
                      title="Efecto de cámara"
                    >
                      <option value="zoom_in">🔍 Zoom In</option>
                      <option value="zoom_out">🔎 Zoom Out</option>
                      <option value="pan_right">➡️ Paneo Der</option>
                      <option value="pan_left">⬅️ Paneo Izq</option>
                    </select>
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
                            <img src={clip.url} alt={clip.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                            <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] font-bold text-sky-300 truncate max-w-[65%] pointer-events-none">
                              {idx + 1}. {clip.name}
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

                {/* 3. PISTA DE SUBTÍTULOS (Subtitles CapCut) */}
                <div className="space-y-0.5 pointer-events-none">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span>Subtítulos Virales CapCut</span>
                    </span>
                  </div>

                  <div className="flex w-full h-5 rounded-lg overflow-hidden bg-slate-900/60 border border-slate-800 gap-0.5 p-0.5">
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

              {/* Asignar foto al clip activo */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">
                    Cambiar imagen de la <span className="text-sky-400 font-bold">Escena {activeClipIndex + 1}</span>:
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

                {/* Buscador de fotos en internet */}
                <form onSubmit={handleSearchImages} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar fotos en internet (ej. Mike Tyson, Netflix, Bogotá)..."
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
                      <span>Resultados de internet (clic para asignar a Escena {activeClipIndex + 1}):</span>
                      <span className="text-sky-400">{searchResults.length} fotos</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                      {searchResults.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectImageForActiveClip(item.url)}
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
                        handleSelectImageForActiveClip(
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
                      onClick={() => handleSelectImageForActiveClip(url)}
                      className="aspect-video rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:border-sky-400 transition"
                    >
                      <img src={url} alt={`Stock ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
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

              {/* Panel de Publicación Rápida a Redes (YouTube Shorts & Facebook) */}
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>Montar Directamente en Redes Sociales</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    1-Clic • Sin descargas manuales
                  </span>
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
                        <div className="text-[10px] text-slate-400">Copia título + abre YouTube Studio</div>
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
                        <div className="text-[10px] text-slate-400">Copia texto + abre Creador de Reels</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Subida Directa a Fan Page Conectada */}
                {facebookPages.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-700/60 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <div className="text-[11px] text-slate-300 flex-1 w-full">
                      <span className="font-semibold block mb-0.5">O publicar directo a tu Fan Page:</span>
                      <select
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
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
                      disabled={isPublishingToFb || !exportedBlob}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md flex-shrink-0"
                    >
                      {isPublishingToFb ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Subiendo a Facebook...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar Reel sin Descargar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

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
