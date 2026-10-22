import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsSourceDto } from '@newsflow/shared-types';
import { validateSafeUrl, createSafeHttpClient } from '@newsflow/integrations';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSources(organizationId: string) {
    return this.prisma.newsSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { newsItems: true },
        },
      },
    });
  }

  async createSource(organizationId: string, dto: CreateNewsSourceDto) {
    // 1. Validar URL contra SSRF
    await validateSafeUrl(dto.url);

    // 2. Guardar fuente
    return this.prisma.newsSource.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type,
        url: dto.url,
        locale: dto.locale || 'es-CO',
        category: dto.category || 'General',
        licenseNotes: dto.licenseNotes,
        enabled: dto.enabled,
        pollingInterval: dto.pollingIntervalMinutes,
      },
    });
  }

  async testSource(id: string, organizationId: string) {
    const source = await this.prisma.newsSource.findFirst({
      where: { id, organizationId },
    });

    if (!source) {
      throw new NotFoundException('Fuente de noticias no encontrada');
    }

    await validateSafeUrl(source.url);

    const client = createSafeHttpClient();
    const startTime = Date.now();

    try {
      const response = await client.get(source.url);
      const latencyMs = Date.now() - startTime;
      const isXml = typeof response.data === 'string' && (response.data.includes('<rss') || response.data.includes('<feed') || response.data.includes('<?xml'));

      await this.prisma.newsSource.update({
        where: { id },
        data: {
          lastFetchedAt: new Date(),
          lastError: null,
        },
      });

      return {
        status: 'OK',
        latencyMs,
        contentType: response.headers['content-type'],
        isValidFeed: isXml,
        message: 'Conectividad verificada exitosamente',
      };
    } catch (err: any) {
      await this.prisma.newsSource.update({
        where: { id },
        data: {
          lastError: err.message,
        },
      });

      throw new BadRequestException(`Fallo en la prueba de la fuente: ${err.message}`);
    }
  }
}
