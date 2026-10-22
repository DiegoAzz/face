import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus, DraftStatus } from '@newsflow/database';
import { MockEditorialLLMAdapter, ExternalLLMAdapter, LLMAdapter } from '@newsflow/integrations';
import * as crypto from 'crypto';

@Injectable()
export class NewsService {
  private llmAdapter: LLMAdapter;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.LLM_API_KEY) {
      this.llmAdapter = new ExternalLLMAdapter();
    } else {
      this.llmAdapter = new MockEditorialLLMAdapter();
    }
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
