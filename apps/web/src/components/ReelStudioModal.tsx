import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface ReelStudioModalProps {
  draft: any;
  title: string;
  body: string;
  onClose: () => void;
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.05);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [theme, setTheme] = useState<'breaking' | 'modern' | 'minimal'>('breaking');
  const [includeAudio, setIncludeAudio] = useState(true);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(15); // segundos estimados
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Limpiar texto para locución y subtítulos
  const cleanTitle = (title || draft?.title || '')
    .replace(/^Actualidad:\s*/i, '')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const cleanBody = (body || draft?.body || '')
    .replace(/^De acuerdo con la información reportada por [^,]+,\s*/i, '')
    .replace(/\.\.\s*Los detalles continúan bajo seguimiento editorial\./i, '.')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  // Dividir cuerpo en frases para subtítulos dinámicos sincronizados
  const sentences = cleanBody
    .split(/(?<=[.?!,])\s+/)
    .filter((s) => s.trim().length > 0);

  // Cargar voces en español del navegador
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(
          (v) => v.lang.startsWith('es') || v.lang.includes('Spanish')
        );
        const finalVoices = spanishVoices.length > 0 ? spanishVoices : voices;
        setAvailableVoices(finalVoices);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Precargar imagen de la noticia
  useEffect(() => {
    if (draft?.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = draft.imageUrl;
      img.onload = () => {
        imageElementRef.current = img;
        drawFrame(0);
      };
      img.onerror = () => {
        // Fallback si la imagen no permite CORS
        imageElementRef.current = null;
        drawFrame(0);
      };
    } else {
      drawFrame(0);
    }

    return () => {
      stopPlayback();
    };
  }, [draft, theme]);

  // Dibujar un frame del video 9:16 (720x1280) en el Canvas
  const drawFrame = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width; // 720
    const height = canvas.height; // 1280

    // 1. FONDO
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Fondo degradado dinámico según tema
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    if (theme === 'breaking') {
      bgGradient.addColorStop(0, '#1e1b4b');
      bgGradient.addColorStop(0.5, '#0f172a');
      bgGradient.addColorStop(1, '#1e293b');
    } else if (theme === 'modern') {
      bgGradient.addColorStop(0, '#0c4a6e');
      bgGradient.addColorStop(0.6, '#082f49');
      bgGradient.addColorStop(1, '#020617');
    } else {
      bgGradient.addColorStop(0, '#18181b');
      bgGradient.addColorStop(1, '#09090b');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. IMAGEN REAL CON EFECTO CINEMATOGRÁFICO (Ken Burns zoom y paneo)
    const img = imageElementRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      // Efecto Ken Burns: zoom suave de 1.0 a 1.15
      const zoom = 1.0 + progress * 0.15;
      const panY = Math.sin(progress * Math.PI) * 15;

      const imgH = 680;
      const imgY = 220;

      // Clip contenedor para la imagen con esquinas redondeadas
      ctx.beginPath();
      ctx.rect(30, imgY, width - 60, imgH);
      ctx.clip();

      ctx.translate(width / 2, imgY + imgH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -(imgY + imgH / 2));

      // Dibujar imagen cubriendo el área
      const aspect = img.naturalWidth / img.naturalHeight;
      const drawW = width - 60;
      const drawH = drawW / aspect;
      ctx.drawImage(img, 30, imgY + (imgH - drawH) / 2 + panY, drawW, drawH);
      ctx.restore();

      // Borde y sombra suave para la imagen
      ctx.strokeStyle = theme === 'breaking' ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, imgY, width - 60, imgH);
    } else {
      // Si no hay foto, tarjeta gráfica periodística
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(30, 220, width - 60, 680);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOTICIA EN DESARROLLO', width / 2, 560);
    }

    // 3. CABECERA: BADGE "ÚLTIMA HORA"
    ctx.save();
    const badgeY = 90;
    // Píldora de cabecera
    ctx.fillStyle = theme === 'breaking' ? '#dc2626' : '#0284c7';
    ctx.beginPath();
    ctx.roundRect(40, badgeY, 320, 52, 26);
    ctx.fill();

    // Punto rojo parpadeante
    ctx.fillStyle = progress % 0.2 < 0.1 ? '#ffffff' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(70, badgeY + 26, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ÚLTIMA HORA • COLOMBIA', 95, badgeY + 34);

    // Fuente oficial en esquina derecha
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(draft?.sourceAttribution || 'Medio Oficial', width - 40, badgeY + 34);
    ctx.restore();

    // 4. TITULAR DE ALTO IMPACTO (Overlay superior/central)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 36px system-ui, sans-serif';

    // Función simple de wrap de texto
    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testWidth = ctx.measureText(currentLine + ' ' + word).width;
        if (testWidth < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // Fondo oscuro detrás del titular para 100% legibilidad
    const titleLines = wrapText(cleanTitle, width - 100).slice(0, 3);
    const titleBoxH = titleLines.length * 48 + 30;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(30, 930 - titleBoxH, width - 60, titleBoxH, 18);
    ctx.fill();

    // Texto del titular con color llamativo
    ctx.fillStyle = theme === 'breaking' ? '#fde047' : '#ffffff';
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, 930 - titleBoxH + 46 + idx * 48);
    });
    ctx.restore();

    // 5. SUBTÍTULOS ANIMADOS TIPO TIKTOK/REELS (Frases sincronizadas)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 10;

    const currentSentenceIdx = Math.min(
      Math.floor(progress * (sentences.length || 1)),
      sentences.length - 1
    );
    const activeSubtitle = sentences[currentSentenceIdx] || cleanBody.slice(0, 120);
    const subLines = wrapText(activeSubtitle, width - 120).slice(0, 2);

    // Caja para subtítulo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(40, 980, width - 80, 110, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, sans-serif';
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, 1025 + idx * 38);
    });
    ctx.restore();

    // 6. BARRA DE PROGRESO INFERIOR (Estilo Reel)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, height - 12, width, 12);
    ctx.fillStyle = theme === 'breaking' ? '#ef4444' : '#38bdf8';
    ctx.fillRect(0, height - 12, width * progress, 12);

    // 7. PIE CON HASHTAGS
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#NoticiasColombia • #Tendencia • #UltimaHora', width / 2, 1180);
  };

  // Reproducir en tiempo real (Preview)
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    setDownloadUrl(null);
    startTimeRef.current = performance.now();

    // Iniciar locución por voz
    if (includeAudio && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${cleanTitle}. ${cleanBody}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = voiceSpeed;
      if (availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    const durationMs = 14000 / voiceSpeed;

    const loop = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // GENERAR Y EXPORTAR VIDEO MP4 / WEBM REAL
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
      // Capturar stream de video a 30fps
      const stream = canvas.captureStream(30);

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3500000, // Alta calidad 3.5 Mbps
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRecording(false);

        // Descarga automática instantánea
        const a = document.createElement('a');
        a.href = url;
        const cleanName = cleanTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `Reel_${cleanName}.mp4`;
        a.click();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      // Reproducir voz sincronizada mientras graba
      if (includeAudio && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToSpeak = `${cleanTitle}. ${cleanBody}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = voiceSpeed;
        if (availableVoices[selectedVoiceIndex]) {
          utterance.voice = availableVoices[selectedVoiceIndex];
        }
        window.speechSynthesis.speak(utterance);
      }

      const totalDuration = 12000 / voiceSpeed;
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
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }
      };

      requestAnimationFrame(recordLoop);
    } catch (err: any) {
      console.error('Error generando video:', err);
      alert('Error al generar video en el navegador: ' + err.message);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl text-white space-y-5 my-8">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <span>Estudio de Video Reels para Facebook</span>
                <span className="text-[10px] bg-pink-500/20 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-500/30">
                  9:16 Vertical
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Convierte esta noticia en un Reel viral con foto real, titular y subtítulos
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

        {/* Contenido en dos columnas: Vista previa + Ajustes */}
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

              {/* Botón flotante Play/Pause */}
              <button
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition opacity-0 hover:opacity-100 disabled:opacity-0"
              >
                <div className="w-14 h-14 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg transform hover:scale-110 transition">
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </div>
              </button>
            </div>

            {/* Controles rápidos de reproducción */}
            <div className="flex items-center space-x-3 mt-3">
              <button
                onClick={handleTogglePlay}
                disabled={isRecording}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition"
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

          {/* Columna Derecha: Parámetros y Exportación */}
          <div className="md:col-span-7 space-y-4">
            {/* Tema visual */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Estilo Visual del Reel</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'breaking', label: '🔴 Última Hora', desc: 'Rojo + Amarillo' },
                  { id: 'modern', label: '🔵 Noticias Pro', desc: 'Azul + Blanco' },
                  { id: 'minimal', label: '⚪ Minimalista', desc: 'Oscuro elegante' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id as any)}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      theme === th.id
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{th.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{th.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuración de Voz y Locución */}
            <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Locución de Voz (IA del Sistema)</span>
                </label>
                <button
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition ${
                    includeAudio
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {includeAudio ? 'Voz Activada ✓' : 'Silenciado'}
                </button>
              </div>

              {includeAudio && (
                <div className="space-y-2 pt-1 text-xs">
                  {availableVoices.length > 0 && (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Voz seleccionada:
                      </label>
                      <select
                        value={selectedVoiceIndex}
                        onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {availableVoices.map((v, idx) => (
                          <option key={v.name + idx} value={idx}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Velocidad de narración:</span>
                    <span className="font-bold text-blue-400">{voiceSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.85"
                    max="1.3"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Botón de exportación / descarga */}
            <div className="pt-2">
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-pink-600/30 transition transform active:scale-98 disabled:opacity-50 text-sm"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generando Reel... {recordProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Descargar Video Reel (MP4) para Facebook</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-2">
                ⚡ El video se genera en alta resolución (720x1280) directo en tu navegador listo para subir a Facebook Reels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
