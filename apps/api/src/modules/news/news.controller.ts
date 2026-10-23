import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { createSafeHttpClient } from '@newsflow/integrations';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@newsflow/shared-types';

@Controller('media')
export class MediaController {
  @Get('proxy')
  async proxyMedia(@Query('url') rawUrl: string, @Res() res: Response) {
    if (!rawUrl) {
      return res.status(400).send('URL requerida');
    }
    try {
      const httpClient = createSafeHttpClient();
      const response = await httpClient.get(rawUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        timeout: 10000,
      });

      const contentType = String(response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return response.data.pipe(res);
    } catch {
      return res.status(404).send('Imagen no disponible');
    }
  }

  @Get('tts')
  async getTts(
    @Query('text') text: string,
    @Query('lang') lang: string,
    @Res() res: Response
  ) {
    if (!text) {
      return res.status(400).send('Texto requerido');
    }
    // Limpieza profunda de emojis, símbolos raros y formatos para que el narrador lea exclusivamente la noticia pura
    const stripped = text
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}]/gu, '')
      .replace(/[*_#~`\\/|•–—«»]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const selectedLang = ['es-US', 'es', 'es-ES', 'es-MX'].includes(lang) ? lang : 'es-US';
    const clean = encodeURIComponent(stripped.slice(0, 260));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedLang}&client=tw-ob&q=${clean}`;
    try {
      const httpClient = createSafeHttpClient();
      const response = await httpClient.get(url, {
        responseType: 'stream',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return response.data.pipe(res);
    } catch {
      return res.status(500).send('Error generando audio TTS');
    }
  }

  @Get('search-images')
  async searchImages(@Query('q') query: string) {
    if (!query || !query.trim()) {
      return [];
    }
    const cleanQ = encodeURIComponent(query.trim().slice(0, 80));
    try {
      const httpClient = createSafeHttpClient();
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${cleanQ}&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
      const response = await httpClient.get(wikiUrl, {
        headers: {
          'User-Agent': 'NewsFlowAI/1.0 (https://newsflow.ai; contact@newsflow.ai)',
        },
        timeout: 8000,
      });

      const pages = response.data?.query?.pages || {};
      const results: { url: string; thumbUrl: string; title: string }[] = [];

      for (const pageId of Object.keys(pages)) {
        const item = pages[pageId];
        const info = item?.imageinfo?.[0];
        if (info && (info.thumburl || info.url)) {
          const rawUrl = info.thumburl || info.url;
          const lower = rawUrl.toLowerCase();
          if (!lower.endsWith('.svg') && !lower.endsWith('.ogg') && !lower.endsWith('.pdf')) {
            results.push({
              url: `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`,
              thumbUrl: `/api/media/proxy?url=${encodeURIComponent(info.thumburl || rawUrl)}`,
              title: item.title ? item.title.replace(/^File:/i, '').replace(/\.[^/.]+$/, '') : 'Foto web',
            });
          }
        }
      }

      return results;
    } catch (err) {
      console.warn('Error buscando imágenes en Wikimedia:', err);
      return [];
    }
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('news')
  async listNews(@CurrentUser() user: AuthenticatedUser) {
    return this.newsService.listNewsItems(user.organizationId);
  }

  @Get('news/alerts')
  async getAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.newsService.listLatestAlerts(user.organizationId);
  }

  @Post('news/sync')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async syncNews(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.newsService.syncNews(user.organizationId);
    return {
      message: `Sincronización completada. Se capturaron ${count} noticias nuevas.`,
      count,
    };
  }

  @Get('stories')
  async listStories(@CurrentUser() user: AuthenticatedUser) {
    return this.newsService.listStories(user.organizationId);
  }

  @Post('stories/:id/generate-draft')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async generateDraft(
    @Param('id') clusterId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.newsService.generateDraftForStory(clusterId, user.organizationId);
  }
}
