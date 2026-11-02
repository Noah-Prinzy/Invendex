import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { compressionMiddleware } from './common/middleware/compression.middleware';
import { mongoSanitizeMiddleware } from './common/middleware/mongo-sanitize.middleware';
import { registerRootHealthEndpoints } from './modules/health/root-health';

const parseCorsOrigins = (raw: string | undefined): string[] | boolean => {
  if (!raw || raw === '*') return true;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  registerRootHealthEndpoints(app);
  app.enableCors({
    origin: parseCorsOrigins(config.get<string>('CORS_ORIGIN')),
    credentials: true,
    exposedHeaders: ['x-request-id', 'content-disposition', 'content-length']
  });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.use(compressionMiddleware());
  app.use(mongoSanitizeMiddleware());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get<string>('API_DOCS_ENABLED') === 'true') {
    const documentConfig = new DocumentBuilder()
      .setTitle('Invendex API')
      .setDescription('Invendex Global backend v2 — public contract at /api/v1')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, documentConfig);
    app
      .getHttpAdapter()
      .get('/api/v1/openapi.json', (_req: unknown, res: { json: (doc: unknown) => void }) =>
        res.json(document)
      );
    SwaggerModule.setup('api/v1/docs', app, document, {
      swaggerOptions: { url: '/api/v1/openapi.json' }
    });
  }

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  console.log(`Invendex backend-v2 API listening on port ${port} (contract: /api/v1)`);
}

void bootstrap();
