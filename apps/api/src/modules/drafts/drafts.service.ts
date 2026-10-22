import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDraftDto, ScheduleDraftDto } from '@newsflow/shared-types';
import { DraftStatus } from '@newsflow/database';
import * as crypto from 'crypto';

@Injectable()
export class DraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDrafts(organizationId: string, status?: DraftStatus) {
    const drafts = await this.prisma.draft.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        draftRevisions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        publicationJobs: {
          include: { page: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return drafts.map((d) => ({
      ...d,
      riskFlags: (() => {
        try {
          const parsed = JSON.parse(d.riskFlags);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
    }));
  }

  async updateDraft(
    draftId: string,
    organizationId: string,
    editorId: string,
    dto: UpdateDraftDto
  ) {
    const draft = await this.prisma.draft.findFirst({
      where: { id: draftId, organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Guardar historial de revisión
      await tx.draftRevision.create({
        data: {
          draftId,
          editorId,
          title: dto.title || draft.title,
          body: dto.body || draft.body,
          reason: dto.reason || 'Edición manual editorial',
        },
      });

      // 2. Actualizar borrador incrementando versión
      const updated = await tx.draft.update({
        where: { id: draftId },
        data: {
          ...(dto.title ? { title: dto.title } : {}),
          ...(dto.body ? { body: dto.body } : {}),
          ...(dto.sourceUrl ? { sourceUrl: dto.sourceUrl } : {}),
          ...(dto.sourceAttribution ? { sourceAttribution: dto.sourceAttribution } : {}),
          ...(dto.riskLevel ? { riskLevel: dto.riskLevel } : {}),
          version: draft.version + 1,
        },
      });

      // 3. Auditoría
      await tx.auditLog.create({
        data: {
          organizationId,
          actorId: editorId,
          action: 'UPDATE_DRAFT',
          targetType: 'DRAFT',
          targetId: draftId,
          metadataRedacted: JSON.stringify({ version: updated.version, reason: dto.reason }),
        },
      });

      return {
        ...updated,
        riskFlags: (() => {
          try {
            const parsed = JSON.parse(updated.riskFlags);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      };
    });
  }

  async approveDraft(draftId: string, organizationId: string, editorId: string) {
    const draft = await this.prisma.draft.findFirst({
      where: { id: draftId, organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    const updated = await this.prisma.draft.update({
      where: { id: draftId },
      data: { status: DraftStatus.APPROVED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: editorId,
        action: 'APPROVE_DRAFT',
        targetType: 'DRAFT',
        targetId: draftId,
      },
    });

    return updated;
  }

  async rejectDraft(draftId: string, organizationId: string, editorId: string, reason?: string) {
    const draft = await this.prisma.draft.findFirst({
      where: { id: draftId, organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    const updated = await this.prisma.draft.update({
      where: { id: draftId },
      data: { status: DraftStatus.REJECTED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: editorId,
        action: 'REJECT_DRAFT',
        targetType: 'DRAFT',
        targetId: draftId,
        metadataRedacted: JSON.stringify({ reason: reason || 'Rechazado en sala editorial' }),
      },
    });

    return updated;
  }

  async scheduleDraft(
    draftId: string,
    organizationId: string,
    editorId: string,
    dto: ScheduleDraftDto
  ) {
    const draft = await this.prisma.draft.findFirst({
      where: { id: draftId, organizationId },
    });

    if (!draft) {
      throw new NotFoundException('Borrador no encontrado');
    }

    if (draft.status !== DraftStatus.APPROVED && draft.status !== DraftStatus.REVIEW) {
      throw new BadRequestException('Solo se pueden programar borradores aprobados o en revisión autorizada');
    }

    const page = await this.prisma.facebookPage.findFirst({
      where: { id: dto.pageId, organizationId },
    });

    if (!page) {
      throw new NotFoundException('Página de Facebook no encontrada');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    // Generar clave de idempotencia única para prevenir duplicados
    const idempotencyRaw = `${organizationId}_${draftId}_${page.id}_${scheduledDate.toISOString().slice(0, 13)}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyRaw).digest('hex');

    const job = await this.prisma.publicationJob.create({
      data: {
        organizationId,
        draftId,
        pageId: page.id,
        scheduledAt: scheduledDate,
        status: DraftStatus.SCHEDULED,
        idempotencyKey,
      },
    });

    await this.prisma.draft.update({
      where: { id: draftId },
      data: { status: DraftStatus.SCHEDULED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: editorId,
        action: 'SCHEDULE_PUBLICATION_JOB',
        targetType: 'PUBLICATION_JOB',
        targetId: job.id,
        metadataRedacted: JSON.stringify({ pageName: page.pageName, scheduledAt: scheduledDate }),
      },
    });

    return job;
  }
}
