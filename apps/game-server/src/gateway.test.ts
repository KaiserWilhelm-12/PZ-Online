import { createServer, type Server as HttpServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  CloseCode,
  PROTOCOL_VERSION,
  ServerEnvelope,
  type ClientMessage,
} from '@lanternfall/protocol';
import { createIdentityVerifier, signDevToken } from './auth';
import { GameGateway, type GatewayConfig } from './gateway';

const TEST_SECRET = 'lanternfall-test-secret-0123456789abcdef';
const SERVER_ID = '99999999-9999-4999-8999-999999999999';
const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const CHARACTER_ID = '22222222-2222-4222-8222-222222222222';

const tokenFor = (playerId = PLAYER_ID, characterId = CHARACTER_ID): Promise<string> =>
  signDevToken({ secret: TEST_SECRET, playerId, characterId });

interface Harness {
  server: HttpServer;
  gateway: GameGateway;
  url: string;
  close: () => Promise<void>;
}

const harnesses: Harness[] = [];

afterEach(async () => {
  while (harnesses.length > 0) {
    const harness = harnesses.pop();
    if (harness) {
      await harness.close();
    }
  }
});

async function startGateway(overrides: Partial<GatewayConfig> = {}): Promise<Harness> {
  const verifyToken = createIdentityVerifier({
    devAuthEnabled: true,
    devJwtSecret: TEST_SECRET,
  });

  const config: GatewayConfig = {
    serverId: SERVER_ID,
    helloTimeoutMs: 1000,
    heartbeatIntervalMs: 100,
    deadTimeoutMs: 5000,
    sweepIntervalMs: 25,
    reconnectGraceMs: 5000,
    tickRate: 20,
    maxPayloadBytes: 4096,
    maxPlayers: 10,
    verifyToken,
    ...overrides,
  };

  const server = createServer((_request, response) => {
    response.writeHead(404);
    response.end();
  });
  const gateway = new GameGateway(config);
  gateway.attach(server);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      reject(error);
    };
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected a TCP address');
  }

  const harness: Harness = {
    server,
    gateway,
    url: `ws://127.0.0.1:${address.port}/ws`,
    close: async () => {
      gateway.close();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
  harnesses.push(harness);
  return harness;
}

class TestClient {
  readonly ws: WebSocket;
  private readonly queue: ServerEnvelope[] = [];
  private waiter: ((envelope: ServerEnvelope) => void) | null = null;
  private closeInfo: { code: number; reason: string } | null = null;
  private closeWaiter: ((info: { code: number; reason: string }) => void) | null = null;

  private constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('error', () => {
      // Close codes and messages are asserted through the close event.
    });
    this.ws.on('message', (data) => {
      const parsed = ServerEnvelope.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) {
        throw new Error('Server sent an invalid envelope');
      }
      this.deliver(parsed.data);
    });
    this.ws.on('close', (code, reason) => {
      this.closeInfo = { code, reason: reason.toString() };
      this.closeWaiter?.(this.closeInfo);
      this.closeWaiter = null;
    });
  }

  static async connect(url: string): Promise<TestClient> {
    const client = new TestClient(url);
    await new Promise<void>((resolve, reject) => {
      client.ws.once('open', () => {
        resolve();
      });
      client.ws.once('error', reject);
    });
    return client;
  }

  private deliver(envelope: ServerEnvelope): void {
    if (this.waiter) {
      const waiter = this.waiter;
      this.waiter = null;
      waiter(envelope);
      return;
    }
    this.queue.push(envelope);
  }

  async next(timeoutMs = 2000): Promise<ServerEnvelope> {
    return this.nextMatching((envelope) => envelope.msg.type !== 'snapshot', timeoutMs);
  }

  async nextSnapshot(timeoutMs = 2000): Promise<ServerEnvelope> {
    return this.nextMatching((envelope) => envelope.msg.type === 'snapshot', timeoutMs);
  }

  private async nextMatching(
    matches: (envelope: ServerEnvelope) => boolean,
    timeoutMs: number,
  ): Promise<ServerEnvelope> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const envelope = await this.takeNext(Math.max(1, deadline - Date.now()));
      if (matches(envelope)) {
        return envelope;
      }
    }
    throw new Error('Timed out waiting for a matching server message');
  }

  private takeNext(timeoutMs: number): Promise<ServerEnvelope> {
    const queued = this.queue.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    return new Promise<ServerEnvelope>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        reject(new Error('Timed out waiting for a server message'));
      }, timeoutMs);
      timer.unref();
      this.waiter = (envelope) => {
        clearTimeout(timer);
        resolve(envelope);
      };
    });
  }

  closed(timeoutMs = 2000): Promise<{ code: number; reason: string }> {
    if (this.closeInfo) {
      return Promise.resolve(this.closeInfo);
    }
    return new Promise<{ code: number; reason: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.closeWaiter = null;
        reject(new Error('Timed out waiting for the socket to close'));
      }, timeoutMs);
      timer.unref();
      this.closeWaiter = (info) => {
        clearTimeout(timer);
        resolve(info);
      };
    });
  }

  sendRaw(value: unknown): void {
    this.ws.send(JSON.stringify(value));
  }

  send(cs: number, msg: ClientMessage): void {
    this.sendRaw({ v: PROTOCOL_VERSION, cs, msg });
  }

  async hello(token?: string, reconnectToken?: string): Promise<ServerEnvelope> {
    const resolvedToken = token ?? (await tokenFor());
    this.send(1, {
      type: 'hello',
      token: resolvedToken,
      serverId: SERVER_ID,
      ...(reconnectToken ? { reconnectToken } : {}),
    });
    return this.next();
  }

  close(): void {
    this.ws.close();
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition was not met in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const reconnectTokenFrom = (envelope: ServerEnvelope): string => {
  if (envelope.msg.type !== 'welcome') {
    throw new Error(`Expected welcome, received ${envelope.msg.type}`);
  }
  return envelope.msg.reconnectToken;
};

describe('GameGateway handshake', () => {
  it('closes a connection that never sends hello', async () => {
    const harness = await startGateway({ helloTimeoutMs: 100 });
    const client = await TestClient.connect(harness.url);

    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.HelloTimeout);
    expect(harness.gateway.getMetrics().helloTimedOut).toBe(1);
  });

  it('closes a connection with an invalid JWT', async () => {
    const harness = await startGateway();
    const client = await TestClient.connect(harness.url);
    client.send(1, { type: 'hello', token: 'not-a-jwt', serverId: SERVER_ID });

    const error = await client.next();
    expect(error.msg).toMatchObject({ type: 'error', code: 'UNAUTHENTICATED', fatal: true });
    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.Unauthenticated);
    expect(harness.gateway.getMetrics().unauthenticated).toBe(1);
  });

  it('accepts a valid hello and returns a welcome', async () => {
    const harness = await startGateway();
    const client = await TestClient.connect(harness.url);

    const welcome = await client.hello();
    expect(welcome.msg.type).toBe('welcome');
    if (welcome.msg.type === 'welcome') {
      expect(welcome.msg.playerId).toBe(PLAYER_ID);
      expect(welcome.msg.characterId).toBe(CHARACTER_ID);
      expect(welcome.msg.tickRate).toBe(20);
      expect(welcome.msg.reconnectToken.length).toBeGreaterThanOrEqual(32);
    }
    expect(harness.gateway.getMetrics().authenticatedSessions).toBe(1);
    expect(harness.gateway.sessionCount).toBe(1);
  });

  it('closes an existing session when the same character signs in again', async () => {
    const harness = await startGateway();
    const first = await TestClient.connect(harness.url);
    await first.hello();
    const second = await TestClient.connect(harness.url);
    const secondWelcome = await second.hello();

    expect(secondWelcome.msg.type).toBe('welcome');
    const firstClosed = await first.closed();
    expect(firstClosed.code).toBe(CloseCode.DuplicateSession);
    expect(harness.gateway.getMetrics().duplicateSessions).toBe(1);
    expect(harness.gateway.sessionCount).toBe(1);
  });

  it('rejects a wrong protocol version', async () => {
    const harness = await startGateway();
    const client = await TestClient.connect(harness.url);
    const token = await tokenFor();
    client.sendRaw({
      v: PROTOCOL_VERSION + 1,
      cs: 1,
      msg: { type: 'hello', token, serverId: SERVER_ID },
    });

    const error = await client.next();
    expect(error.msg).toMatchObject({ type: 'error', code: 'PROTOCOL_VERSION_MISMATCH' });
    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.VersionMismatch);
  });

  it('rejects an unknown message type', async () => {
    const harness = await startGateway();
    const client = await TestClient.connect(harness.url);
    client.sendRaw({ v: PROTOCOL_VERSION, cs: 1, msg: { type: 'teleport' } });

    const error = await client.next();
    expect(error.msg).toMatchObject({ type: 'error', code: 'INVALID_MESSAGE' });
    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.ProtocolViolation);
  });

  it('rejects an oversized payload', async () => {
    const harness = await startGateway({ maxPayloadBytes: 1024 });
    const client = await TestClient.connect(harness.url);
    client.ws.send('x'.repeat(2048));

    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.MessageTooBig);
  });

  it('answers ping with pong', async () => {
    const harness = await startGateway();
    const client = await TestClient.connect(harness.url);
    await client.hello();
    client.send(2, { type: 'ping', t: 12345 });

    const pong = await client.next();
    expect(pong.msg).toEqual({ type: 'pong', t: 12345 });
  });

  it('simulates movement on fixed ticks and replicates the same entities to clients', async () => {
    const harness = await startGateway();
    const first = await TestClient.connect(harness.url);
    const second = await TestClient.connect(harness.url);
    const firstWelcome = await first.hello();
    const secondWelcome = await second.hello(
      await tokenFor(
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ),
    );

    if (firstWelcome.msg.type !== 'welcome' || secondWelcome.msg.type !== 'welcome') {
      throw new Error('Expected both clients to receive welcome messages');
    }
    const firstEntityId = firstWelcome.msg.entityId;
    const secondEntityId = secondWelcome.msg.entityId;
    expect(firstEntityId).toBeDefined();
    expect(secondEntityId).toBeDefined();
    expect(firstEntityId).not.toBe(secondEntityId);

    first.send(2, {
      type: 'input',
      seq: 0,
      dtMs: 100,
      moveX: 1,
      moveY: 0,
      facing: 64,
      flags: 0,
    });

    let movingSnapshot: ServerEnvelope | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = await first.nextSnapshot();
      if (
        candidate.msg.type === 'snapshot' &&
        candidate.msg.entities.some((entity) => entity.id === firstEntityId && entity.x > 0)
      ) {
        movingSnapshot = candidate;
        break;
      }
    }
    expect(movingSnapshot?.msg.type).toBe('snapshot');
    if (movingSnapshot?.msg.type !== 'snapshot' || firstEntityId === undefined) {
      throw new Error('Expected a moving player snapshot');
    }
    expect(movingSnapshot.msg.ackInput).toBe(0);
    expect(movingSnapshot.msg.entities).toHaveLength(2);
    const movedEntity = movingSnapshot.msg.entities.find((entity) => entity.id === firstEntityId);
    expect(movedEntity?.x).toBeGreaterThan(0);

    first.send(3, {
      type: 'input',
      seq: 0,
      dtMs: 100,
      moveX: -1,
      moveY: 0,
      facing: 192,
      flags: 0,
    });
    await waitFor(() => harness.gateway.getMetrics().sequenceDrops === 1);

    let matchingSnapshot: ServerEnvelope | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = await second.nextSnapshot();
      if (candidate.msg.type === 'snapshot' && candidate.msg.tick >= movingSnapshot.msg.tick) {
        matchingSnapshot = candidate;
        break;
      }
    }
    expect(matchingSnapshot?.msg.type).toBe('snapshot');
    if (matchingSnapshot?.msg.type === 'snapshot' && movedEntity) {
      expect(matchingSnapshot.msg.entities.find((entity) => entity.id === firstEntityId)).toEqual(
        movedEntity,
      );
      expect(
        matchingSnapshot.msg.entities.find((entity) => entity.id === secondEntityId),
      ).toBeDefined();
    }

    let settledSnapshot: ServerEnvelope | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = await first.nextSnapshot();
      if (candidate.msg.type === 'snapshot' && candidate.msg.tick >= movingSnapshot.msg.tick + 8) {
        settledSnapshot = candidate;
        break;
      }
    }
    const laterSnapshot = await first.nextSnapshot();
    if (settledSnapshot?.msg.type === 'snapshot' && laterSnapshot.msg.type === 'snapshot') {
      expect(laterSnapshot.msg.entities.find((entity) => entity.id === firstEntityId)?.x).toBe(
        settledSnapshot.msg.entities.find((entity) => entity.id === firstEntityId)?.x,
      );
    }
  });
});

