import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@newsflow/shared-types';

@Controller('publications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.publicationsService.listPublications(user.organizationId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.publicationsService.cancelJob(id, user.organizationId, user.userId);
  }

  @Post(':id/retry')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.publicationsService.retryJob(id, user.organizationId, user.userId);
  }
}
