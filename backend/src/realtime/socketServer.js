import { Server as SocketIOServer } from 'socket.io';
import User from '../models/User.js';
import { createSocketRateLimiter } from './socketRateLimiter.js';
import { logger } from '../observability/logger.js';
import { captureException } from '../observability/errorTracker.js';
import { getSocketCorsOrigin } from '../config/envConfig.js';
import { verifyAccessToken } from '../utils/token.js';

let ioInstance = null;
let realtimeEnabled = false;
const onlineUsersByOrganization = new Map();

const extractToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) {
    const raw = String(authToken).trim();
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw;
  }

  const headerToken =
    socket.handshake?.headers?.authorization ||
    socket.handshake?.auth?.authorization ||
    '';

  if (String(headerToken).startsWith('Bearer ')) {
    return String(headerToken).slice(7).trim();
  }

  return '';
};

const getOrganizationRoom = (organizationId) => `org:${organizationId}`;
const getWarehouseRoom = (organizationId, warehouseId) =>
  `warehouse:${organizationId}:${warehouseId}`;

const getOrCreateOrganizationPresenceMap = (organizationId) => {
  const key = String(organizationId);
  if (!onlineUsersByOrganization.has(key)) {
    onlineUsersByOrganization.set(key, new Map());
  }
  return onlineUsersByOrganization.get(key);
};

const addOnlineUserSession = ({ organizationId, socketId, user }) => {
  const organizationMap = getOrCreateOrganizationPresenceMap(organizationId);
  const userId = String(user.id);
  const existing = organizationMap.get(userId) || {
    userId,
    email: user.email || null,
    role: user.role || null,
    socketIds: new Set(),
    connectedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  };

  existing.socketIds.add(String(socketId));
  existing.lastSeenAt = new Date().toISOString();
  organizationMap.set(userId, existing);
};

const removeOnlineUserSession = ({ organizationId, socketId, userId }) => {
  const key = String(organizationId);
  const organizationMap = onlineUsersByOrganization.get(key);
  if (!organizationMap) return;

  const existing = organizationMap.get(String(userId));
  if (!existing) return;

  existing.socketIds.delete(String(socketId));
  existing.lastSeenAt = new Date().toISOString();

  if (existing.socketIds.size === 0) {
    organizationMap.delete(String(userId));
  } else {
    organizationMap.set(String(userId), existing);
  }

  if (organizationMap.size === 0) {
    onlineUsersByOrganization.delete(key);
  }
};

export const getOnlineUsersByOrganization = (organizationId) => {
  const organizationMap = onlineUsersByOrganization.get(String(organizationId));
  if (!organizationMap) return [];

  return Array.from(organizationMap.values())
    .map((user) => ({
      userId: user.userId,
      email: user.email,
      role: user.role,
      sessions: user.socketIds.size,
      connectedAt: user.connectedAt,
      lastSeenAt: user.lastSeenAt
    }))
    .sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
};

export const initSocketServer = async (httpServer, { enabled = null } = {}) => {
  realtimeEnabled =
    typeof enabled === 'boolean'
      ? enabled
      : String(process.env.REALTIME_ENABLED || '')
          .toLowerCase()
          .trim() === 'true';

  if (!realtimeEnabled) {
    logger.info('realtime_disabled');
    return null;
  }

  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: getSocketCorsOrigin(),
      credentials: true
    }
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Realtime auth failed: token missing'));
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        return next(new Error('Realtime auth failed: invalid token'));
      }

      const user = await User.findById(decoded.id).select(
        '_id email role organization'
      );
      if (!user) {
        return next(new Error('Realtime auth failed: user not found'));
      }

      if (!user.organization) {
        return next(
          new Error('Realtime auth failed: user has no organization')
        );
      }

      socket.data.user = {
        id: user._id.toString(),
        organizationId: user.organization.toString(),
        role: user.role,
        email: user.email
      };

      return next();
    } catch {
      logger.warn('realtime_auth_failed', {
        socketId: socket.id || null
      });
      return next(new Error('Realtime auth failed'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const { id: userId, organizationId } = socket.data.user;
    const inboundRateLimiter = createSocketRateLimiter({
      socketId: socket.id,
      organizationId,
      userId
    });

    const organizationRoom = getOrganizationRoom(organizationId);
    socket.join(organizationRoom);
    addOnlineUserSession({
      organizationId,
      socketId: socket.id,
      user: socket.data.user
    });

    logger.info('realtime_connected', {
      socketId: socket.id,
      userId,
      organizationId
    });

    socket.on('subscribe:warehouse', (payload, acknowledge) => {
      const allowed = inboundRateLimiter.guardInboundEvent({
        eventName: 'subscribe:warehouse',
        acknowledge,
        disconnect: (close) => socket.disconnect(close)
      });
      if (!allowed) {
        return;
      }

      const warehouseId = payload?.warehouseId;
      if (!warehouseId) {
        if (typeof acknowledge === 'function') {
          acknowledge({
            ok: false,
            error: 'warehouseId is required'
          });
        }
        return;
      }

      const room = getWarehouseRoom(organizationId, String(warehouseId));
      socket.join(room);
      if (typeof acknowledge === 'function') {
        acknowledge({
          ok: true,
          room
        });
      }
    });

    socket.on('unsubscribe:warehouse', (payload, acknowledge) => {
      const allowed = inboundRateLimiter.guardInboundEvent({
        eventName: 'unsubscribe:warehouse',
        acknowledge,
        disconnect: (close) => socket.disconnect(close)
      });
      if (!allowed) {
        return;
      }

      const warehouseId = payload?.warehouseId;
      if (!warehouseId) {
        if (typeof acknowledge === 'function') {
          acknowledge({
            ok: false,
            error: 'warehouseId is required'
          });
        }
        return;
      }

      const room = getWarehouseRoom(organizationId, String(warehouseId));
      socket.leave(room);
      if (typeof acknowledge === 'function') {
        acknowledge({
          ok: true,
          room
        });
      }
    });

    socket.on('disconnect', (reason) => {
      removeOnlineUserSession({
        organizationId,
        socketId: socket.id,
        userId
      });
      logger.info('realtime_disconnected', {
        socketId: socket.id,
        userId,
        organizationId,
        reason
      });
    });

    socket.on('error', (error) => {
      logger.warn('realtime_socket_error', {
        socketId: socket.id,
        userId,
        organizationId,
        reason: error?.message || 'Unknown socket error'
      });
      captureException(error, {
        scope: 'realtime_socket',
        socketId: socket.id,
        userId,
        organizationId
      }).catch(() => {});
    });
  });

  logger.info('realtime_initialized');
  return ioInstance;
};

export const getIo = () => ioInstance;
export const isRealtimeEnabled = () => realtimeEnabled;
export const getOrganizationRoomName = getOrganizationRoom;
export const getWarehouseRoomName = getWarehouseRoom;

export default {
  initSocketServer,
  getIo,
  isRealtimeEnabled,
  getOnlineUsersByOrganization,
  getOrganizationRoomName,
  getWarehouseRoomName
};
