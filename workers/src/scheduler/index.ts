import { Queue } from 'bullmq';
import { getPrismaClient, DraftStatus } from '@newsflow/database';
import Redis from 'ioredis';

const prisma = getPrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publisherQueue = new Queue('publisher-queue', { connection });

/**
 * Ciclo del Scheduler: busca trabajos listos y los despacha al worker.
 */
export async function runSchedulerCycle() {
  const lockKey = 'lock:newsflow:scheduler';
  // Adquirir lock distribuido con TTL de 20s
  const acquired = await connection.set(lockKey, 'locked', 'PX', 20000, 'NX');
  if (!acquired) {
    // Otra instancia ya está ejecutando el ciclo
    return;
  }

  try {
    const now = new Date();
    const pendingJobs = await prisma.publicationJob.findMany({
      where: {
        status: DraftStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      include: {
        page: true,
      },
      take: 10,
    });

    for (const job of pendingJobs) {
      if (!job.page.publishingEnabled) {
        continue;
      }

      // Encolar con jobId único para garantizar idempotencia
      await publisherQueue.add(
        'publish-post',
        { jobId: job.id },
        {
          jobId: job.id, // Previene doble encolado en Redis
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000, // 10s base
          },
        }
      );

      console.log(`[Scheduler] Encolado trabajo ${job.id} para la página ${job.page.pageName}`);
    }
  } catch (err: any) {
    console.error(`[Scheduler] Error en ciclo: ${err.message}`);
  } finally {
    await connection.del(lockKey);
  }
}

export function startSchedulerLoop() {
  console.log('[Scheduler] Iniciando bucle del scheduler (cada 60 segundos)...');
  runSchedulerCycle();
  setInterval(runSchedulerCycle, 60000);
}

if (require.main === module) {
  startSchedulerLoop();
}
