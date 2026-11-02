export const EVENTS_QUEUE = 'invendex.events';
export const JOBS_QUEUE = 'invendex.jobs';

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  organizationId: string | null;
  payload: T;
  occurredAt: string;
}

export type DomainEventHandler<T = unknown> = (
  event: DomainEvent<T>
) => void | Promise<void>;

export const DomainEventTypes = {
  AUTH_REGISTERED: 'auth.registered',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout'
} as const;
