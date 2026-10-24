import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MetaService } from './meta.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@newsflow/shared-types';

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('connect/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  startConnect(@CurrentUser() user: AuthenticatedUser) {
    const url = this.metaService.getOAuthStartUrl(user.organizationId);
    return { url };
  }

  @Get('connect/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    const appUrl = process.env.APP_URL || 'https://face.appzplay.online';
    try {
      await this.metaService.handleOAuthCallback(code, state);
      return res.redirect(`${appUrl}/pages?meta=success`);
    } catch (err: any) {
      return res.redirect(`${appUrl}/pages?meta=error&msg=${encodeURIComponent(err.message)}`);
    }
  }
}

@Controller('pages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagesController {
  constructor(private readonly metaService: MetaService) {}

  @Get()
  async getPages(@CurrentUser() user: AuthenticatedUser) {
    return this.metaService.getPages(user.organizationId);
  }

  @Post('manual')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async addManualPage(
    @Body() body: { pageId: string; pageName?: string; pageAccessToken: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.metaService.addManualPage(user.organizationId, body);
  }

  @Post(':id/publishing/enable')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async enablePublishing(
    @Param('id') pageId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.metaService.setPublishingStatus(pageId, user.organizationId, true);
  }

  @Post(':id/publishing/disable')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async disablePublishing(
    @Param('id') pageId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.metaService.setPublishingStatus(pageId, user.organizationId, false);
  }

  @Post(':id/publish-video')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async publishVideo(
    @Param('id') pageId: string,
    @Body() body: { title: string; description: string; videoBase64: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.metaService.publishVideoToPage(pageId, user.organizationId, body);
  }

  @Post(':id/publish-photo')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async publishPhoto(
    @Param('id') pageId: string,
    @Body() body: { caption: string; photoBase64?: string; photoUrl?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.metaService.publishPhotoToPage(pageId, user.organizationId, body);
  }
}
