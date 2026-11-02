import type { AuthUser } from '../common/types/auth-user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    organizationId?: string;
    locale?: string;
  }
}
