import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('NewsFlow-API');
  const app = await NestFactory.create(AppModule);

  // 1. Cookies HttpOnly seguras
  app.use(cookieParser());

  // 2. Filtro global de excepciones con sanitización de secretos
  app.useGlobalFilters(new HttpExceptionFilter());

  // 3. Prefijo global /api (con exclusión de endpoints healthchecks para Coolify)
  app.setGlobalPrefix('api', {
    exclude: ['health/live', 'health/ready'],
  });

  // 4. CORS restrictivo y seguro
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

  // 5. Documentación Swagger / OpenAPI
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

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`NewsFlow AI Backend escuchando en http://0.0.0.0:${port}`);
  logger.log(`Rutas principales activas en /api/... y healthchecks en /health/...`);
}

bootstrap();
