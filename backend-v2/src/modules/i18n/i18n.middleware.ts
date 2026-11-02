import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { I18nService } from './i18n.service';

/** Resolves the request locale from `x-locale` or `Accept-Language`. */
@Injectable()
export class I18nMiddleware implements NestMiddleware {
  constructor(private readonly i18n: I18nService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers['x-locale'];
    const acceptLanguage = String(req.headers['accept-language'] ?? '')
      .split(',')[0]
      ?.split(';')[0];
    req.locale = this.i18n.normalize(
      (Array.isArray(header) ? header[0] : header) ?? acceptLanguage
    );
    next();
  }
}
