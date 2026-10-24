import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  CheckCircle2,
  Sparkles,
  Send,
  Image as ImageIcon,
  Sliders,
  Type,
  ExternalLink,
  Loader2,
  RefreshCw,
  MoveVertical,
  Maximize2,
  Eye,
  Check,
} from 'lucide-react';
import api from '../api/client';

interface ViralPhotoModalProps {
  draft: any;
  title: string;
  body: string;
  onClose: () => void;
  onMarkPublished?: () => void;
}

export const ViralPhotoModal: React.FC<ViralPhotoModalProps> = ({
  draft,
  title: initialTitle,
  body: initialBody,
  onClose,
  onMarkPublished,
}) => {
  // Estados de texto en la imagen (Tarjeta Viral)
  const [headline, setHeadline] = useState(
    (initialTitle || draft?.title || '').replace(/^Actualidad:\s*/i, '').trim()
  );
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('🔴 ÚLTIMA HORA');
  const [tickerText, setTickerText] = useState(
    `📌 FUENTE: ${draft?.sourceAttribution || 'Noticias'} • COMPARTE ESTA NOTICIA`
  );
  const [showBadge, setShowBadge] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showTicker, setShowTicker] = useState(true);

  // Estados visuales y de diseño
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>('1:1'); // 1:1 Cuadrado o 4:5 Vertical
  const [fontSize, setFontSize] = useState(48); // 38 a 64
  const [strokeWidth, setStrokeWidth] = useState(10); // 6 a 16
  const [imageScale, setImageScale] = useState(1.0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [bannerTheme, setBannerTheme] = useState<'red' | 'dark' | 'yellow' | 'blue'>('red');

  // Estados del Copy / Descripción de la publicación
  const [postCaption, setPostCaption] = useState('');
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Estados de Páginas de Facebook y publicación
  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [isPublishingPage, setIsPublishingPage] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  // Referencias del Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  // Generar copy viral optimizado para Facebook
  const generateViralCopy = (t: string, b: string, src: string, url: string) => {
    const cleanT = t.replace(/^Actualidad:\s*/i, '').trim();
    const cleanB = b
      .replace(/<\/?p>/g, '')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Extraer frases clave
    const sentences = cleanB
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 10);
    const hook = sentences.slice(0, 2).join(' ') || cleanB.slice(0, 220);
    const details = sentences.slice(2, 4).join(' ');

    return `🚨 ${cleanT} 🚨\n\n👉 ${hook}\n\n${details ? `📌 Puntos clave:\n• ${details}\n\n` : ''}💬 ¿Qué opinas de esta situación? Déjanos tu opinión en los comentarios 👇\n📲 Comparte esta noticia para que tus amigos y familiares estén enterados.\n\n📌 Fuente oficial: ${src || 'Noticias'}\n🔗 Información verificada: ${url || ''}\n\n#Noticias #UltimaHora #Tendencia #Colombia #Viral #Actualidad`;
  };

  // Inicializar copy viral
  useEffect(() => {
    const initialCopy = generateViralCopy(
      headline,
      initialBody || draft?.body || '',
      draft?.sourceAttribution || '',
      draft?.sourceUrl || ''
    );
    setPostCaption(initialCopy);

    // Si la noticia tiene un resumen breve, usarlo de subtítulo sugerido
    const sentences = (initialBody || draft?.body || '')
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 15);
    if (sentences.length > 0) {
      setSubtitle(sentences[0].slice(0, 95));
    }
  }, []);

  // Cargar páginas de Facebook disponibles
  useEffect(() => {
    api
      .get('/pages')
      .then((res) => {
        const pages = res.data || [];
        setFacebookPages(pages);
        if (pages.length > 0) {
          setSelectedPageId(pages[0].id);
        }
      })
      .catch((err) => console.warn('Error cargando páginas de Facebook:', err));
  }, []);

  // Cargar imagen de la noticia en memoria con fallback CORS
  useEffect(() => {
    const rawUrl = draft?.imageUrl;
    if (!rawUrl) return;

    const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      renderCanvas();
    };
    img.onerror = () => {
      // Fallback a imagen periodística confiable
      const fallbackImg = new window.Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => {
        loadedImageRef.current = fallbackImg;
        renderCanvas();
      };
      fallbackImg.src =
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
    };
    img.src = proxyUrl;
  }, [draft?.imageUrl]);

  // Re-dibujar canvas cuando cambie cualquier parámetro visual
  useEffect(() => {
    renderCanvas();
  }, [
    headline,
    subtitle,
    badgeText,
    tickerText,
    showBadge,
    showSubtitle,
    showTicker,
    aspectRatio,
    fontSize,
    strokeWidth,
    imageScale,
    imageOffsetY,
    imageOffsetX,
    bannerTheme,
  ]);

  // Función principal de renderizado en Canvas con LETRAS BLANCAS Y TRAZO NEGRO
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensiones en alta resolución
    const width = 1080;
    const height = aspectRatio === '1:1' ? 1080 : 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Fondo negro base
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    // 2. Dibujar imagen de fondo con escala y posición
    const img = loadedImageRef.current;
    if (img && img.naturalWidth > 0) {
      ctx.save();
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = width / height;

      let drawW: number;
      let drawH: number;

      if (imgRatio > targetRatio) {
        drawH = height * imageScale;
        drawW = drawH * imgRatio;
      } else {
        drawW = width * imageScale;
        drawH = drawW / imgRatio;
      }

      const drawX = (width - drawW) / 2 + imageOffsetX;
      const drawY = (height - drawH) / 2 + imageOffsetY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Placeholder si no ha cargado
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cargando imagen...', width / 2, height / 2);
    }

    // 3. Degradado oscuro inferior para contraste perfecto
    const bottomGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.45)');
    bottomGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.85)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Degradado oscuro superior para badge
    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.22);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.22);

    // 5. Badge Superior (Ej. 🔴 ÚLTIMA HORA / NOTICIA VIRAL)
    if (showBadge && badgeText.trim()) {
      ctx.save();
      const badgeY = 56;
      ctx.font = '900 28px Inter, -apple-system, Arial Black, sans-serif';
      const textMetrics = ctx.measureText(badgeText.toUpperCase());
      const pillW = textMetrics.width + 48;
      const pillH = 50;
      const pillX = (width - pillW) / 2;

      // Color del badge según tema
      let badgeBg = '#dc2626'; // Rojo por defecto
      if (bannerTheme === 'blue') badgeBg = '#2563eb';
      if (bannerTheme === 'yellow') badgeBg = '#eab308';
      if (bannerTheme === 'dark') badgeBg = '#0f172a';

      // Fondo del Badge
      ctx.fillStyle = badgeBg;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(pillX, badgeY, pillW, pillH, 25);
      ctx.fill();

      // Borde sutil del Badge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto del Badge
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = bannerTheme === 'yellow' ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText.toUpperCase(), width / 2, badgeY + pillH / 2);
      ctx.restore();
    }

    // 6. Cintillo Inferior Rojo / Informativo
    const tickerH = 58;
    const tickerY = height - tickerH;
    if (showTicker && tickerText.trim()) {
      ctx.save();
      let tickerBg = '#b91c1c'; // Rojo oscuro periodístico
      if (bannerTheme === 'blue') tickerBg = '#1d4ed8';
      if (bannerTheme === 'dark') tickerBg = '#0f172a';
      if (bannerTheme === 'yellow') tickerBg = '#ca8a04';

      ctx.fillStyle = tickerBg;
      ctx.fillRect(0, tickerY, width, tickerH);

      // Franja brillante superior del cintillo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, tickerY, width, 2);

      // Texto del Cintillo
      ctx.font = 'bold 22px Inter, -apple-system, sans-serif';
      ctx.fillStyle = bannerTheme === 'yellow' ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tickerText, width / 2, tickerY + tickerH / 2);
      ctx.restore();
    }

    // 7. TITULAR VIRAL EN LA FOTO CON LETRAS BLANCAS Y TRAZO NEGRO
    ctx.save();
    const effectiveBottomY = showTicker ? tickerY - 24 : height - 40;
    const maxTextWidth = width - 110;

    // Partir el titular en líneas que quepan perfectamente
    ctx.font = `900 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
    const words = headline.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Partir subtítulo si está activo
    const subLines: string[] = [];
    const subFontSize = Math.max(26, Math.round(fontSize * 0.52));
    if (showSubtitle && subtitle.trim()) {
      ctx.font = `bold ${subFontSize}px Inter, -apple-system, sans-serif`;
      const subWords = subtitle.split(' ');
      let curSub = '';
      for (const w of subWords) {
        const testSub = curSub ? `${curSub} ${w}` : w;
        if (ctx.measureText(testSub).width > maxTextWidth && curSub) {
          subLines.push(curSub);
          curSub = w;
        } else {
          curSub = testSub;
        }
      }
      if (curSub) subLines.push(curSub);
    }

    // Calcular altura total del bloque de texto para centrarlo verticalmente en la zona inferior
    const lineHeight = fontSize * 1.14;
    const totalTitleH = lines.length * lineHeight;
    const subLineHeight = subFontSize * 1.25;
    const totalSubH = subLines.length * subLineHeight;
    const spacingBetween = subLines.length > 0 ? 18 : 0;
    const totalBlockH = totalTitleH + spacingBetween + totalSubH;

    // Posición inicial del bloque
    const startY = effectiveBottomY - totalBlockH + lineHeight / 2;

    // DIBUJAR TITULAR: LETRAS BLANCAS CON TRAZO NEGRO
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;

      // 7.1 Sombra 3D profunda
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      // 7.2 Trazo negro grueso alrededor de cada letra
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, width / 2, y);
      ctx.restore();

      // Segundo pase de trazo para máxima nitidez
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, width / 2, y);

      // 7.3 Relleno blanco brillante
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line, width / 2, y);
    });

    // DIBUJAR SUBTÍTULO / BAJADA (si está activa)
    if (subLines.length > 0) {
      ctx.font = `bold ${subFontSize}px Inter, -apple-system, sans-serif`;
      const subStartY = startY + totalTitleH + spacingBetween;

      subLines.forEach((sLine, idx) => {
        const y = subStartY + idx * subLineHeight;

        // Trazo negro
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(6, Math.round(strokeWidth * 0.6));
        ctx.strokeText(sLine, width / 2, y);

        // Color amarillo viral o blanco
        ctx.fillStyle = '#FACC15'; // Amarillo llamativo para subtítulo
        ctx.fillText(sLine, width / 2, y);
      });
    }

    ctx.restore();
  };

  // Manejadores para arrastrar imagen dentro del canvas con mouse o touch
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: imageOffsetX,
      origY: imageOffsetY,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    setImageOffsetX(dragStartPosRef.current.origX + dx * 1.8);
    setImageOffsetY(dragStartPosRef.current.origY + dy * 1.8);
  };

  const endDrag = () => {
    isDraggingRef.current = false;
  };

  // Copiar Copy Viral al portapapeles
  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(postCaption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = postCaption;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  // Descargar imagen generada en JPEG de alta calidad
  const handleDownloadPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `noticia_viral_${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setPublishNotice('✓ Foto viral descargada en tu computadora.');
  };

  // COMPARTIR EN FACEBOOK (Foto + Copy Automático)
  const handleShareToFacebook = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Copiar siempre la descripción viral al portapapeles
    await handleCopyCaption();

    // 2. Intentar Web Share API con archivo nativo
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );

      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], 'noticia_viral.jpg', { type: 'image/jpeg' });
        const shareData = {
          files: [file],
          title: headline,
          text: postCaption,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setPublishNotice('✓ ¡Compartido en Facebook exitosamente con la foto y el copy!');
          if (onMarkPublished) onMarkPublished();
          return;
        }
      }
    } catch (e: any) {
      console.warn('Web Share API no soportó compartir archivo directo:', e);
    }

    // 3. Fallback inteligente: Descargar foto automáticamente + abrir Facebook
    handleDownloadPhoto();
    setPublishNotice(
      '✓ Foto descargada y copy viral copiado. Se abrió Facebook: solo pega (Ctrl+V) la descripción y arrastra la foto descargada.'
    );
    window.open('https://www.facebook.com', '_blank');
    if (onMarkPublished) onMarkPublished();
  };

  // PUBLICAR 100% AUTOMÁTICO EN FAN PAGE DE FACEBOOK (Meta Graph API)
  const handlePublishDirectToFanPage = async () => {
    if (!selectedPageId) {
      alert('Debes seleccionar o vincular una Página de Facebook en la sección Páginas.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsPublishingPage(true);
    setPublishNotice('⏳ Renderizando foto con letras blancas y trazo negro...');

    try {
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.95);

      setPublishNotice('⏳ Subiendo automáticamente a tu Página de Facebook vía Meta API...');
      const res = await api.post(`/meta/${selectedPageId}/publish-photo`, {
        caption: postCaption,
        photoBase64,
      });

      if (res.data?.success) {
        setPublishNotice(
          `🎉 ¡Foto publicada 100% automático en "${res.data.pageName}" con su descripción completa!`
        );
        if (onMarkPublished) onMarkPublished();
      } else {
        alert('Error publicando en Facebook: ' + (res.data?.message || 'Error desconocido'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      alert('Error de Facebook: ' + msg);
    } finally {
      setIsPublishingPage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl text-white space-y-4 my-auto max-h-[96vh] overflow-y-auto">
        {/* Cabecera del Creador de Fotos Virales */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                <span>Creador de Foto Noticia Viral para Facebook</span>
                <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Letras Blancas + Trazo Negro + Copy Automático
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Formato feed 1:1 de alto impacto visual. La descripción y la foto quedan listas para publicar en 1 clic.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de Éxito / Estado */}
        {publishNotice && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between animate-fade-in shadow-lg">
            <span className="font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{publishNotice}</span>
            </span>
            <button
              onClick={() => setPublishNotice(null)}
              className="text-emerald-400 hover:text-white text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Layout en 2 Columnas: Visualizador de Tarjeta + Suite de Publicación */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUMNA 1: PREVISUALIZADOR DE LA FOTO VIRAL (Canvas) */}
          <div className="lg:col-span-6 flex flex-col items-center space-y-3">
            {/* Contenedor del Lienzo Canvas */}
            <div className="relative w-full max-w-[380px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black cursor-grab active:cursor-grabbing select-none group">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] text-slate-300 pointer-events-none opacity-0 group-hover:opacity-100 transition">
                Arrastra para encuadrar foto
              </div>
            </div>

            {/* Controles de Diseño y Encuadre */}
            <div className="w-full max-w-[380px] bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 space-y-2.5 text-xs shadow-md">
              <div className="flex items-center justify-between text-slate-200 font-bold pb-1 border-b border-slate-700/60 text-[11px]">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ajustes de Letra y Foto</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      aspectRatio === '1:1'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    1:1 Feed
                  </button>
                  <button
                    onClick={() => setAspectRatio('4:5')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      aspectRatio === '4:5'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    4:5 Vertical
                  </button>
                </div>
              </div>

              {/* Slider de Tamaño de Letra */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Tamaño de Titular:</span>
                  <span className="font-mono text-sky-400 font-bold">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="62"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Slider de Grosor de Trazo Negro */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Grosor de Trazo Negro:</span>
                  <span className="font-mono text-amber-400 font-bold">{strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="16"
                  step="1"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Zoom y Posición de la Foto */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>Zoom Foto:</span>
                    <span className="text-sky-400 font-mono">{Math.round(imageScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.2"
                    step="0.05"
                    value={imageScale}
                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>Mover Vertical:</span>
                    <span className="text-amber-400 font-mono">{imageOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="10"
                    value={imageOffsetY}
                    onChange={(e) => setImageOffsetY(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Selector de Color de Tema */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                <span className="text-[10px] text-slate-400 font-semibold">Color de Cinta:</span>
                <div className="flex items-center space-x-1.5">
                  {[
                    { id: 'red', color: '#dc2626', label: 'Rojo' },
                    { id: 'blue', color: '#2563eb', label: 'Azul' },
                    { id: 'yellow', color: '#eab308', label: 'Amarillo' },
                    { id: 'dark', color: '#0f172a', label: 'Negro' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBannerTheme(t.id as any)}
                      className={`w-5 h-5 rounded-full border-2 transition ${
                        bannerTheme === t.id ? 'border-white scale-110' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: t.color }}
                      title={t.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: COPY VIRAL Y BOTONES DE PUBLICACIÓN */}
          <div className="lg:col-span-6 space-y-3.5">
            {/* 1. Edición del Titular sobre la Foto */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  <span>Titular Estampado en la Foto (Letras Blancas con Trazo)</span>
                </span>
                <span className="text-[10px] text-slate-400">{headline.length} caracteres</span>
              </label>
              <textarea
                rows={2}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold"
                placeholder="Titular viral corto y directo..."
              />
            </div>

            {/* 2. Etiqueta Superior y Cintillo */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-slate-300">
                    <span>Badge Superior:</span>
                    <input
                      type="checkbox"
                      checked={showBadge}
                      onChange={(e) => setShowBadge(e.target.checked)}
                      className="accent-red-600 rounded"
                    />
                  </div>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold text-slate-300">
                    <span>Cintillo Inferior:</span>
                    <input
                      type="checkbox"
                      checked={showTicker}
                      onChange={(e) => setShowTicker(e.target.checked)}
                      className="accent-red-600 rounded"
                    />
                  </div>
                  <input
                    type="text"
                    value={tickerText}
                    onChange={(e) => setTickerText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              {/* Botones de Insignias Rápidas */}
              <div className="flex flex-wrap gap-1 pt-1">
                {['🔴 ÚLTIMA HORA', '⚡ NOTICIA VIRAL', '📢 CONFIRMADA', '🚨 ALERTA'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setBadgeText(tag);
                      setShowBadge(true);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DESCRIPCIÓN VIRAL PARA LA PUBLICACIÓN (COPY AUTOMÁTICO) */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-blue-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Descripción de la Publicación (Copy Automático para Facebook)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setPostCaption(
                        generateViralCopy(
                          headline,
                          initialBody || draft?.body || '',
                          draft?.sourceAttribution || '',
                          draft?.sourceUrl || ''
                        )
                      )
                    }
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                    title="Regenerar con la plantilla viral"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerar</span>
                  </button>
                  <button
                    onClick={handleCopyCaption}
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded-lg font-semibold flex items-center space-x-1"
                  >
                    {copiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCaption ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
                placeholder="Escribe la descripción de la publicación..."
              />
              <p className="text-[10px] text-slate-400 italic">
                💡 Este texto se llena automáticamente en Facebook junto a la foto para maximizar comentarios y alcance orgánico.
              </p>
            </div>

            {/* 4. BOTONES DE ACCIÓN Y COMPARTIR EN FACEBOOK */}
            <div className="pt-1 space-y-2.5">
              {/* Botón Principal: Compartir en Facebook (Foto + Copy Automático) */}
              <button
                onClick={handleShareToFacebook}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-blue-600/30 transition transform active:scale-98 text-sm"
              >
                <Share2 className="w-5 h-5" />
                <span>1. Compartir Foto con Copy en Facebook</span>
              </button>

              {/* Subida 100% Automática a Fan Page Conectada */}
              {facebookPages.length > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>100% Automático: Publicar a tu Fan Page de Facebook</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600/30 text-emerald-300 rounded font-semibold">
                      Meta API Oficial
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <div className="text-[11px] text-slate-300 flex-1 w-full">
                      <select
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {facebookPages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.pageName} (ID: {p.pageId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handlePublishDirectToFanPage}
                      disabled={isPublishingPage}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md flex-shrink-0"
                    >
                      {isPublishingPage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subiendo foto a Facebook...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar Directo a la Fan Page</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Botón Auxiliar: Descargar Foto Stamped */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadPhoto}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-700 transition"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Descargar Solo Foto (JPEG HD)</span>
                </button>
                <button
                  onClick={handleCopyCaption}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs border border-slate-700 transition"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>{copiedCaption ? '✓ Copy Copiado' : 'Copiar Solo Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
