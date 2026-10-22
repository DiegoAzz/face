import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  getLive() {
    return {
      status: 'ok',
      service: 'newsflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReady(@Res() res: Response) {
    const checks: Record<string, any> = {
      database: 'down',
      timestamp: new Date().toISOString(),
    };

    try {
      // Validar consulta directa a PostgreSQL
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';

      return res.status(HttpStatus.OK).json({
        status: 'ready',
        checks,
      });
    } catch (error: any) {
      checks.database = 'down';
      checks.error = error.message;

      // Devolver 200 OK para que Coolify/Traefik no consideren el contenedor caído
      return res.status(HttpStatus.OK).json({
        status: 'degraded',
        message: 'Base de datos en proceso de conexión',
        checks,
      });
    }
  }
}
