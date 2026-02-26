import express from 'express';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as createClient } from 'socket.io-client';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import {
  initSocketServer,
  getIo,
  getWarehouseRoomName
} from '../realtime/socketServer.js';
import { generateAccessToken } from '../utils/token.js';
import { publishInventoryUpdated } from '../realtime/publisher.js';
import { getTestDbUri } from './testDbUri.js';

let httpServer;
let baseUrl;
let clients = [];

const connectClient = (token) =>
  createClient(baseUrl, {
    transports: ['websocket'],
    reconnection: false,
    auth: { token }
  });

const connectClientWithoutAuth = () =>
  createClient(baseUrl, {
    transports: ['websocket'],
    reconnection: false
  });

const registerClient = (client) => {
  clients.push(client);
  return client;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForEvent = (emitter, eventName, timeoutMs = 4000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${eventName}"`));
    }, timeoutMs);

    emitter.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

const waitForNoEvent = (emitter, eventName, timeoutMs = 500) =>
  new Promise((resolve, reject) => {
    const handler = (payload) => {
      emitter.off(eventName, handler);
      reject(
        new Error(
          `Expected no event "${eventName}" but received payload: ${JSON.stringify(
            payload
          )}`
        )
      );
    };

    emitter.on(eventName, handler);

    setTimeout(() => {
      emitter.off(eventName, handler);
      resolve();
    }, timeoutMs);
  });

