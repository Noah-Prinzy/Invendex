import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import User from '../models/User.js';
import { logger } from '../observability/logger.js';
import { captureException } from '../observability/errorTracker.js';

let ioInstance = null;
let realtimeEnabled = false;

const extractToken = socket => {
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

const getOrganizationRoom = organizationId => `org:${organizationId}`;
const getWarehouseRoom = (organizationId, warehouseId) =>
  `warehouse:${organizationId}:${warehouseId}`;

export const initSocketServer = async (
  httpServer,
  { enabled = null } = {}
) => {
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
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
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
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
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

  ioInstance.on('connection', socket => {
    const { id: userId, organizationId } = socket.data.user;
    const organizationRoom = getOrganizationRoom(organizationId);
    socket.join(organizationRoom);

    logger.info('realtime_connected', {
      socketId: socket.id,
      userId,
      organizationId
    });

    socket.on('subscribe:warehouse', payload => {
      const warehouseId = payload?.warehouseId;
      if (!warehouseId) return;

      const room = getWarehouseRoom(organizationId, String(warehouseId));
      socket.join(room);
    });

    socket.on('unsubscribe:warehouse', payload => {
      const warehouseId = payload?.warehouseId;
      if (!warehouseId) return;

      const room = getWarehouseRoom(organizationId, String(warehouseId));
      socket.leave(room);
    });

    socket.on('disconnect', reason => {
      logger.info('realtime_disconnected', {
        socketId: socket.id,
        userId,
        organizationId,
        reason
      });
    });

    socket.on('error', error => {
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
  getOrganizationRoomName,
  getWarehouseRoomName
};
