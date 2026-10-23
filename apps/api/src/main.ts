import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getDatabaseUrl } from '@newsflow/database';

async function bootstrap() {
  // Asegurar variables de entorno críticas por defecto (Base de datos embebida autónoma)
  process.env.DATABASE_URL = getDatabaseUrl();
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET || 'newsflow_super_secret_session_key_2026_xyz_dev';
  process.env.TOKEN_ENCRYPTION_KEY =
    process.env.TOKEN_ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const logger = new Logger('NewsFlow-API');
  const app = await NestFactory.create(AppModule);

  // 1. Cookies HttpOnly seguras y soporte de videos en payload
  app.use(cookieParser());
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ limit: '60mb', extended: true }));

  // 2. Filtro global de excepciones con sanitización de secretos
  app.useGlobalFilters(new HttpExceptionFilter());

  // 3. Prefijo global /api (con exclusión de endpoints healthchecks para Coolify)
  app.setGlobalPrefix('api', {
    exclude: ['health/live', 'health/ready'],
  });

  // 4. Servir frontend SPA estático si está compilado (despliegue all-in-one en Coolify)
  const candidatePaths = [
    path.join(__dirname, '../web/dist'),
    path.join(__dirname, '../../web/dist'),
    path.join(__dirname, '../../../apps/web/dist'),
    path.join(process.cwd(), 'apps/web/dist'),
  ];
  const staticPath = candidatePaths.find((p) => fs.existsSync(p));

  if (staticPath) {
    logger.log(`Sirviendo frontend estático desde: ${staticPath}`);
    app.use(express.static(staticPath));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      } else {
        next();
      }
    });
  } else {
    logger.warn('Frontend estático no encontrado. Activando página de diagnóstico');
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path === '/' || req.path === '/login') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>NewsFlow AI</title><style>body{font-family:system-ui;padding:3rem;background:#090d16;color:#e2e8f0;text-align:center;}h1{color:#38bdf8;}.card{background:#1e293b;padding:2rem;border-radius:12px;max-width:500px;margin:2rem auto;border:1px solid #334155;}</style></head><body><div class="card"><h1>NewsFlow AI Operacional</h1><p>Servicio activo en Coolify VPS.</p><p><a style="color:#38bdf8" href="/health/live">Ver Estado en Vivo</a></p></div></body></html>'
        );
      }
      next();
    });
  }

  // 5. CORS restrictivo y seguro
  const allowedOrigins = [
    process.env.APP_URL || 'https://face.appzplay.online',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 6. Documentación Swagger / OpenAPI
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NewsFlow AI — API')
      .setDescription('Documentación de la API de curación, verificación y publicación en Facebook')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`NewsFlow AI escuchando en http://0.0.0.0:${port}`);
  logger.log(`Frontend y API listos para producción`);

  // Forwarder secundario en puerto 80 si el puerto configurado es distinto
  if (port !== 80) {
    try {
      const http = await import('http');
      const forwarder = http.createServer((req, res) => {
        const proxyReq = http.request(
          {
            host: '127.0.0.1',
            port: port,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        proxyReq.on('error', () => {
          res.writeHead(502);
          res.end('Proxy forward error');
        });
        req.pipe(proxyReq);
      });
      forwarder.listen(80, '0.0.0.0', () => {
        logger.log(`Enrutador secundario activo en puerto 80 -> ${port}`);
      });
      forwarder.on('error', (err: any) => {
        logger.warn(`Puerto 80 no disponible: ${err.message}`);
      });
    } catch {
      // Ignorar si no se tienen permisos
    }
  }
}

bootstrap();
