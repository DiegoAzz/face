import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando inicialización de datos (seed) para NewsFlow AI...');

  // 1. Crear Organización por defecto
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Redacción NewsFlow Colombia',
      timezone: 'America/Bogota',
      status: 'ACTIVE',
    },
  });

  console.log(`Organización configurada: ${org.name} (${org.id})`);

  // 2. Crear Superadministrador inicial
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash('AdminSecure2026!', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@newsflow.local' },
    update: {},
    create: {
      email: 'admin@newsflow.local',
      passwordHash,
      status: 'ACTIVE',
    },
  });

  console.log(`Usuario administrador creado: ${adminUser.email}`);

  // 3. Crear Membresía con Rol SUPERADMIN
  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: adminUser.id,
      },
    },
    update: { role: 'SUPERADMIN' },
    create: {
      organizationId: org.id,
      userId: adminUser.id,
      role: 'SUPERADMIN',
    },
  });

  // 4. Registrar Fuentes RSS Públicas y Oficiales de Colombia (Sin datos ficticios)
  const realSources = [
    {
      name: 'El Tiempo - Colombia',
      type: 'RSS',
      url: 'https://www.eltiempo.com/rss/colombia.xml',
      locale: 'es-CO',
      category: 'Colombia',
      licenseNotes: 'Uso de titulares y resúmenes con cita y enlace canónico de origen según términos del medio.',
      pollingInterval: 30,
    },
    {
      name: 'El Espectador - Actualidad',
      type: 'RSS',
      url: 'https://www.elespectador.com/arc/outboundfeeds/rss/?outputType=xml',
      locale: 'es-CO',
      category: 'Actualidad',
      licenseNotes: 'Titulares y metadatos de sindicación pública RSS con enlace canónico.',
      pollingInterval: 30,
    },
    {
      name: 'Portafolio - Economía',
      type: 'RSS',
      url: 'https://www.portafolio.co/rss/economia.xml',
      locale: 'es-CO',
      category: 'Economía',
      licenseNotes: 'Sindicación RSS pública para actualidad económica nacional.',
      pollingInterval: 45,
    },
  ];

  for (const src of realSources) {
    await prisma.newsSource.upsert({
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

  // 5. Ajustes de Sistema iniciales
  await prisma.systemSetting.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'EDITORIAL_POLICIES',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      key: 'EDITORIAL_POLICIES',
      valueJson: JSON.stringify({
        autoPublishEnabled: false,
        requireHumanReviewForRisks: true,
        defaultTimezone: 'America/Bogota',
        maxPostsPerDay: 3,
        preferredPublishSlots: ['08:00', '12:00', '18:00'],
      }),
    },
  });

  console.log('Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
