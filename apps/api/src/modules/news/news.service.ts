import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus, DraftStatus } from '@newsflow/database';
import { MockEditorialLLMAdapter, ExternalLLMAdapter, LLMAdapter, createSafeHttpClient, validateSafeUrl } from '@newsflow/integrations';
import { XMLParser } from 'fast-xml-parser';
import * as crypto from 'crypto';

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&lsquo;|&rsquo;|&#8216;|&#8217;/gi, "'")
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/gi, '-')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/gi, 'Á')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&Uacute;/gi, 'Ú')
    .replace(/&Ntilde;/gi, 'Ñ');
}

export function cleanNewsText(text: string): string {
  if (!text) return '';
  const decoded = decodeHtmlEntities(text);
  return decoded
    .replace(/<[^>]*>?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImageUrl(item: any, rawDescription: string): string | null {
  // 1. Enclosure
  if (item.enclosure) {
    const encUrl = item.enclosure['@_url'] || item.enclosure.url;
    if (encUrl && typeof encUrl === 'string' && encUrl.startsWith('http')) return encUrl;
  }

  // 2. media:content o media:thumbnail
  const mediaContent = item['media:content'] || item['media:thumbnail'];
  if (mediaContent) {
    if (Array.isArray(mediaContent)) {
      for (const m of mediaContent) {
        const mUrl = m?.['@_url'] || m?.url;
        if (mUrl && typeof mUrl === 'string' && mUrl.startsWith('http')) return mUrl;
      }
    } else if (typeof mediaContent === 'object') {
      const mUrl = mediaContent['@_url'] || mediaContent.url;
      if (mUrl && typeof mUrl === 'string' && mUrl.startsWith('http')) return mUrl;
    }
  }

  // 3. Extracción de etiqueta <img> en description o content:encoded
  const fullHtml = String(rawDescription || '') + ' ' + String(item['content:encoded'] || '');
  const match = fullHtml.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

async function fetchOgImage(canonicalUrl: string, httpClient: any): Promise<string | null> {
  try {
    const res = await httpClient.get(canonicalUrl, {
      timeout: 3500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsFlow/1.0',
      },
      maxContentLength: 500000,
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https?:\/\/[^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["'](https?:\/\/[^"']+)["'][^>]+property=["']og:image["']/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Continuar si no responde rápido
  }
  return null;
}

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
   * Ejecuta el ciclo de ingesta para fuentes RSS oficiales por categorías (Deportes, Entretenimiento, Economía, Actualidad).
   */
  async syncNews(orgId?: string): Promise<number> {
    this.logger.log('Iniciando recolección de noticias RSS por categorías...');

    // Catálogo completo de fuentes oficiales colombianas por categoría de periódico
    const defaultSources = [
      // 1. Actualidad y Política Nacional
      {
        name: 'El Tiempo - Colombia',
        url: 'https://www.eltiempo.com/rss/colombia.xml',
        category: 'Actualidad',
      },
      {
        name: 'El Espectador - Actualidad',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml',
        category: 'Actualidad',
      },
      // 2. Economía, Finanzas y Negocios
      {
        name: 'Portafolio - Economía',
        url: 'https://www.portafolio.co/rss/economia.xml',
        category: 'Economía',
      },
      {
        name: 'Portafolio - Negocios',
        url: 'https://www.portafolio.co/rss/negocios.xml',
        category: 'Economía',
      },
      {
        name: 'El Tiempo - Economía',
        url: 'https://www.eltiempo.com/rss/economia.xml',
        category: 'Economía',
      },
      // 3. Tecnología e Inteligencia Artificial
      {
        name: 'El Tiempo - Tecnosfera',
        url: 'https://www.eltiempo.com/rss/tecnosfera.xml',
        category: 'Tecnología',
      },
      {
        name: 'Portafolio - Innovación y Tecnología',
        url: 'https://www.portafolio.co/rss/innovacion.xml',
        category: 'Tecnología',
      },
      {
        name: 'El Espectador - Tecnología',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=tecnologia',
        category: 'Tecnología',
      },
      // 4. Deportes (Fútbol, Ciclismo, Selección)
      {
        name: 'El Tiempo - Deportes',
        url: 'https://www.eltiempo.com/rss/deportes.xml',
        category: 'Deportes',
      },
      {
        name: 'El Espectador - Deportes',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=deportes',
        category: 'Deportes',
      },
      // 5. Entretenimiento, Farándula y Chismes
      {
        name: 'El Tiempo - Gente y Farándula',
        url: 'https://www.eltiempo.com/rss/cultura/gente.xml',
        category: 'Entretenimiento',
      },
      {
        name: 'El Espectador - Entretenimiento',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=entretenimiento',
        category: 'Entretenimiento',
      },
      // 6. Mundo e Internacional
      {
        name: 'El Tiempo - Mundo',
        url: 'https://www.eltiempo.com/rss/mundo.xml',
        category: 'Mundo',
      },
      {
        name: 'Portafolio - Internacional',
        url: 'https://www.portafolio.co/rss/internacional.xml',
        category: 'Mundo',
      },
      {
        name: 'El Espectador - Mundo',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=mundo',
        category: 'Mundo',
      },
      // 7. Salud y Bienestar
      {
        name: 'El Tiempo - Salud',
        url: 'https://www.eltiempo.com/rss/salud.xml',
        category: 'Salud',
      },
      {
        name: 'El Espectador - Salud',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=salud',
        category: 'Salud',
      },
      // 8. Ciencia y Medio Ambiente
      {
        name: 'El Tiempo - Vida y Ciencia',
        url: 'https://www.eltiempo.com/rss/vida/ciencia.xml',
        category: 'Ciencia',
      },
      {
        name: 'El Espectador - Ciencia y Ambiente',
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml&feed=ciencia',
        category: 'Ciencia',
      },
      // 9. Cultura y Tendencias
      {
        name: 'Portafolio - Tendencias y Estilo',
        url: 'https://www.portafolio.co/rss/tendencias.xml',
        category: 'Cultura',
      },
      {
        name: 'El Tiempo - Cultura',
        url: 'https://www.eltiempo.com/rss/cultura.xml',
        category: 'Cultura',
      },
    ];

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const org = await this.prisma.organization.findFirst();
      if (org) targetOrgId = org.id;
    }

    if (targetOrgId) {
      for (const def of defaultSources) {
        await this.prisma.newsSource.upsert({
          where: {
            organizationId_url: {
              organizationId: targetOrgId,
              url: def.url,
            },
          },
          update: { category: def.category, name: def.name },
          create: {
            organizationId: targetOrgId,
            name: def.name,
            type: 'RSS',
            url: def.url,
            category: def.category,
            locale: 'es-CO',
            pollingInterval: 30,
            enabled: true,
          },
        });
      }

      await this.prisma.newsSource.updateMany({
        where: {
          organizationId: targetOrgId,
          category: { in: ['Colombia', 'General'] },
        },
        data: { category: 'Actualidad' },
      });
    }

    const whereClause: any = { enabled: true };
    if (targetOrgId) {
      whereClause.organizationId = targetOrgId;
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

          const cleanedTitle = cleanNewsText(title);
          const cleanExcerpt = cleanNewsText(description).slice(0, 500);

          const contentHash = crypto
            .createHash('sha256')
            .update(canonicalUrl + cleanedTitle)
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

          let imageUrl = extractImageUrl(item, description);
          if (!imageUrl) {
            imageUrl = await fetchOgImage(canonicalUrl, httpClient);
          }

          if (existing) {
            // Enriquecer con imagen real si no la tenía
            if (!existing.imageUrl && imageUrl) {
              await this.prisma.newsItem.update({
                where: { id: existing.id },
                data: { imageUrl },
              });
            }
            continue;
          }

          // Crear NewsItem con imagen real
          const newsItem = await this.prisma.newsItem.create({
            data: {
              organizationId: source.organizationId,
              sourceId: source.id,
              canonicalUrl,
              title: cleanedTitle,
              excerpt: cleanExcerpt || cleanedTitle,
              imageUrl,
              publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
              contentHash,
              rawMetadata: JSON.stringify({ originalSource: source.name }),
            },
          });

          // Deduplicación temática y agrupamiento
          const fingerprint = crypto
            .createHash('md5')
            .update(cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60))
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
    const clusters = await this.prisma.storyCluster.findMany({
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
      take: 100,
    });

    // Ordenar de manera estricta: las más recientes en fecha y hora primero
    return clusters.sort((a, b) => {
      const dateA = new Date(a.storyClusterItems?.[0]?.item?.publishedAt || a.createdAt).getTime();
      const dateB = new Date(b.storyClusterItems?.[0]?.item?.publishedAt || b.createdAt).getTime();
      return dateB - dateA;
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
        imageUrl: primaryItem.imageUrl,
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

  /**
   * Obtiene las alertas de noticias más recientes para notificaciones en segundo plano
   */
  async listLatestAlerts(organizationId: string, limit: number = 15) {
    return this.prisma.newsItem.findMany({
      where: { organizationId },
      include: {
        source: {
          select: { name: true, category: true },
        },
      },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }
}
