import { getPrismaClient, VerificationStatus } from '@newsflow/database';
import { validateSafeUrl, createSafeHttpClient } from '@newsflow/integrations';
import { XMLParser } from 'fast-xml-parser';
import * as crypto from 'crypto';

const prisma = getPrismaClient();
const xmlParser = new XMLParser({ ignoreAttributes: false });

/**
 * Normaliza y canonicaliza una URL para eliminar parámetros de rastreo (utm, fbclid, etc.).
 */
function canonicalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_term');
    u.searchParams.delete('utm_content');
    u.searchParams.delete('fbclid');
    u.searchParams.delete('gclid');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Procesa la ingesta de todas las fuentes RSS activas.
 */
export async function runIngestionCycle(): Promise<number> {
  console.log('[Ingestion-Worker] Iniciando ciclo de recolección de noticias RSS...');
  const sources = await prisma.newsSource.findMany({
    where: { enabled: true },
  });

  const httpClient = createSafeHttpClient();
  let totalNewItems = 0;

  for (const source of sources) {
    try {
      await validateSafeUrl(source.url);
      const res = await httpClient.get(source.url);
      const parsed = xmlParser.parse(res.data);

      const items =
        parsed.rss?.channel?.item ||
        parsed.feed?.entry ||
        [];

      const rawItems = Array.isArray(items) ? items : [items];

      for (const item of rawItems) {
        const title = item.title?.['#text'] || item.title || '';
        const rawLink = item.link?.['#text'] || item.link?.['@_href'] || item.link || '';
        const description = item.description?.['#text'] || item.description || item.summary || '';
        const pubDateStr = item.pubDate || item.published || item['dc:date'] || new Date().toISOString();

        if (!title || !rawLink) continue;

        const canonicalUrl = canonicalizeUrl(rawLink);
        const cleanExcerpt = String(description).replace(/<[^>]*>?/gm, '').trim().slice(0, 500);

        // Hash SHA-256 del contenido
        const contentHash = crypto
          .createHash('sha256')
          .update(canonicalUrl + title)
          .digest('hex');

        const publishedAt = new Date(pubDateStr);

        // 1. Deduplicación por (organizationId, canonicalUrl)
        const existing = await prisma.newsItem.findUnique({
          where: {
            organizationId_canonicalUrl: {
              organizationId: source.organizationId,
              canonicalUrl,
            },
          },
        });

        if (existing) continue;

        // 2. Crear NewsItem
        const newsItem = await prisma.newsItem.create({
          data: {
            organizationId: source.organizationId,
            sourceId: source.id,
            canonicalUrl,
            title,
            excerpt: cleanExcerpt || title,
            publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
            contentHash,
            rawMetadata: JSON.stringify({ originalSource: source.name }),
          },
        });

        // 3. Agrupación en StoryCluster (Deduplicación semántica por huella)
        const fingerprint = crypto
          .createHash('md5')
          .update(title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60))
          .digest('hex');

        const cluster = await prisma.storyCluster.upsert({
          where: {
            organizationId_eventFingerprint: {
              organizationId: source.organizationId,
              eventFingerprint: fingerprint,
            },
          },
          update: {
            verificationStatus: VerificationStatus.CORROBORATED,
          },
          create: {
            organizationId: source.organizationId,
            topic: title.slice(0, 120),
            eventFingerprint: fingerprint,
            relevanceScore: 80.0, // Score inicial por fuente reconocida
            verificationStatus: VerificationStatus.SINGLE_SOURCE,
          },
        });

        // Vincular item al cluster
        await prisma.storyClusterItem.upsert({
          where: {
            clusterId_itemId: {
              clusterId: cluster.id,
              itemId: newsItem.id,
            },
          },
          update: {},
          create: {
            clusterId: cluster.id,
            itemId: newsItem.id,
          },
        });

        totalNewItems++;
      }

      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date(), lastError: null },
      });
    } catch (err: any) {
      console.error(`[Ingestion-Worker] Error procesando fuente ${source.name}: ${err.message}`);
      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastError: err.message },
      });
    }
  }

  console.log(`[Ingestion-Worker] Ciclo finalizado. ${totalNewItems} noticias nuevas capturadas.`);
  return totalNewItems;
}

// Ejecución cíclica si se corre como proceso independiente
if (require.main === module) {
  runIngestionCycle();
  setInterval(runIngestionCycle, 30 * 60 * 1000); // Cada 30 minutos
}
