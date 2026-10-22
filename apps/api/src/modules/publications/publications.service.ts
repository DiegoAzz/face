import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DraftStatus } from '@newsflow/database';
import { MetaPagePublisher, decryptSecret } from '@newsflow/integrations';

@Injectable()
export class PublicationsService {
  private publisher = new MetaPagePublisher();

  constructor(private readonly prisma: PrismaService) {}

  async listPublications(organizationId: string) {
    return this.prisma.publicationJob.findMany({
      where: { organizationId },
      include: {
        draft: true,
        page: {
          select: { pageName: true, pageId: true, publishingEnabled: true },
        },
        publicationAttempts: {
          orderBy: { startedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async cancelJob(jobId: string, organizationId: string, userId: string) {
    const job = await this.prisma.publicationJob.findFirst({
      where: { id: jobId, organizationId },
    });

    if (!job) {
      throw new NotFoundException('Trabajo de publicación no encontrado');
    }

    if (job.status === DraftStatus.PUBLISHED || job.status === DraftStatus.PUBLISHING) {
      throw new BadRequestException('No se puede cancelar un trabajo que ya fue publicado o se encuentra en transmisión');
    }

    const updated = await this.prisma.publicationJob.update({
      where: { id: jobId },
      data: { status: DraftStatus.CANCELLED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'CANCEL_PUBLICATION_JOB',
        targetType: 'PUBLICATION_JOB',
        targetId: jobId,
      },
    });

    return updated;
  }

  async retryJob(jobId: string, organizationId: string, userId: string) {
    const job = await this.prisma.publicationJob.findFirst({
      where: { id: jobId, organizationId },
      include: {
        draft: true,
        page: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabajo de publicación no encontrado');
    }

    // Ejecutar publicación con conciliación y reporte auditable
    return this.executePublishJob(job);
  }

  async executePublishJob(job: any) {
    const { id: jobId, organizationId, draft, page } = job;

    if (!page.publishingEnabled) {
      throw new BadRequestException(`La publicación para la página "${page.pageName}" está desactivada. Actívela en el panel.`);
    }

    const startTime = new Date();
    await this.prisma.publicationJob.update({
      where: { id: jobId },
      data: { status: DraftStatus.PUBLISHING, attempts: job.attempts + 1 },
    });

    try {
      const pageAccessToken = decryptSecret(page.tokenRef);
      const message = `${draft.title}\n\n${draft.body}\n\nFuente: ${draft.sourceAttribution}`;

      // 1. Reconciliación previa: verificar que el post no exista ya en Meta
      const existingRemoteId = await this.publisher.reconcileRecentPost(
        page.pageId,
        pageAccessToken,
        draft.title
      );

      if (existingRemoteId) {
        await this.prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: DraftStatus.PUBLISHED,
            remotePostId: existingRemoteId,
            lastErrorCode: null,
          },
        });

        await this.prisma.draft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.PUBLISHED },
        });

        return {
          status: 'PUBLISHED',
          remotePostId: existingRemoteId,
          note: 'Publicación reconciliada contra Meta (evitó duplicado)',
        };
      }

      // 2. Publicación oficial en Meta Graph API
      const result = await this.publisher.publishToPage({
        pageId: page.pageId,
        pageAccessToken,
        message,
        link: draft.sourceUrl,
        isTestMode: false,
      });

      // 3. Registrar intento
      await this.prisma.publicationAttempt.create({
        data: {
          jobId,
          startedAt: startTime,
          finishedAt: new Date(),
          status: result.success ? 'SUCCESS' : 'FAILED',
          sanitizedResponse: {
            success: result.success,
            remotePostId: result.remotePostId,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode,
          },
        },
      });

      if (result.success && result.remotePostId) {
        await this.prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: DraftStatus.PUBLISHED,
            remotePostId: result.remotePostId,
            lastErrorCode: null,
          },
        });

        await this.prisma.draft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.PUBLISHED },
        });

        return {
          status: 'PUBLISHED',
          remotePostId: result.remotePostId,
        };
      } else {
        const nextStatus = result.isRetryable ? DraftStatus.FAILED_RETRYABLE : DraftStatus.FAILED_FINAL;

        await this.prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: nextStatus,
            lastErrorCode: result.errorCode ? String(result.errorCode) : 'PUBLISH_ERROR',
          },
        });

        // Si el token expiró (190), desactivar publicación de la página
        if (result.errorCode === 190) {
          await this.prisma.facebookPage.update({
            where: { id: page.id },
            data: { publishingEnabled: false, status: 'TOKEN_EXPIRED' },
          });
        }

        return {
          status: nextStatus,
          error: result.errorMessage,
          errorCode: result.errorCode,
        };
      }
    } catch (err: any) {
      await this.prisma.publicationJob.update({
        where: { id: jobId },
        data: {
          status: DraftStatus.FAILED_RETRYABLE,
          lastErrorCode: err.message,
        },
      });

      throw new BadRequestException(`Error publicando en Meta: ${err.message}`);
    }
  }
}
