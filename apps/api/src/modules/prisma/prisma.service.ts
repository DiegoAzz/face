import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Role, NewsSourceType, getDatabaseUrl } from '@newsflow/database';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = getDatabaseUrl();
    process.env.DATABASE_URL = dbUrl;
    super({
      datasources: {
        db: { url: dbUrl },
      },
    });
  }

  async onModuleInit() {
    try {
      const dbUrl = getDatabaseUrl();
      this.logger.log(`Inicializando base de datos en: ${dbUrl}`);

      // Crear directorio /app/data si no existe
      if (dbUrl.includes('/app/data')) {
        const dir = '/app/data';
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      await this.ensureSchemaAndSeed();
      await this.$connect();
      this.logger.log('Base de datos conectada y verificada.');
    } catch (error: any) {
      this.logger.warn(`Aviso en conexión inicial: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión con base de datos cerrada.');
  }

  private async ensureSchemaAndSeed() {
    const dbUrl = getDatabaseUrl();
    try {
      // Sincronizar tablas
      execSync('npx prisma db push --skip-generate --schema=./packages/database/prisma/schema.prisma', {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'inherit',
      });

      await this.$connect();
      const count = await this.user.count();
      if (count === 0) {
        await this.runInitialSeed();
      }
    } catch (error: any) {
      this.logger.error(`Error asegurando esquema: ${error.message}`);
    }
  }

  private async runInitialSeed() {
    this.logger.log('Sembrando usuario inicial y fuentes oficiales...');

    const org = await this.organization.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Redacción NewsFlow Colombia',
        timezone: 'America/Bogota',
        status: 'ACTIVE',
      },
    });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('AdminSecure2026!', salt);

    const admin = await this.user.upsert({
      where: { email: 'admin@newsflow.local' },
      update: {},
      create: {
        email: 'admin@newsflow.local',
        passwordHash,
        status: 'ACTIVE',
      },
    });

    await this.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: admin.id,
        },
      },
      update: { role: Role.SUPERADMIN },
      create: {
        organizationId: org.id,
        userId: admin.id,
        role: Role.SUPERADMIN,
      },
    });

    const sources = [
      {
        name: 'El Tiempo - Colombia',
        type: NewsSourceType.RSS,
        url: 'https://www.eltiempo.com/rss/colombia.xml',
        locale: 'es-CO',
        category: 'Colombia',
        licenseNotes: 'Sindicación oficial RSS con cita canónica.',
        pollingInterval: 30,
      },
      {
        name: 'El Espectador - Actualidad',
        type: NewsSourceType.RSS,
        url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml',
        locale: 'es-CO',
        category: 'Actualidad',
        licenseNotes: 'Sindicación RSS pública para actualidad nacional.',
        pollingInterval: 30,
      },
      {
        name: 'Portafolio - Economía',
        type: NewsSourceType.RSS,
        url: 'https://www.portafolio.co/rss/economia.xml',
        locale: 'es-CO',
        category: 'Economía',
        licenseNotes: 'Titulares y metadatos económicos con enlace de origen.',
        pollingInterval: 45,
      },
    ];

    for (const src of sources) {
      await this.newsSource.upsert({
        where: {
          organizationId_url: {
            organizationId: org.id,
            url: src.url,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          name: src.name,
          type: src.type,
          url: src.url,
          locale: src.locale,
          category: src.category,
          licenseNotes: src.licenseNotes,
          pollingInterval: src.pollingInterval,
          enabled: true,
        },
      });
    }

    this.logger.log('Datos iniciales sembrados con éxito (admin@newsflow.local / AdminSecure2026!)');
  }
}
