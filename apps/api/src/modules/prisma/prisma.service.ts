import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Role, NewsSourceType } from '@newsflow/database';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión con PostgreSQL establecida exitosamente.');

      // Inicialización automática de esquema y seeder si es primera ejecución
      await this.ensureSchemaAndSeed();
    } catch (error: any) {
      this.logger.warn(`PostgreSQL no disponible aún (${error.message}).`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión con PostgreSQL cerrada.');
  }

  private async ensureSchemaAndSeed() {
    try {
      // Intentar contar usuarios para verificar si la tabla existe
      const count = await this.user.count();
      if (count === 0) {
        await this.runInitialSeed();
      }
    } catch (error: any) {
      this.logger.log('Tablas iniciales no encontradas. Sincronizando esquema Prisma...');
      try {
        execSync('npx prisma db push --skip-generate --schema=./packages/database/prisma/schema.prisma', {
          stdio: 'inherit',
        });
        await this.runInitialSeed();
      } catch (pushErr: any) {
        this.logger.error(`Error sincronizando tablas Prisma: ${pushErr.message}`);
      }
    }
  }

  private async runInitialSeed() {
    this.logger.log('Sembrando datos iniciales reales para NewsFlow AI...');

    // 1. Organización inicial
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

    // 2. Administrador inicial
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

    // 3. Membresía Superadmin
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

    // 4. Fuentes RSS oficiales reales de Colombia
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

    this.logger.log('Datos iniciales sembrados con éxito. Usuario admin@newsflow.local listo.');
  }
}

