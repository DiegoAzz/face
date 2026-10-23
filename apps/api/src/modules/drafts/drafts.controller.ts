import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DraftsService } from './drafts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UpdateDraftDtoSchema, ScheduleDraftDtoSchema, UserRole } from '@newsflow/shared-types';
import { DraftStatus } from '@newsflow/database';

@Controller('drafts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  async list(
    @Query('status') status: DraftStatus,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.draftsService.listDrafts(user.organizationId, status);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = UpdateDraftDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de actualización de borrador inválidos');
    }
    return this.draftsService.updateDraft(id, user.organizationId, user.userId, parseResult.data);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.draftsService.approveDraft(id, user.organizationId, user.userId);
  }

  @Post(':id/publish-manual')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async publishManual(
    @Param('id') id: string,
    @Body() body: { title?: string; body?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.draftsService.markAsPublished(id, user.organizationId, user.userId, body);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.draftsService.rejectDraft(id, user.organizationId, user.userId, reason);
  }

  @Post(':id/schedule')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async schedule(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = ScheduleDraftDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de programación inválidos');
    }
    return this.draftsService.scheduleDraft(id, user.organizationId, user.userId, parseResult.data);
  }
}
