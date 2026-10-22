import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus, DraftStatus } from '@newsflow/database';
import { MockEditorialLLMAdapter, ExternalLLMAdapter, LLMAdapter, createSafeHttpClient, validateSafeUrl } from '@newsflow/integrations';
import { XMLParser } from 'fast-xml-parser';
import * as crypto from 'crypto';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private llmAdapter: LLMAdapter;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.LLM_API_KEY) {
      this.llmAdapter = new ExternalLLMAdapter();
    } else {
      this.llmAdapter = new MockEditorialLLMAdapter();
    }
  }

  async onModuleInit() {
    // Sincronización inicial automática 3 segundos tras arrancar
    setTimeout(async () => {
      try {
        this.logger.log('Ejecutando ingesta RSS inicial de medios colombianos...');
        await this.syncNews();
      } catch (err: any) {
        this.logger.warn(`Aviso en ingesta inicial: ${err.message}`);
      }
    }, 3000);

    // Ciclo periódico cada 15 minutos
    setInterval(async () => {
      try {
        await this.syncNews();
      } catch (err: any) {
        this.logger.warn(`Aviso en ingesta periódica: ${err.message}`);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Ejecuta el ciclo de ingesta para fuentes RSS oficiales.
   */
  async syncNews(orgId?: string): Promise<number> {
    this.logger.log('Iniciando recolección de noticias RSS...');
    const whereClause: any = { enabled: true };
    if (orgId) {
      whereClause.organizationId = orgId;
    }

    const sources = await this.prisma.newsSource.findMany({
      where: whereClause,
    });

    const httpClient = createSafeHttpClient();
    const xmlParser = new XMLParser({ ignoreAttributes: false });
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
          const title = (item.title?.['#text'] || item.title || '').toString().trim();
          const rawLink = (item.link?.['#text'] || item.link?.['@_href'] || item.link || '').toString().trim();
          const description = (item.description?.['#text'] || item.description || item.summary || '').toString();
          const pubDateStr = item.pubDate || item.published || item['dc:date'] || new Date().toISOString();

          if (!title || !rawLink) continue;

          let canonicalUrl = rawLink;
          try {
            const u = new URL(rawLink);
            u.searchParams.delete('utm_source');
            u.searchParams.delete('utm_medium');
            u.searchParams.delete('utm_campaign');
            u.searchParams.delete('utm_term');
            u.searchParams.delete('utm_content');
            u.searchParams.delete('fbclid');
            u.searchParams.delete('gclid');
            canonicalUrl = u.toString();
          } catch {
            // mantener rawLink
          }

          const cleanExcerpt = description.replace(/<[^>]*>?/gm, '').trim().slice(0, 500);

          const contentHash = crypto
            .createHash('sha256')
            .update(canonicalUrl + title)
            .digest('hex');

          const publishedAt = new Date(pubDateStr);

          // Deduplicación por (organizationId, canonicalUrl)
          const existing = await this.prisma.newsItem.findUnique({
            where: {
              organizationId_canonicalUrl: {
                organizationId: source.organizationId,
                canonicalUrl,
              },
            },
          });

          if (existing) continue;

          // Crear NewsItem
          const newsItem = await this.prisma.newsItem.create({
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

          // Deduplicación temática y agrupamiento
          const fingerprint = crypto
            .createHash('md5')
            .update(title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60))
            .digest('hex');

          const cluster = await this.prisma.storyCluster.upsert({
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
              relevanceScore: 80.0,
              verificationStatus: VerificationStatus.SINGLE_SOURCE,
            },
          });

          await this.prisma.storyClusterItem.upsert({
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

        await this.prisma.newsSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date(), lastError: null },
        });
      } catch (err: any) {
        this.logger.error(`Error procesando fuente ${source.name}: ${err.message}`);
        await this.prisma.newsSource.update({
          where: { id: source.id },
          data: { lastError: err.message },
        });
      }
    }

    this.logger.log(`Ingesta completada. ${totalNewItems} noticias nuevas registradas.`);
    return totalNewItems;
  }

  async listNewsItems(organizationId: string) {
    return this.prisma.newsItem.findMany({
      where: { organizationId },
      include: {
        source: {
          select: { name: true, category: true, locale: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }

  async listStories(organizationId: string) {
    return this.prisma.storyCluster.findMany({
      where: { organizationId },
      include: {
        storyClusterItems: {
          include: {
            item: {
              include: { source: true },
            },
          },
        },
        drafts: true,
      },
      orderBy: { relevanceScore: 'desc' },
      take: 50,
    });
  }

  /**
   * Genera un borrador editorial para un cluster de historias.
   */
  async generateDraftForStory(clusterId: string, organizationId: string) {
    const cluster = await this.prisma.storyCluster.findFirst({
      where: { id: clusterId, organizationId },
      include: {
        storyClusterItems: {
          include: {
            item: {
              include: { source: true },
            },
          },
        },
      },
    });

    if (!cluster) {
      throw new NotFoundException('Cluster de historia no encontrado');
    }

    const primaryItem = cluster.storyClusterItems[0]?.item;
    if (!primaryItem) {
      throw new NotFoundException('El cluster no tiene artículos vinculados');
    }

    // Invocación a LLM con contrato estricto Zod
    const editorialOutput = await this.llmAdapter.generateDraft({
      title: primaryItem.title,
      excerpt: primaryItem.excerpt,
      sourceName: primaryItem.source.name,
      sourceUrl: primaryItem.canonicalUrl,
      category: primaryItem.source.category,
      publishedAt: primaryItem.publishedAt.toISOString(),
    });

    const riskLevel = editorialOutput.risk_flags.length > 0 ? 'HIGH' : 'LOW';

    // Crear el borrador en estado REVIEW (requiere aprobación humana por defecto)
    const draft = await this.prisma.draft.create({
      data: {
        organizationId,
        storyClusterId: cluster.id,
        title: editorialOutput.headline,
        body: editorialOutput.summary,
        sourceUrl: editorialOutput.source_url,
        sourceAttribution: editorialOutput.source_attribution,
        riskLevel,
        riskFlags: JSON.stringify(editorialOutput.risk_flags),
        status: DraftStatus.REVIEW,
        suggestedPublishAt: editorialOutput.suggested_publish_at ? new Date(editorialOutput.suggested_publish_at) : null,
      },
    });

    // Auditoría
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'GENERATE_EDITORIAL_DRAFT',
        targetType: 'DRAFT',
        targetId: draft.id,
        metadataRedacted: JSON.stringify({ title: draft.title, riskFlags: draft.riskFlags }),
      },
    });

    return draft;
  }
}
