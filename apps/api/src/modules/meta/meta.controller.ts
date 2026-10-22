import {
  Controller,
  Get,
  Post,
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
}
