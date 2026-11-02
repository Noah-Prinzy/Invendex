import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/** Requires the authenticated user's role to hold the given permission(s). */
export const RequirePermission = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
