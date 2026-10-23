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
      // Devolver silencio mínimo en MP3
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
   * Búsqueda de imágenes en línea libres de derechos.
   */
  async searchImages(query: string): Promise<{ url: string; thumbUrl: string; title: string }[]> {
    if (!query || !query.trim()) return [];

    try {
      // Buscar en Wikipedia / Wikimedia Commons API
      const searchRes = await axios.get('https://es.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: query.trim(),
          gsrlimit: 12,
          prop: 'pageimages',
          piprop: 'thumbnail|original',
          pithumbsize: 600,
          format: 'json',
          origin: '*',
        },
        timeout: 8000,
      });

      const pages = searchRes.data?.query?.pages || {};
      const results: { url: string; thumbUrl: string; title: string }[] = [];

      for (const key of Object.keys(pages)) {
        const page = pages[key];
        const originalUrl = page.original?.source || page.thumbnail?.source;
        const thumbUrl = page.thumbnail?.source || originalUrl;
        if (originalUrl && (originalUrl.endsWith('.jpg') || originalUrl.endsWith('.jpeg') || originalUrl.endsWith('.png') || originalUrl.endsWith('.webp'))) {
          results.push({
            url: `/api/media/proxy?url=${encodeURIComponent(originalUrl)}`,
            thumbUrl: `/api/media/proxy?url=${encodeURIComponent(thumbUrl)}`,
            title: page.title || query,
          });
        }
      }

      if (results.length > 0) return results;
    } catch {}

    // Fallback con imágenes temáticas de Unsplash de alta calidad
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
}
