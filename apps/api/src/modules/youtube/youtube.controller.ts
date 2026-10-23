import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { YouTubeService } from './youtube.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@newsflow/shared-types';

@Controller('youtube')
export class YouTubeController {
  constructor(private readonly youtubeService: YouTubeService) {}

  @Get('auth/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async startAuth(@CurrentUser() user: AuthenticatedUser) {
    const url = await this.youtubeService.getOAuthStartUrl(user.organizationId);
    return { url };
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async saveSettings(
    @Body() body: { clientId: string; clientSecret: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.youtubeService.saveCredentials(user.organizationId, body);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    const appUrl = process.env.APP_URL || 'https://face.appzplay.online';
    try {
      const channel = await this.youtubeService.handleOAuthCallback(code, state);
      return res.redirect(`${appUrl}/pages?youtube=success&channel=${encodeURIComponent(channel.channelTitle)}`);
    } catch (err: any) {
      return res.redirect(`${appUrl}/pages?youtube=error&msg=${encodeURIComponent(err.message)}`);
    }
  }

  @Get('channels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getChannels(@CurrentUser() user: AuthenticatedUser) {
    return this.youtubeService.getChannels(user.organizationId);
  }

  @Post('publish-short')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async publishShort(
    @Body() body: { channelDbId?: string; title: string; description: string; videoBase64: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    let targetId = body.channelDbId;
    if (!targetId) {
      const channels = await this.youtubeService.getChannels(user.organizationId);
      if (!channels || channels.length === 0) {
        throw new Error('No hay canales de YouTube vinculados en la sección Canales/Páginas.');
      }
      targetId = channels[0].id;
    }

    return this.youtubeService.publishShort(targetId, user.organizationId, body);
  }
}
