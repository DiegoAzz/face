import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@newsflow/shared-types';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('news')
  async listNews(@CurrentUser() user: AuthenticatedUser) {
    return this.newsService.listNewsItems(user.organizationId);
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
