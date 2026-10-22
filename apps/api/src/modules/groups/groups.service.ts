import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupBookmarkDto, MarkManualShareDto } from '@newsflow/shared-types';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGroups(organizationId: string) {
    return this.prisma.groupBookmark.findMany({
      where: { organizationId },
      include: {
        manualGroupShares: {
          orderBy: { sharedAt: 'desc' },
          take: 5,
          include: {
            user: { select: { email: true } },
            draft: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGroup(organizationId: string, dto: CreateGroupBookmarkDto) {
    return this.prisma.groupBookmark.create({
      data: {
        organizationId,
        name: dto.name,
        url: dto.url,
        rulesNotes: dto.rulesNotes,
      },
    });
  }

  async markManualShare(
    groupId: string,
    organizationId: string,
    userId: string,
    dto: MarkManualShareDto
  ) {
    const group = await this.prisma.groupBookmark.findFirst({
      where: { id: groupId, organizationId },
    });

    if (!group) {
      throw new NotFoundException('Marcador de grupo no encontrado');
    }

    const draft = await this.prisma.draft.findFirst({
      where: { id: dto.draftId, organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    // Registrar compartición manual
    const share = await this.prisma.manualGroupShare.create({
      data: {
        organizationId,
        groupId,
        draftId: dto.draftId,
        userId,
        notes: dto.notes,
      },
    });

    // Auditoría
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'MANUAL_GROUP_SHARE',
        targetType: 'GROUP_BOOKMARK',
        targetId: groupId,
        metadataRedacted: { groupName: group.name, draftTitle: draft.title },
      },
    });

    return share;
  }
}
