import { Worker, Job } from 'bullmq';
import { getPrismaClient, DraftStatus } from '@newsflow/database';
import { MetaPagePublisher, decryptSecret } from '@newsflow/integrations';
import Redis from 'ioredis';

const prisma = getPrismaClient();
const publisher = new MetaPagePublisher();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

interface PublishJobPayload {
  jobId: string;
}

export function startPublisherWorker() {
  console.log('[Publisher-Worker] Iniciando worker de publicación BullMQ...');

  const worker = new Worker<PublishJobPayload>(
    'publisher-queue',
    async (job: Job<PublishJobPayload>) => {
      const { jobId } = job.data;
      console.log(`[Publisher-Worker] Procesando trabajo: ${jobId}`);

      const pubJob = await prisma.publicationJob.findUnique({
        where: { id: jobId },
        include: { draft: true, page: true },
      });

      if (!pubJob) {
        throw new Error(`Trabajo ${jobId} no encontrado en base de datos`);
      }

      if (pubJob.status === DraftStatus.CANCELLED) {
        console.log(`[Publisher-Worker] Trabajo ${jobId} fue cancelado.`);
        return;
      }

      const { page, draft } = pubJob;

      if (!page.publishingEnabled) {
        console.log(`[Publisher-Worker] Publicación en la página "${page.pageName}" está deshabilitada.`);
        return;
      }

      const pageAccessToken = decryptSecret(page.tokenRef);
      const message = `${draft.title}\n\n${draft.body}\n\nFuente: ${draft.sourceAttribution}`;

      // 1. Reconciliación previa anti-duplicados
      const existingRemoteId = await publisher.reconcileRecentPost(
        page.pageId,
        pageAccessToken,
        draft.title
      );

      if (existingRemoteId) {
        await prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: DraftStatus.PUBLISHED,
            remotePostId: existingRemoteId,
          },
        });
        await prisma.draft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.PUBLISHED },
        });
        console.log(`[Publisher-Worker] Post reconciliado previamente: ${existingRemoteId}`);
        return;
      }

      // 2. Publicación oficial
      const startTime = new Date();
      const result = await publisher.publishToPage({
        pageId: page.pageId,
        pageAccessToken,
        message,
        link: draft.sourceUrl,
        imageUrl: draft.imageUrl || undefined,
      });

      // 3. Registrar intento
      await prisma.publicationAttempt.create({
        data: {
          jobId,
          startedAt: startTime,
          finishedAt: new Date(),
          status: result.success ? 'SUCCESS' : 'FAILED',
          sanitizedResponse: JSON.stringify({
            success: result.success,
            remotePostId: result.remotePostId,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode,
          }),
        },
      });

      if (result.success && result.remotePostId) {
        await prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: DraftStatus.PUBLISHED,
            remotePostId: result.remotePostId,
          },
        });
        await prisma.draft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.PUBLISHED },
        });
        console.log(`[Publisher-Worker] Publicado con éxito en Meta! Remote ID: ${result.remotePostId}`);
      } else {
        const nextStatus = result.isRetryable ? DraftStatus.FAILED_RETRYABLE : DraftStatus.FAILED_FINAL;
        await prisma.publicationJob.update({
          where: { id: jobId },
          data: {
            status: nextStatus,
            lastErrorCode: String(result.errorCode || 'ERROR'),
          },
        });

        if (result.errorCode === 190) {
          await prisma.facebookPage.update({
            where: { id: page.id },
            data: { publishingEnabled: false, status: 'TOKEN_EXPIRED' },
          });
        }

        if (result.isRetryable) {
          throw new Error(`Error reintentable en Meta: ${result.errorMessage}`);
        }
      }
    },
    {
      connection,
      concurrency: 2, // Límite de concurrencia controlado
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Publisher-Worker] Falló el trabajo ${job?.id}: ${err.message}`);
  });

  return worker;
}

if (require.main === module) {
  startPublisherWorker();
}
