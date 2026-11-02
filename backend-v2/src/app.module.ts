import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Connection } from 'mongoose';
import { envSchema } from './config/env.schema';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { TenantContextInterceptor } from './tenant/tenant-context.interceptor';
import { mongooseTenantPlugin } from './tenant/mongoose-tenant.plugin';
import { DomainEventsModule } from './events/domain-events.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from './modules/auth/guards/tenant.guard';
import { ChannelsModule } from './modules/channels/channels.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { EfrisModule } from './modules/efiris/efiris.module';
import { HealthModule } from './modules/health/health.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PermissionGuard } from './modules/rbac/permission.guard';
import { RbacModule } from './modules/rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env)
    }),
    ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 300 }]),
    MongooseModule.forRootAsync({
      // Read DB_URL lazily at connection time so tests can point it at an
      // in-memory server after module import (ConfigModule snapshots env at
      // import time).
      useFactory: () => ({
        uri:
          process.env.DB_URL ?? 'mongodb://127.0.0.1:27017/invendex',
        connectionFactory: (connection: Connection) => {
          connection.plugin(mongooseTenantPlugin);
          return connection;
        }
      })
    }),
    DomainEventsModule.forEnvironment(),
    AuthModule,
    RbacModule,
    HealthModule,
    AuditModule,
    EfrisModule,
    PaymentsModule,
    ChannelsModule,
    CurrencyModule,
    I18nModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor }
  ]
})
export class AppModule {}
