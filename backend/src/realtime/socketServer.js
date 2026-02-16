import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import User from '../models/User.js';

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
    console.log('[realtime] disabled');
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
      return next(new Error('Realtime auth failed'));
    }
  });

  ioInstance.on('connection', socket => {
    const { id: userId, organizationId } = socket.data.user;
    const organizationRoom = getOrganizationRoom(organizationId);
    socket.join(organizationRoom);

    console.log(
      `[realtime] connected socket=${socket.id} user=${userId} org=${organizationId}`
    );

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
      console.log(
        `[realtime] disconnected socket=${socket.id} user=${userId} reason=${reason}`
      );
    });
  });

  console.log('[realtime] socket.io initialized');
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
