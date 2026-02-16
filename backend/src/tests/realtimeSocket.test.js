import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { io as createClient } from 'socket.io-client';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { initSocketServer, getIo } from '../realtime/socketServer.js';
import { generateAccessToken } from '../utils/token.js';
import { publishInventoryUpdated } from '../realtime/publisher.js';
import { getTestDbUri } from './testDbUri.js';

let httpServer;
let baseUrl;

const connectClient = token =>
  createClient(baseUrl, {
    transports: ['websocket'],
    reconnection: false,
    auth: { token }
  });

const waitForEvent = (emitter, eventName, timeoutMs = 4000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${eventName}"`));
    }, timeoutMs);

    emitter.once(eventName, payload => {
      clearTimeout(timeout);
      resolve(payload);
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

  await new Promise(resolve => {
    httpServer.listen(0, '127.0.0.1', () => {
      const { port } = httpServer.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([Organization.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  const io = getIo();
  if (io) {
    await new Promise(resolve => io.close(resolve));
  }

  if (httpServer) {
    await new Promise(resolve => httpServer.close(resolve));
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
    const client = connectClient(token);

    await waitForEvent(client, 'connect');
    expect(client.connected).toBe(true);

    client.disconnect();
  });

  it('rejects invalid JWT connections', async () => {
    const client = connectClient('invalid-token');
    const err = await waitForEvent(client, 'connect_error');
    expect(String(err?.message || '')).toContain('invalid token');
    client.close();
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

    const clientA = connectClient(generateAccessToken(userA));
    const clientB = connectClient(generateAccessToken(userB));

    await Promise.all([
      waitForEvent(clientA, 'connect'),
      waitForEvent(clientB, 'connect')
    ]);

    let receivedA = false;
    let receivedB = false;

    clientA.on('inventory.updated', () => {
      receivedA = true;
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

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(receivedA).toBe(true);
    expect(receivedB).toBe(false);

    clientA.disconnect();
    clientB.disconnect();
  });
});
