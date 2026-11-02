import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { compressionMiddleware } from '../src/common/middleware/compression.middleware';
import { mongoSanitizeMiddleware } from '../src/common/middleware/mongo-sanitize.middleware';
import { registerRootHealthEndpoints } from '../src/modules/health/root-health';
import { startMongoMemoryServer, stopMongoMemoryServer } from './mongo-memory';

export interface TestAppContext {
  app: INestApplication;
  uri: string;
}

/** Boots the real AppModule against an in-memory MongoDB (same wiring as main.ts). */
export async function createTestApp(): Promise<TestAppContext> {
  const uri = await startMongoMemoryServer();
  process.env.DB_URL = uri;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  registerRootHealthEndpoints(app);
  app.enableCors({ origin: true, credentials: true });
  app.use(helmet());
  app.use(cookieParser());
  app.use(compressionMiddleware());
  app.use(mongoSanitizeMiddleware());
  app.useGlobalFilters(new AllExceptionsFilter());

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

  await app.init();
  return { app, uri };
}

export async function destroyTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
  await stopMongoMemoryServer();
}