describe('GameGateway rate limiting', () => {
  it('drops inputs beyond the token bucket and counts the drops', async () => {
    const fakeNow = 1_000_000;
    const harness = await startGateway({ now: () => fakeNow });
    const client = await TestClient.connect(harness.url);
    await client.hello();

    for (let index = 0; index < 100; index += 1) {
      client.send(2 + index, {
        type: 'input',
        seq: index,
        dtMs: 50,
        moveX: 0.5,
        moveY: 0,
        facing: 0,
        flags: 0,
      });
    }

    await waitFor(() => harness.gateway.getMetrics().rateLimitDrops === 70);
    expect(harness.gateway.getMetrics().messagesAccepted).toBe(30);
  });

  it('drops duplicate and out-of-order client sequences', async () => {
    let fakeNow = 2_000_000;
    const harness = await startGateway({ now: () => fakeNow });
    const client = await TestClient.connect(harness.url);
    await client.hello();

    client.send(2, { type: 'ping', t: 1 });
    await client.next();
    client.send(2, { type: 'ping', t: 2 });
    client.send(1, { type: 'ping', t: 3 });

    fakeNow += 1000;
    await waitFor(() => harness.gateway.getMetrics().sequenceDrops === 2);
  });
});

describe('GameGateway heartbeat and reconnect', () => {
  it('drops a silent client after the dead timeout', async () => {
    const harness = await startGateway({
      deadTimeoutMs: 150,
      sweepIntervalMs: 20,
      heartbeatIntervalMs: 50,
    });
    const client = await TestClient.connect(harness.url);
    await client.hello();

    const closed = await client.closed();
    expect(closed.code).toBe(CloseCode.HeartbeatTimeout);
    expect(harness.gateway.getMetrics().heartbeatTimeouts).toBe(1);
  });

  it('accepts a reconnect token once and rotates it', async () => {
    const harness = await startGateway({ deadTimeoutMs: 60_000 });
    const first = await TestClient.connect(harness.url);
    const firstWelcome = await first.hello();
    const firstToken = reconnectTokenFrom(firstWelcome);
    if (firstWelcome.msg.type !== 'welcome') {
      throw new Error('Expected first welcome message');
    }
    first.close();
    await first.closed();

    const second = await TestClient.connect(harness.url);
    const secondWelcome = await second.hello(undefined, firstToken);
    const secondToken = reconnectTokenFrom(secondWelcome);
    if (secondWelcome.msg.type !== 'welcome') {
      throw new Error('Expected second welcome message');
    }
    expect(secondWelcome.msg.entityId).toBe(firstWelcome.msg.entityId);
    expect(secondToken).not.toBe(firstToken);
    expect(harness.gateway.getMetrics().reconnects).toBe(1);

    second.close();
    await second.closed();

    const third = await TestClient.connect(harness.url);
    third.send(1, {
      type: 'hello',
      token: await tokenFor(),
      serverId: SERVER_ID,
      reconnectToken: firstToken,
    });
    const error = await third.next();
    expect(error.msg).toMatchObject({ type: 'error', code: 'RECONNECT_REJECTED' });
    const closed = await third.closed();
    expect(closed.code).toBe(CloseCode.ReconnectRejected);
  });
});
