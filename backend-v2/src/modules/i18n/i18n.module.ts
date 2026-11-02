import {
  Module,
  type NestModule,
  type MiddlewareConsumer
} from '@nestjs/common';
import { I18nController } from './i18n.controller';
import { I18nMiddleware } from './i18n.middleware';
import { I18nService } from './i18n.service';

@Module({
  controllers: [I18nController],
  providers: [I18nService, I18nMiddleware],
  exports: [I18nService]
})
export class I18nModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