const emitWithAck = (client, eventName, payload, timeoutMs = 2000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ack on "${eventName}"`));
    }, timeoutMs);

    client.emit(eventName, payload, (ack) => {
      clearTimeout(timeout);
      resolve(ack);
    });
  });

beforeAll(async () => {
  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(getTestDbUri());
  }

  const app = express();
  httpServer = createServer(app);
  await initSocketServer(httpServer, { enabled: true });

  await new Promise((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const { port } = httpServer.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  clients = [];
  await Promise.all([Organization.deleteMany({}), User.deleteMany({})]);
});

afterEach(() => {
  for (const client of clients) {
    if (client?.connected) {
      client.disconnect();
    } else if (typeof client?.close === 'function') {
      client.close();
    }
  }
  clients = [];
});

afterAll(async () => {
  const io = getIo();
  if (io) {
    await new Promise((resolve) => io.close(resolve));
  }

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await mongoose.connection.close();
});

describe('realtime socket server', () => {
  it('allows valid JWT connections and joins organization room', async () => {
    const organization = await Organization.create({
      name: 'Socket Org',
      code: `SOCKET-${Date.now()}`
    });

    const user = await User.create({
      email: `socket-user-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      organization: organization._id
    });

    const token = generateAccessToken(user);
    const client = registerClient(connectClient(token));

    await waitForEvent(client, 'connect');
    expect(client.connected).toBe(true);
  });

  it('rejects invalid JWT connections', async () => {
    const client = registerClient(connectClient('invalid-token'));
    const err = await waitForEvent(client, 'connect_error');
    expect(String(err?.message || '')).toContain('invalid token');
  });

  it('rejects missing JWT connections', async () => {
    const client = registerClient(connectClientWithoutAuth());
    const err = await waitForEvent(client, 'connect_error');
    expect(String(err?.message || '')).toContain('token missing');
  });

  it('rejects expired JWT connections', async () => {
    const organization = await Organization.create({
      name: 'Expired Token Org',
      code: `EXP-${Date.now()}`
    });

    const user = await User.create({
      email: `expired-user-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      organization: organization._id
    });

    const expiredToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        organization: organization._id
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -1 }
    );

    const client = registerClient(connectClient(expiredToken));
    const err = await waitForEvent(client, 'connect_error');
    expect(String(err?.message || '')).toContain('invalid token');
  });

  it('isolates organization events by room', async () => {
    const orgA = await Organization.create({
      name: 'Org A',
      code: `ORGA-${Date.now()}`
    });
    const orgB = await Organization.create({
      name: 'Org B',
      code: `ORGB-${Date.now()}`
    });

    const userA = await User.create({
      email: `orga-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      organization: orgA._id
    });
    const userB = await User.create({
      email: `orgb-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      organization: orgB._id
    });

    const userA2 = await User.create({
      email: `orga-second-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'manager',
      organization: orgA._id
    });

    const clientA = registerClient(connectClient(generateAccessToken(userA)));
    const clientA2 = registerClient(connectClient(generateAccessToken(userA2)));
    const clientB = registerClient(connectClient(generateAccessToken(userB)));

    await Promise.all([
      waitForEvent(clientA, 'connect'),
      waitForEvent(clientA2, 'connect'),
      waitForEvent(clientB, 'connect')
    ]);

    let receivedA1 = false;
    let receivedA2 = false;
    let receivedB = false;

    clientA.on('inventory.updated', () => {
      receivedA1 = true;
    });
    clientA2.on('inventory.updated', () => {
      receivedA2 = true;
    });
    clientB.on('inventory.updated', () => {
      receivedB = true;
    });

    publishInventoryUpdated({
      organizationId: orgA._id,
      warehouseId: new mongoose.Types.ObjectId(),
      entityId: new mongoose.Types.ObjectId(),
      data: { reason: 'test' }
    });

    await sleep(300);

    expect(receivedA1).toBe(true);
    expect(receivedA2).toBe(true);
    expect(receivedB).toBe(false);
  });

  it('supports warehouse room subscribe and unsubscribe routing', async () => {
    const org = await Organization.create({
      name: 'Warehouse Room Org',
      code: `WHRM-${Date.now()}`
    });

    const userA = await User.create({
      email: `warehouse-a-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      organization: org._id
    });

    const userB = await User.create({
      email: `warehouse-b-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'manager',
      organization: org._id
    });

    const clientA = registerClient(connectClient(generateAccessToken(userA)));
    const clientB = registerClient(connectClient(generateAccessToken(userB)));

    await Promise.all([
      waitForEvent(clientA, 'connect'),
      waitForEvent(clientB, 'connect')
    ]);

    const warehouseId = new mongoose.Types.ObjectId().toString();
    const warehouseRoom = getWarehouseRoomName(
      String(org._id),
      String(warehouseId)
    );
    const io = getIo();

    const subscribeAck = await emitWithAck(clientA, 'subscribe:warehouse', {
      warehouseId
    });
    expect(subscribeAck).toEqual({
      ok: true,
      room: warehouseRoom
    });

    const targetedPayload = {
      warehouseId,
      message: 'warehouse scoped event'
    };

    const eventForA = waitForEvent(clientA, 'warehouse.targeted');
    const noEventForB = waitForNoEvent(clientB, 'warehouse.targeted');
    io.to(warehouseRoom).emit('warehouse.targeted', targetedPayload);

    await expect(eventForA).resolves.toEqual(targetedPayload);
    await expect(noEventForB).resolves.toBeUndefined();

    const unsubscribeAck = await emitWithAck(clientA, 'unsubscribe:warehouse', {
      warehouseId
    });
    expect(unsubscribeAck).toEqual({
      ok: true,
      room: warehouseRoom
    });

    io.to(warehouseRoom).emit('warehouse.targeted', {
      warehouseId,
      message: 'after unsubscribe'
    });

    await expect(
      waitForNoEvent(clientA, 'warehouse.targeted')
    ).resolves.toBeUndefined();
    await expect(
      waitForNoEvent(clientB, 'warehouse.targeted')
    ).resolves.toBeUndefined();
  });

  it('rate-limits inbound warehouse subscription spam', async () => {
    const originalMaxEvents = process.env.SOCKET_EVENT_MAX_EVENTS;
    const originalWindow = process.env.SOCKET_EVENT_WINDOW_MS;
    const originalViolations = process.env.SOCKET_EVENT_MAX_VIOLATIONS;
    const originalEnabled = process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED;

    process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED = 'true';
    process.env.SOCKET_EVENT_WINDOW_MS = '10000';
    process.env.SOCKET_EVENT_MAX_EVENTS = '2';
    process.env.SOCKET_EVENT_MAX_VIOLATIONS = '10';

    try {
      const org = await Organization.create({
        name: 'Limiter Org',
        code: `LIM-${Date.now()}`
      });

      const user = await User.create({
        email: `limiter-user-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'admin',
        organization: org._id
      });

      const client = registerClient(connectClient(generateAccessToken(user)));
      await waitForEvent(client, 'connect');

      const warehouseId = new mongoose.Types.ObjectId().toString();
      const ack1 = await emitWithAck(client, 'subscribe:warehouse', {
        warehouseId
      });
      const ack2 = await emitWithAck(client, 'subscribe:warehouse', {
        warehouseId
      });
      const ack3 = await emitWithAck(client, 'subscribe:warehouse', {
        warehouseId
      });

      expect(ack1.ok).toBe(true);
      expect(ack2.ok).toBe(true);
      expect(ack3).toMatchObject({
        ok: false,
        error: 'rate_limited'
      });
      expect(client.connected).toBe(true);
    } finally {
      if (originalEnabled === undefined) {
        delete process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED;
      } else {
        process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED = originalEnabled;
      }
      if (originalWindow === undefined) {
        delete process.env.SOCKET_EVENT_WINDOW_MS;
      } else {
        process.env.SOCKET_EVENT_WINDOW_MS = originalWindow;
      }
      if (originalMaxEvents === undefined) {
        delete process.env.SOCKET_EVENT_MAX_EVENTS;
      } else {
        process.env.SOCKET_EVENT_MAX_EVENTS = originalMaxEvents;
      }
      if (originalViolations === undefined) {
        delete process.env.SOCKET_EVENT_MAX_VIOLATIONS;
      } else {
        process.env.SOCKET_EVENT_MAX_VIOLATIONS = originalViolations;
      }
    }
  });

  it('disconnects socket after repeated rate-limit violations', async () => {
    const originalMaxEvents = process.env.SOCKET_EVENT_MAX_EVENTS;
    const originalWindow = process.env.SOCKET_EVENT_WINDOW_MS;
    const originalViolations = process.env.SOCKET_EVENT_MAX_VIOLATIONS;
    const originalEnabled = process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED;

    process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED = 'true';
    process.env.SOCKET_EVENT_WINDOW_MS = '10000';
    process.env.SOCKET_EVENT_MAX_EVENTS = '1';
    process.env.SOCKET_EVENT_MAX_VIOLATIONS = '1';

    try {
      const org = await Organization.create({
        name: 'Limiter Disconnect Org',
        code: `LIMDISC-${Date.now()}`
      });

      const user = await User.create({
        email: `limiter-disc-user-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'admin',
        organization: org._id
      });

      const client = registerClient(connectClient(generateAccessToken(user)));
      await waitForEvent(client, 'connect');

      const warehouseId = new mongoose.Types.ObjectId().toString();
      await emitWithAck(client, 'subscribe:warehouse', { warehouseId });
      await emitWithAck(client, 'subscribe:warehouse', { warehouseId });

      const disconnected = waitForEvent(client, 'disconnect');
      client.emit('subscribe:warehouse', { warehouseId }, () => {});

      await expect(disconnected).resolves.toBeDefined();
      expect(client.connected).toBe(false);
    } finally {
      if (originalEnabled === undefined) {
        delete process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED;
      } else {
        process.env.SOCKET_EVENT_RATE_LIMIT_ENABLED = originalEnabled;
      }
      if (originalWindow === undefined) {
        delete process.env.SOCKET_EVENT_WINDOW_MS;
      } else {
        process.env.SOCKET_EVENT_WINDOW_MS = originalWindow;
      }
      if (originalMaxEvents === undefined) {
        delete process.env.SOCKET_EVENT_MAX_EVENTS;
      } else {
        process.env.SOCKET_EVENT_MAX_EVENTS = originalMaxEvents;
      }
      if (originalViolations === undefined) {
        delete process.env.SOCKET_EVENT_MAX_VIOLATIONS;
      } else {
        process.env.SOCKET_EVENT_MAX_VIOLATIONS = originalViolations;
      }
    }
  });
});
