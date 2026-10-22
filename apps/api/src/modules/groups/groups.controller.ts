import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateGroupBookmarkDtoSchema, MarkManualShareDtoSchema, UserRole } from '@newsflow/shared-types';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.listGroups(user.organizationId);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async create(
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = CreateGroupBookmarkDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de marcador de grupo inválidos');
    }
    return this.groupsService.createGroup(user.organizationId, parseResult.data);
  }

  @Post(':id/mark-manual-share')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR, UserRole.OPERATOR)
  async markManualShare(
    @Param('id') groupId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = MarkManualShareDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de registro de compartición manual inválidos');
    }
    return this.groupsService.markManualShare(groupId, user.organizationId, user.userId, parseResult.data);
  }
}
