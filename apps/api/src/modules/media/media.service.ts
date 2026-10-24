import { Injectable } from '@nestjs/common';
import axios from 'axios';

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
   */
  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      return {
        buffer: Buffer.from(res.data),
        contentType: String(res.headers['content-type'] || 'image/jpeg'),
      };
    } catch (err: any) {
      throw new Error(`Error descargando imagen externa: ${err.message}`);
    }
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

      const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(cleanUrl)}`;
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
        ],
        deportes: [
          'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1080&auto=format&fit=crop&q=80',
        ],
        general: [
          'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1080&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1080&auto=format&fit=crop&q=80',
        ],
      };

      const titleLower = (params.title || '').toLowerCase();
      const themeKey =
        titleLower.includes('salud') || titleLower.includes('hospital') || titleLower.includes('médic') || titleLower.includes('oraciones')
          ? 'salud'
          : titleLower.includes('deporte') || titleLower.includes('fútbol') || titleLower.includes('gol')
          ? 'deportes'
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
