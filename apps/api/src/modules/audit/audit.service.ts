import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        actor: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
