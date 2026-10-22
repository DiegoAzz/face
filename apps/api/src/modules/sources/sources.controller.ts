import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SourcesService } from './sources.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateNewsSourceDtoSchema, UserRole } from '@newsflow/shared-types';

@Controller('sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.sourcesService.listSources(user.organizationId);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN)
  async create(
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const parseResult = CreateNewsSourceDtoSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException('Datos de fuente RSS inválidos');
    }
    return this.sourcesService.createSource(user.organizationId, parseResult.data);
  }

  @Post(':id/test')
  @Roles(UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.EDITOR)
  async testSource(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.sourcesService.testSource(id, user.organizationId);
  }
}
