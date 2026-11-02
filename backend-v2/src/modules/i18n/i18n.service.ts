import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LOCALE_MESSAGES } from './catalogs';

@Injectable()
export class I18nService {
  constructor(private readonly config: ConfigService) {}

  defaultLocale(): string {
    return this.config.get<string>('DEFAULT_LOCALE') ?? 'en';
  }

  supportedLocales(): string[] {
    return String(this.config.get<string>('SUPPORTED_LOCALES') ?? 'en')
      .split(',')
      .map((locale) => locale.trim().toLowerCase())
      .filter(Boolean);
  }

  isSupported(locale: string): boolean {
    const tag = String(locale ?? '')
      .trim()
      .toLowerCase()
      .split('-')[0];
    return this.supportedLocales().includes(tag);
  }

  /** Maps e.g. 'en-US' → 'en', 'lg' → 'lg'; falls back to the default. */
  normalize(locale: string | null | undefined): string {
    return this.isSupported(locale ?? '')
      ? this.baseTag(locale)
      : this.defaultLocale();
  }

  private baseTag(locale: string | null | undefined): string {
    return String(locale ?? '')
      .trim()
      .toLowerCase()
      .split('-')[0];
  }

  translate(
    key: string,
    locale?: string,
    params?: Record<string, string>
  ): string {
    const resolved = this.normalize(locale ?? this.defaultLocale());
    const catalog = LOCALE_MESSAGES[resolved] ?? LOCALE_MESSAGES.en;
    let message = catalog[key] ?? LOCALE_MESSAGES.en[key] ?? key;
    for (const [name, value] of Object.entries(params ?? {})) {
      message = message.replaceAll(`{{${name}}}`, value);
    }
    return message;
  }

  messages(locale?: string): Record<string, string> {
    return LOCALE_MESSAGES[this.normalize(locale)] ?? LOCALE_MESSAGES.en;
  }
}
