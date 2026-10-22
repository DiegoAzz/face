import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DraftStatus } from '@newsflow/database';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const [
      totalSources,
      activeSources,
      totalNewsItems,
      totalStories,
      pendingReviewDrafts,
      scheduledJobs,
      publishedJobs,
      failedJobs,
      connectedPages,
    ] = await Promise.all([
      this.prisma.newsSource.count({ where: { organizationId } }),
      this.prisma.newsSource.count({ where: { organizationId, enabled: true } }),
      this.prisma.newsItem.count({ where: { organizationId } }),
      this.prisma.storyCluster.count({ where: { organizationId } }),
      this.prisma.draft.count({ where: { organizationId, status: DraftStatus.REVIEW } }),
      this.prisma.publicationJob.count({ where: { organizationId, status: DraftStatus.SCHEDULED } }),
      this.prisma.publicationJob.count({ where: { organizationId, status: DraftStatus.PUBLISHED } }),
      this.prisma.publicationJob.count({
        where: {
          organizationId,
          status: { in: [DraftStatus.FAILED_RETRYABLE, DraftStatus.FAILED_FINAL] },
        },
      }),
      this.prisma.facebookPage.count({ where: { organizationId } }),
    ]);

    // Próximas publicaciones programadas
    const upcomingPublications = await this.prisma.publicationJob.findMany({
      where: {
        organizationId,
        status: DraftStatus.SCHEDULED,
      },
      include: {
        draft: { select: { title: true, riskLevel: true } },
        page: { select: { pageName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    return {
      metrics: {
        totalSources,
        activeSources,
        totalNewsItems,
        totalStories,
        pendingReviewDrafts,
        scheduledJobs,
        publishedJobs,
        failedJobs,
        connectedPages,
      },
      upcomingPublications,
      timestamp: new Date().toISOString(),
    };
  }
}
