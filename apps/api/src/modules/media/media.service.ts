import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class MediaService {
  /**
   * Genera locución MP3 cristalina y natural con Google Translate TTS.
   * Divide textos largos en fragmentos y concatena los audios.
   */
  async getTTSAudio(text: string, lang: string = 'es'): Promise<Buffer> {
    const cleanText = text
      .replace(/[#*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return Buffer.from([]);
    }

    // Dividir en ráfagas de máximo 150 caracteres para Google TTS
    const words = cleanText.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).trim().length <= 150) {
        currentChunk = (currentChunk + ' ' + word).trim();
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const buffers: Buffer[] = [];

    for (const chunk of chunks.slice(0, 10)) {
      try {
        const res = await axios.get('https://translate.google.com/translate_tts', {
          params: {
            ie: 'UTF-8',
            q: chunk,
            tl: lang || 'es',
            client: 'tw-ob',
          },
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.data) {
          buffers.push(Buffer.from(res.data));
        }
      } catch (err: any) {
        console.warn(`[TTS] Error en fragmento "${chunk.slice(0, 20)}":`, err.message);
      }
    }

    return Buffer.concat(buffers);
  }

  /**
   * Proxy para evitar restricciones de CORS en imágenes externas en Canvas.
   * Con fallback resiliente para que nunca falle la previsualización del video.
   */
  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 12000,
        headers: {
          'User-Agent':
            'NewsFlowBot/1.0 (Mozilla/5.0 Windows NT 10.0; Win64; x64; contact@newsflow.app)',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      return {
        buffer: Buffer.from(res.data),
        contentType: String(res.headers['content-type'] || 'image/jpeg'),
      };
    } catch (err: any) {
      console.warn(`[ProxyImage] Error descargando ${url}: ${err.message}. Retornando imagen alternativa segura.`);
      // Devolver una imagen HD periodística confiable en lugar de fallar con 502
      try {
        const fallbackUrl = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&auto=format&fit=crop&q=80';
        const fbRes = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 8000 });
        return {
          buffer: Buffer.from(fbRes.data),
          contentType: 'image/jpeg',
        };
      } catch {
        throw new Error(`Error descargando imagen externa: ${err.message}`);
      }
    }
  }

  /**
   * Transcodifica cualquier video de navegador a MP4 estándar H.264 + AAC + faststart
   * para asegurar que YouTube, Facebook, WhatsApp y reproductores locales lo procesen al 100%.
   */
  async fixVideo(videoBase64: string): Promise<{ base64: string; mimeType: string }> {
    const rawBuffer = Buffer.from(videoBase64, 'base64');
    if (rawBuffer.length === 0) {
      throw new Error('Video vacío');
    }

    const tmpDir = os.tmpdir();
    const id = `fix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = path.join(tmpDir, `${id}_in.bin`);
    const outputPath = path.join(tmpDir, `${id}_out.mp4`);

    try {
      await fs.promises.writeFile(inputPath, rawBuffer);

      // Detectar si el video de entrada contiene pista de audio
      const hasAudio = await new Promise<boolean>((resolve) => {
        const probe = spawn('ffprobe', [
          '-v', 'error',
          '-select_streams', 'a',
          '-show_entries', 'stream=codec_name',
          '-of', 'csv=p=0',
          inputPath,
        ]);
        let out = '';
        probe.stdout?.on('data', (d) => (out += d.toString()));
        probe.on('close', () => resolve(out.trim().length > 0));
        probe.on('error', () => resolve(false));
      });

      const ffmpegArgs = [
        '-y',
        '-err_detect', 'ignore_err',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts+discardcorrupt',
        '-i', inputPath,
      ];

      if (!hasAudio) {
        ffmpegArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
      }

      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-g', '60',
        '-keyint_min', '30',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-shortest',
        '-movflags', '+faststart',
        outputPath
      );

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';
        proc.stderr?.on('data', (d) => {
          stderr += d.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg error (código ${code}): ${stderr.slice(-300)}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

      const convertedBuffer = await fs.promises.readFile(outputPath);
      if (convertedBuffer && convertedBuffer.length > 1000) {
        return {
          base64: convertedBuffer.toString('base64'),
          mimeType: 'video/mp4',
        };
      }
    } catch (err: any) {
      console.warn('[MediaService] FFmpeg no disponible o falló en fixVideo:', err.message);
    } finally {
      try { await fs.promises.unlink(inputPath); } catch {}
      try { await fs.promises.unlink(outputPath); } catch {}
    }

    // Fallback: retornar original si FFmpeg no estuvo disponible
    const isWebM =
      rawBuffer.length >= 4 &&
      rawBuffer[0] === 0x1a &&
      rawBuffer[1] === 0x45 &&
      rawBuffer[2] === 0xdf &&
      rawBuffer[3] === 0xa3;

    return {
      base64: videoBase64,
      mimeType: isWebM ? 'video/webm' : 'video/mp4',
    };
  }

  /**
   * Extrae los términos y entidades clave de un titular periodístico largo para búsquedas precisas.
   * Por ejemplo: "Piden oraciones por Laura Bozzo tras complicaciones de salud..." -> "Laura Bozzo"
   */
  private extractSearchKeywords(query: string): string {
    if (!query) return '';
    const stopWords = new Set([
      'piden', 'oraciones', 'tras', 'complicaciones', 'que', 'mantienen', 'por', 'su',
      'pronta', 'recuperacion', 'recuperación', 'noticia', 'noticias', 'al', 'del', 'los',
      'las', 'con', 'para', 'una', 'uno', 'este', 'esta', 'sobre', 'mas', 'más', 'pero',
      'como', 'fue', 'fueron', 'deja', 'revelan', 'confirman', 'alerta', 'urgente',
      'en', 'de', 'el', 'la', 'y', 'a', 'hospitalizada', 'muere', 'fallece', 'video',
      'fotos', 'dice', 'afirman', 'anuncia', 'mira', 'última', 'hora', 'colombia'
    ]);

    const words = query.replace(/[^\w\sÁÉÍÓÚáéíóúñÑ]/g, ' ').split(/\s+/).filter(Boolean);
    
    // Si hay nombres propios en mayúscula (ej: Laura Bozzo, Gustavo Petro)
    const capitalized = words.filter(
      (w) => /^[A-ZÁÉÍÓÚ]/.test(w) && !stopWords.has(w.toLowerCase()) && w.length > 2
    );
    if (capitalized.length >= 2) {
      return capitalized.slice(0, 3).join(' ');
    }

    const meaningful = words.filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));
    if (meaningful.length > 0) {
      return meaningful.slice(0, 3).join(' ');
    }

    return query.slice(0, 40).trim();
  }

  /**
   * Búsqueda de imágenes en línea libres de derechos, optimizada para noticias y personajes.
   */
  async searchImages(query: string): Promise<{ url: string; thumbUrl: string; title: string }[]> {
    if (!query || !query.trim()) return [];

    const cleanQuery = this.extractSearchKeywords(query) || query.trim();
    const results: { url: string; thumbUrl: string; title: string }[] = [];
    const seenUrls = new Set<string>();

    // 1. Buscar en Wikipedia / Wikimedia Commons API
    try {
      const searchRes = await axios.get('https://es.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: cleanQuery,
          gsrlimit: 10,
          prop: 'pageimages',
          piprop: 'thumbnail|original',
          pithumbsize: 800,
          format: 'json',
          origin: '*',
        },
        timeout: 7000,
      });

      const pages = searchRes.data?.query?.pages || {};
      for (const key of Object.keys(pages)) {
        const page = pages[key];
        const originalUrl = page.original?.source || page.thumbnail?.source;
        const thumbUrl = page.thumbnail?.source || originalUrl;
        if (
          originalUrl &&
          !seenUrls.has(originalUrl) &&
          (originalUrl.endsWith('.jpg') ||
            originalUrl.endsWith('.jpeg') ||
            originalUrl.endsWith('.png') ||
            originalUrl.endsWith('.webp'))
        ) {
          seenUrls.add(originalUrl);
          results.push({
            url: `/api/media/proxy?url=${encodeURIComponent(originalUrl)}`,
            thumbUrl: `/api/media/proxy?url=${encodeURIComponent(thumbUrl)}`,
            title: page.title || cleanQuery,
          });
        }
      }
    } catch {}

    // 2. Buscar en Unsplash API pública para variedad fotográfica
    if (results.length < 4) {
      try {
        const unsplashRes = await axios.get('https://unsplash.com/napi/search/photos', {
          params: {
            query: cleanQuery,
            per_page: 8,
          },
          timeout: 7000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        const unsplashResults = unsplashRes.data?.results || [];
        for (const item of unsplashResults) {
          const imgUrl = item.urls?.regular || item.urls?.full;
          const thumb = item.urls?.small || item.urls?.thumb;
          if (imgUrl && !seenUrls.has(imgUrl)) {
            seenUrls.add(imgUrl);
            results.push({
              url: `/api/media/proxy?url=${encodeURIComponent(imgUrl)}`,
              thumbUrl: `/api/media/proxy?url=${encodeURIComponent(thumb)}`,
              title: item.alt_description || cleanQuery,
            });
          }
          if (results.length >= 8) break;
        }
      } catch {}
    }

    if (results.length > 0) return results;

    // Fallback variado si no hay resultados
    return [
      {
        url: `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&auto=format&fit=crop&q=80`,
        thumbUrl: `https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80`,
        title: query,
      },
      {
        url: `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080&auto=format&fit=crop&q=80`,
        thumbUrl: `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80`,
        title: query,
      },
    ];
  }

  /**
   * Extrae y genera automáticamente 4 o más imágenes frescas relacionadas para una noticia:
   * 1. Extrae todas las fotos reales del artículo original (OpenGraph, Twitter cards, cuerpo del artículo).
   * 2. Si faltan para 4, busca imágenes en línea usando los personajes y temas clave del titular.
   * 3. Garantiza que todas las imágenes estén proxificadas y listas para usar en la línea de tiempo.
   */
  async getNewsImages(params: {
    url?: string;
    title?: string;
    imageUrl?: string;
  }): Promise<{ url: string; thumbUrl: string; title: string; source: string }[]> {
    const images: { url: string; thumbUrl: string; title: string; source: string }[] = [];
    const seenUrls = new Set<string>();

    const addImage = (rawUrl: string, imgTitle: string, srcLabel: string) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const cleanUrl = rawUrl.trim();
      if (!cleanUrl.startsWith('http')) return;

      const lower = cleanUrl.toLowerCase();
      if (
        lower.endsWith('.svg') ||
        lower.includes('logo') ||
        lower.includes('avatar') ||
        lower.includes('icon') ||
        lower.includes('spacer') ||
        lower.includes('pixel') ||
        lower.includes('spinner') ||
        lower.includes('banner_ad') ||
        lower.includes('doubleclick')
      ) {
        return;
      }

      if (seenUrls.has(cleanUrl)) return;
      seenUrls.add(cleanUrl);

      const proxyUrl = cleanUrl.startsWith('/api/media/proxy')
        ? cleanUrl
        : `/api/media/proxy?url=${encodeURIComponent(cleanUrl)}`;

      images.push({
        url: proxyUrl,
        thumbUrl: proxyUrl,
        title: imgTitle || params.title || 'Foto de la noticia',
        source: srcLabel,
      });
    };

    // 1. Añadir la imagen principal del borrador
    if (params.imageUrl) {
      addImage(params.imageUrl, params.title || 'Foto principal', 'Artículo oficial');
    }

    // 2. Extraer fotos reales del artículo web
    if (params.url && params.url.startsWith('http')) {
      try {
        const articleRes = await axios.get(params.url, {
          timeout: 6000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          maxContentLength: 800000,
        });

        const html = typeof articleRes.data === 'string' ? articleRes.data : '';
        const baseUrl = params.url;

        // Metatags de imagen
        const metaMatches = [
          ...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi),
          ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']/gi),
        ];
        for (const m of metaMatches) {
          if (m[1]) {
            try {
              const fullUrl = new URL(m[1], baseUrl).href;
              addImage(fullUrl, params.title || 'Foto de portada', 'Portada del artículo');
            } catch {}
          }
        }

        // Fotos dentro del cuerpo del artículo
        const imgMatches = [
          ...html.matchAll(/<figure[^>]*>[\s\S]*?<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["']/gi),
          ...html.matchAll(/<article[^>]*>[\s\S]*?<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["']/gi),
          ...html.matchAll(/<img[^>]+(?:src|data-src|data-original)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi),
        ];

        for (const m of imgMatches) {
          if (m[1]) {
            try {
              const fullUrl = new URL(m[1], baseUrl).href;
              addImage(fullUrl, params.title || 'Escena de la noticia', 'Cuerpo del artículo');
            } catch {}
          }
          if (images.length >= 8) break;
        }
      } catch (err: any) {
        console.warn('No se pudo extraer imágenes de la URL de la noticia:', err.message);
      }
    }

    // 3. Buscar fotos adicionales en la web si hay menos de 4
    if (images.length < 4 && params.title) {
      try {
        const searchResults = await this.searchImages(params.title);
        for (const item of searchResults) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            images.push({
              url: item.url,
              thumbUrl: item.thumbUrl,
              title: item.title,
              source: 'Búsqueda web',
            });
          }
          if (images.length >= 6) break;
        }
      } catch {}
    }

    // 4. Si aún faltan imágenes, completar con banco periodístico temático
    if (images.length < 4) {
      const fallbackThemes: Record<string, string[]> = {
        salud: [
          'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1080&auto=format&fit=crop&q=80',
        ],
        deportes: [
          'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1080&auto=format&fit=crop&q=80',
        ],
        entretenimiento: [
          'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1578022761797-b8636ac1773c?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1080&auto=format&fit=crop&q=80',
        ],
        seguridad: [
          'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop&q=80',
        ],
        economia: [
          'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1080&auto=format&fit=crop&q=80',
        ],
        general: [
          'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=1080&auto=format&fit=crop&q=80',
        ],
      };

      const titleLower = (params.title || '').toLowerCase();
      const themeKey =
        titleLower.includes('salud') || titleLower.includes('hospital') || titleLower.includes('médic') || titleLower.includes('oraciones') || titleLower.includes('enfermedad') || titleLower.includes('bozzo')
          ? 'salud'
          : titleLower.includes('deporte') || titleLower.includes('fútbol') || titleLower.includes('futbol') || titleLower.includes('gol') || titleLower.includes('boxeo')
          ? 'deportes'
          : titleLower.includes('netflix') || titleLower.includes('cine') || titleLower.includes('música') || titleLower.includes('farándula') || titleLower.includes('shakira')
          ? 'entretenimiento'
          : titleLower.includes('polic') || titleLower.includes('seguridad') || titleLower.includes('crimen') || titleLower.includes('bomba')
          ? 'seguridad'
          : titleLower.includes('dólar') || titleLower.includes('dolar') || titleLower.includes('econom') || titleLower.includes('precio')
          ? 'economia'
          : 'general';

      const pool = fallbackThemes[themeKey] || fallbackThemes.general;
      for (const fallbackUrl of pool) {
        addImage(fallbackUrl, params.title || 'Foto de contexto', 'Archivo periodístico');
        if (images.length >= 4) break;
      }
    }

    return images;
  }
}
