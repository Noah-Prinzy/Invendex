import { logger } from '../observability/logger.js';

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(
    String(value).trim().toLowerCase()
  );
};

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const getLimiterConfig = () => ({
  enabled: parseBoolean(process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED, true),
  windowMs: parseInteger(process.env.SOCKET_EVENT_WINDOW_MS, 10_000),
  maxEvents: parseInteger(process.env.SOCKET_EVENT_MAX_EVENTS, 60),
  maxViolations: parseInteger(process.env.SOCKET_EVENT_MAX_VIOLATIONS, 3)
});

export const createSocketRateLimiter = ({
  socketId,
  organizationId,
  userId
}) => {
  const config = getLimiterConfig();
  const state = {
    windowStartedAt: Date.now(),
    count: 0,
    violations: 0
  };

  const resetWindowIfExpired = (now) => {
    if (now - state.windowStartedAt < config.windowMs) {
      return;
    }
    state.windowStartedAt = now;
    state.count = 0;
  };

  const handleViolation = ({ eventName, acknowledge, disconnect }) => {
    state.violations += 1;

    logger.warn('socket_event_rate_limited', {
      socketId,
      organizationId: String(organizationId || ''),
      userId: String(userId || ''),
      eventName,
      violations: state.violations,
      maxViolations: config.maxViolations
    });

    if (typeof acknowledge === 'function') {
      const now = Date.now();
      const retryAfterMs = Math.max(
        0,
        config.windowMs - (now - state.windowStartedAt)
      );

      acknowledge({
        ok: false,
        error: 'rate_limited',
        retryAfterMs
      });
    }

    if (state.violations > config.maxViolations) {
      logger.warn('socket_event_rate_limit_disconnect', {
        socketId,
        organizationId: String(organizationId || ''),
        userId: String(userId || ''),
        violations: state.violations
      });
      disconnect(true);
    }
  };

  const guardInboundEvent = ({ eventName, acknowledge, disconnect }) => {
    if (!config.enabled) {
      return true;
    }

    const now = Date.now();
    resetWindowIfExpired(now);
    state.count += 1;

    if (state.count <= config.maxEvents) {
      return true;
    }

    handleViolation({ eventName, acknowledge, disconnect });
    return false;
  };

  return {
    guardInboundEvent
  };
};

export default {
  createSocketRateLimiter
};
