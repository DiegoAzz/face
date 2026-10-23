import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Film,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Music,
} from 'lucide-react';

interface ReelStudioModalProps {
  draft: any;
  title: string;
  body: string;
  onClose: () => void;
}

// Catálogo de imágenes periodísticas temáticas ultrarrealistas HD (Unsplash editorial sin royalties)
const THEMATIC_IMAGES: Record<string, string[]> = {
  salud_detox: [
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1080&auto=format&fit=crop&q=80',
  ],
  seguridad_policia: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=1080&auto=format&fit=crop&q=80',
  ],
  colombia_actualidad: [
    'https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1080&auto=format&fit=crop&q=80',
  ],
  deportes: [
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1080&auto=format&fit=crop&q=80',
  ],
  economia: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1080&auto=format&fit=crop&q=80',
  ],
  tecnologia: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1080&auto=format&fit=crop&q=80',
  ],
  bebes_medicina: [
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1080&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1080&auto=format&fit=crop&q=80',
  ],
};

function detectThemeCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('zumo') || lower.includes('detox') || lower.includes('chef') || lower.includes('receta') || lower.includes('comida') || lower.includes('cocina')) {
    return 'salud_detox';
  }
  if (lower.includes('bomba') || lower.includes('atentado') || lower.includes('policía') || lower.includes('seguridad') || lower.includes('crimen') || lower.includes('heridos')) {
    return 'seguridad_policia';
  }
  if (lower.includes('cuatrillizo') || lower.includes('bebé') || lower.includes('embarazo') || lower.includes('nacieron')) {
    return 'bebes_medicina';
  }
  if (lower.includes('fútbol') || lower.includes('deporte') || lower.includes('gol') || lower.includes('ciclismo')) {
    return 'deportes';
  }
  if (lower.includes('dólar') || lower.includes('dolar') || lower.includes('econom') || lower.includes('inflación') || lower.includes('banco')) {
    return 'economia';
  }
  if (lower.includes('ia') || lower.includes('inteligencia artificial') || lower.includes('tecnología') || lower.includes('smartphone')) {
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
  const [theme, setTheme] = useState<'breaking' | 'modern' | 'minimal'>('breaking');
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeVoice, setIncludeVoice] = useState(true);

  // Detección de tema para imágenes de respaldo
  const defaultCategoryKey = detectThemeCategory(`${title} ${body} ${draft?.title}`);
  const fallbackImages = THEMATIC_IMAGES[defaultCategoryKey] || THEMATIC_IMAGES['colombia_actualidad'];

  // URL activa de la imagen
  const [activeImageUrl, setActiveImageUrl] = useState<string>(() => {
    if (draft?.imageUrl && draft.imageUrl.startsWith('http')) {
      return `/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`;
    }
    return fallbackImages[0];
  });

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Limpiar texto para subtítulos y locución
  const cleanTitle = (title || draft?.title || '')
    .replace(/^Actualidad:\s*/i, '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const cleanBody = (body || draft?.body || '')
    .replace(/^De acuerdo con la información reportada por [^,]+,\s*/i, '')
    .replace(/\.\.\s*Los detalles continúan bajo seguimiento editorial\./i, '.')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  // Dividir cuerpo en frases de impacto de 3 a 6 palabras para subtítulos estilo TikTok/Reels
  const subtitleChunks = React.useMemo(() => {
    const words = cleanBody.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    const chunkSize = 4;
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks.length > 0 ? chunks : [cleanBody.slice(0, 80)];
  }, [cleanBody]);

  // Cargar imagen en memoria
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImageUrl;
    img.onload = () => {
      imageElementRef.current = img;
      drawFrame(0);
    };
    img.onerror = () => {
      // Si la URL falla, cargar la primera imagen temática de respaldo
      if (activeImageUrl !== fallbackImages[0]) {
        setActiveImageUrl(fallbackImages[0]);
      }
    };
  }, [activeImageUrl]);

  useEffect(() => {
    drawFrame(0);
    return () => {
      stopPlayback();
    };
  }, [theme]);

  // Subir foto propia
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setActiveImageUrl(url);
    }
  };

  // Sintetizador de audio: Fondo musical de noticias + Voz
  const setupAudioGraph = (isForRecording: boolean = false): MediaStreamTrack[] => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // 1. Sintetizar banda sonora dramática de noticias de televisión
      if (includeMusic) {
        // Oscilador de graves rítmico (Bass pulse)
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(65.41, ctx.currentTime); // C2

        // Pulsación periódica cada 0.6s
        bassGain.gain.setValueAtTime(0.08, ctx.currentTime);
        bassOsc.connect(bassGain);
        bassGain.connect(dest);
        bassGain.connect(ctx.destination);
        bassOsc.start();

        // Shimmer suspense pad
        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        padGain.gain.setValueAtTime(0.04, ctx.currentTime);
        padOsc.connect(padGain);
        padGain.connect(dest);
        padGain.connect(ctx.destination);
        padOsc.start();
      }

      // 2. Conectar audio TTS si está activo
      if (includeVoice) {
        const ttsUrl = `/api/media/tts?text=${encodeURIComponent(cleanTitle.slice(0, 150))}`;
        const audio = new Audio(ttsUrl);
        audio.crossOrigin = 'anonymous';
        audioElementRef.current = audio;

        audio.oncanplay = () => {
          try {
            const source = ctx.createMediaElementSource(audio);
            const voiceGain = ctx.createGain();
            voiceGain.gain.setValueAtTime(0.9, ctx.currentTime);
            source.connect(voiceGain);
            voiceGain.connect(dest);
            voiceGain.connect(ctx.destination);
            audio.play();
          } catch {
            // fallback
            audio.play();
          }
        };

        audio.onerror = () => {
          // Fallback a SpeechSynthesis si la API TTS no responde
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(cleanTitle);
            utt.rate = 1.05;
            window.speechSynthesis.speak(utt);
          }
        };
      }

      return dest.stream.getAudioTracks();
    } catch (err) {
      console.warn('Error configurando audio graph:', err);
      return [];
    }
  };

  // DIBUJAR UN FRAME 9:16 (720x1280) EN EL CANVAS
  const drawFrame = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 720;
    const height = 1280;

    // 1. FONDO COMPLETO CINEMATOGRÁFICO CON FOTO REAL
    const img = imageElementRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      // Efecto Ken Burns de cámara profesional: zoom suave continuo de 1.0 a 1.2 y paneo
      const zoom = 1.05 + progress * 0.15;
      const panX = Math.sin(progress * Math.PI) * 25;
      const panY = -progress * 30;

      ctx.translate(width / 2, height * 0.4);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height * 0.4);

      // Dibujar imagen cubriendo el área superior
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = width;
      let drawH = width / aspect;
      if (drawH < 850) {
        drawH = 850;
        drawW = drawH * aspect;
      }
      ctx.drawImage(img, (width - drawW) / 2 + panX, panY, drawW, drawH);
      ctx.restore();
    } else {
      // Degradado periodístico oscuro si la imagen está cargando
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. DEGRADADO NEGRO CINEMATOGRÁFICO PARA LEGIBILIDAD
    const gradient = ctx.createLinearGradient(0, 300, 0, height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.05)');
    gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.85)');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 3. ENCABEZADO: BARRA DE NOTICIAS EN VIVO DE TELEVISIÓN
    ctx.save();
    // Franja roja superior
    ctx.fillStyle = theme === 'breaking' ? '#dc2626' : '#0284c7';
    ctx.fillRect(0, 0, width, 85);

    // Punto rojo parpadeante (Live Record)
    const isBlink = Math.floor(progress * 25) % 2 === 0;
    ctx.fillStyle = isBlink ? '#ffffff' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(45, 42, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EN VIVO • NOTICIAS COLOMBIA', 70, 50);

    // Reloj digital en vivo
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${timeStr} COT`, width - 35, 50);
    ctx.restore();

    // 4. ETIQUETA DE CATEGORÍA
    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const catLabel = (draft?.source?.category || 'ACTUALIDAD NACIONAL').toUpperCase();
    ctx.fillText(`⚡ ${catLabel}`, 40, 680);
    ctx.restore();

    // 5. TITULAR PRINCIPAL DE ALTO IMPACTO (Overlay en franja)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '900 38px system-ui, sans-serif';

    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let cur = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = cur + ' ' + words[i];
        if (ctx.measureText(test).width < maxWidth) {
          cur = test;
        } else {
          lines.push(cur);
          cur = words[i];
        }
      }
      lines.push(cur);
      return lines;
    };

    const titleLines = wrapText(cleanTitle, width - 80).slice(0, 3);
    titleLines.forEach((line, idx) => {
      // Sombra y contorno para legibilidad suprema
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(line, 40, 735 + idx * 46);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, 40, 735 + idx * 46);
    });
    ctx.restore();

    // 6. SUBTÍTULOS ANIMADOS ESTILO TIKTOK / REELS (Grandes, en amarillo y negro)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 42px system-ui, sans-serif';

    // Determinar frase activa según progreso del video
    const activeIndex = Math.min(
      Math.floor(progress * subtitleChunks.length),
      subtitleChunks.length - 1
    );
    const activeText = (subtitleChunks[activeIndex] || '').toUpperCase();

    // Fondo oscuro translúcido para el subtítulo activo
    const subWidth = Math.min(ctx.measureText(activeText).width + 50, width - 60);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.beginPath();
    ctx.roundRect((width - subWidth) / 2, 930, subWidth, 75, 18);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Texto del subtítulo con brillo amarillo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(activeText, width / 2, 982);
    ctx.fillStyle = '#fde047';
    ctx.fillText(activeText, width / 2, 982);
    ctx.restore();

    // 7. TICKER TAPE / CINTILLO INFERIOR EN MOVIMIENTO CONTINUO
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 1140, width, 55);

    const tickerText = `🚨 ÚLTIMA HORA • FUENTE OFICIAL: ${draft?.sourceAttribution || 'EL TIEMPO'} • INFORMACIÓN EN DESARROLLO • COMPARTE ESTE REEL EN FACEBOOK • SÍGUENOS PARA MÁS NOTICIAS • `;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    // Movimiento fluido de derecha a izquierda
    const textWidth = ctx.measureText(tickerText).width;
    const tickerOffset = (progress * 1500) % textWidth;
    ctx.fillText(tickerText, -tickerOffset, 1175);
    ctx.fillText(tickerText, textWidth - tickerOffset, 1175);
    ctx.restore();

    // 8. BARRA DE PROGRESO INFERIOR
    ctx.fillStyle = '#fde047';
    ctx.fillRect(0, height - 10, width * progress, 10);
  };

  // Preview interactivo
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    startTimeRef.current = performance.now();
    setupAudioGraph(false);

    const totalDuration = 12000;

    const loop = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);

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

  // GRABAR Y EXPORTAR VIDEO CON AUDIO INCLUIDO
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
      // 1. Obtener stream del canvas (video a 30fps)
      const canvasStream = canvas.captureStream(30);

      // 2. Obtener tracks de audio (música + voz)
      const audioTracks = setupAudioGraph(true);

      // 3. Unir video y audio en un solo stream
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
        videoBitsPerSecond: 4000000, // 4 Mbps alta nitidez
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

        // Descarga directa del archivo MP4 con audio y subtítulos
        const a = document.createElement('a');
        a.href = url;
        const cleanName = cleanTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `Reel_${cleanName}.mp4`;
        a.click();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      const totalDuration = 11000;
      const startTime = performance.now();

      const recordLoop = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);

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
      alert('Error exportando video con audio: ' + err.message);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl text-white space-y-5 my-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>Estudio Profesional de Video Reels</span>
                <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Audio + Subtítulos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Video 9:16 vertical con cintillo de TV, subtítulos dinámicos y sonido exportado
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

        {/* Contenido en dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Reproductor Vertical 9:16 */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black">
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
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition opacity-0 hover:opacity-100 disabled:opacity-0"
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

            {/* Controles rápidos */}
            <div className="flex items-center space-x-3 mt-3">
              <button
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pausar' : 'Previsualizar'}</span>
              </button>

              <button
                onClick={() => drawFrame(0)}
                disabled={isRecording}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Reiniciar fotograma"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Columna Derecha: Imágenes Reales Relativas + Audio + Exportar */}
          <div className="md:col-span-7 space-y-4">
            {/* 1. Selector de Imagen Real Relativa a la Noticia */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span>Imagen Periodística Real (Relativa al hecho)</span>
                </label>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Subir otra foto</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Galería de fotos reales recomendadas para esta noticia */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {draft?.imageUrl && (
                  <div
                    onClick={() => setActiveImageUrl(`/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`)}
                    className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                      activeImageUrl.includes(encodeURIComponent(draft.imageUrl))
                        ? 'border-pink-500 scale-95 shadow-md shadow-pink-500/30'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <img
                      src={`/api/media/proxy?url=${encodeURIComponent(draft.imageUrl)}`}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-bold py-0.5 text-white">
                      Original
                    </span>
                  </div>
                )}

                {fallbackImages.map((imgUrl, idx) => (
                  <div
                    key={imgUrl}
                    onClick={() => setActiveImageUrl(imgUrl)}
                    className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition ${
                      activeImageUrl === imgUrl
                        ? 'border-pink-500 scale-95 shadow-md shadow-pink-500/30'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <img src={imgUrl} alt="Relativa" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-bold py-0.5 text-white">
                      Opción {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Audio: Música de Fondo + Voz en Off */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-2.5">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>Audio que se incrusta en el MP4</span>
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setIncludeMusic(!includeMusic)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    includeMusic
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Música de TV</span>
                  </span>
                  <span className="text-[10px]">{includeMusic ? 'ON ✓' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => setIncludeVoice(!includeVoice)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    includeVoice
                      ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Voz Narradora</span>
                  </span>
                  <span className="text-[10px]">{includeVoice ? 'ON ✓' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* 3. Botón de Exportación Directa */}
            <div className="pt-2">
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-pink-600/30 transition transform active:scale-98 disabled:opacity-50 text-sm"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exportando Video con Audio y Subtítulos... {recordProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Descargar Video Reel (MP4) con Audio y Subtítulos</span>
                  </>
                )}
              </button>

              <div className="mt-2 text-center space-y-1">
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Audio integrado (música + voz) + Subtítulos estilo TikTok en el MP4</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  Formato vertical 9:16 listo para publicar directamente en Facebook Reels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
