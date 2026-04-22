import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  const normalizeOrigin = (origin: string) => origin.replace(/\/$/, '');
  const exactConfiguredOrigins = new Set(configuredOrigins.map(normalizeOrigin));
  const defaultOrigins = [
    'https://ledgera-five.vercel.app',
    'https://ledgera-1x1tr7ism-gulceds-projects.vercel.app',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
    'http://localhost:3004',
    'http://127.0.0.1:3004',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const exactAllowedOrigins = new Set([...defaultOrigins, ...configuredOrigins].map(normalizeOrigin));
  const previewOriginPatterns = [/^https:\/\/ledgera-.*-gulceds-projects\.vercel\.app$/];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (
        exactAllowedOrigins.has(normalizedOrigin)
        || previewOriginPatterns.some((pattern) => pattern.test(normalizedOrigin))
      ) {
        callback(null, true);
        return;
      }

      if (exactConfiguredOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ledgera Backend API')
    .setDescription(
      [
        'Interactive API documentation for the Ledgera transaction workflow platform.',
        'Protected endpoints expect actor context through request headers: x-user-id, x-user-name, x-user-role.',
        'Supported roles: admin, operations, finance, agent.',
      ].join(' '),
    )
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Ledgera API Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
