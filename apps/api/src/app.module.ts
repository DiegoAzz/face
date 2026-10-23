import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetaModule } from './modules/meta/meta.module';
import { YouTubeModule } from './modules/youtube/youtube.module';
import { MediaModule } from './modules/media/media.module';
import { SourcesModule } from './modules/sources/sources.module';
import { NewsModule } from './modules/news/news.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { PublicationsModule } from './modules/publications/publications.module';
import { GroupsModule } from './modules/groups/groups.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos
        limit: 120, // 120 peticiones por minuto por IP
      },
    ]),
    PrismaModule,
    AuthModule,
    MetaModule,
    YouTubeModule,
    MediaModule,
    SourcesModule,
    NewsModule,
    DraftsModule,
    PublicationsModule,
    GroupsModule,
    DashboardModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
