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

      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return response.data.pipe(res);
    } catch {
      return res.status(404).send('Imagen no disponible');
    }
  }

  @Get('tts')
  async getTts(@Query('text') text: string, @Res() res: Response) {
    if (!text) {
      return res.status(400).send('Texto requerido');
    }
    const clean = encodeURIComponent(text.slice(0, 250));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${clean}`;
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
