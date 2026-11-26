import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import {
  ClientEnvelope,
  CloseCode,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ClientMessageType,
  type ProtocolErrorCode,
  type ServerEnvelope,
  type ServerMessage,
} from '@lanternfall/protocol';
import type { AuthenticatedIdentity } from './auth';
import type { RateLimitRule } from './rate-limit';
import { GameSession, ReconnectTokenStore, SessionRegistry } from './session';

export interface GatewayLogger {
  info: (context: Record<string, unknown>, message?: string) => void;
  warn: (context: Record<string, unknown>, message?: string) => void;
  error: (context: Record<string, unknown>, message?: string) => void;
}

export interface GatewayConfig {
  serverId: string;
  helloTimeoutMs: number;
  heartbeatIntervalMs: number;
  deadTimeoutMs: number;
  sweepIntervalMs: number;
  reconnectGraceMs: number;
  tickRate: number;
  maxPayloadBytes: number;
  maxPlayers: number;
  allowedOrigins?: readonly string[] | undefined;
  verifyToken: (token: string) => Promise<AuthenticatedIdentity>;
  now?: (() => number) | undefined;
  logger?: GatewayLogger | undefined;
  worldTimeSec?: (() => number) | undefined;
  rateLimitRules?: Partial<Record<ClientMessageType, RateLimitRule>> | undefined;
}

export interface GatewayMetrics {
  connections: number;
  peakConnections: number;
  authenticatedSessions: number;
  messagesReceived: number;
  messagesAccepted: number;
  invalidMessages: number;
  helloTimedOut: number;
  unauthenticated: number;
  duplicateSessions: number;
  rateLimitDrops: number;
  sequenceDrops: number;
  reconnects: number;
  heartbeatTimeouts: number;
  serverFull: number;
  bytesIn: number;
}

type ConnectionState = 'awaiting_hello' | 'authenticating' | 'ready' | 'closing';

interface ConnectionContext {
  readonly ws: WebSocket;
  state: ConnectionState;
  helloTimer: NodeJS.Timeout | null;
  session: GameSession | null;
  lastSeenAt: number;
}

const emptyMetrics = (): GatewayMetrics => ({
  connections: 0,
  peakConnections: 0,
  authenticatedSessions: 0,
  messagesReceived: 0,
  messagesAccepted: 0,
  invalidMessages: 0,
  helloTimedOut: 0,
  unauthenticated: 0,
  duplicateSessions: 0,
  rateLimitDrops: 0,
  sequenceDrops: 0,
  reconnects: 0,
  heartbeatTimeouts: 0,
  serverFull: 0,
  bytesIn: 0,
});

export class GameGateway {
  private wss: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;
  private readonly connections = new Map<WebSocket, ConnectionContext>();
  private readonly sessions = new SessionRegistry();
  private readonly reconnectTokens: ReconnectTokenStore;
  private readonly metricsState = emptyMetrics();
  private readonly now: () => number;

  constructor(private readonly config: GatewayConfig) {
    this.now = config.now ?? Date.now;
    this.reconnectTokens = new ReconnectTokenStore(config.reconnectGraceMs, this.now);
  }

  attach(server: HttpServer): void {
    if (this.wss) {
      throw new Error('GameGateway is already attached');
    }

    this.httpServer = server;
    const wss = new WebSocketServer({
      noServer: true,
      clientTracking: false,
      perMessageDeflate: false,
      maxPayload: this.config.maxPayloadBytes,
    });
    this.wss = wss;
    wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
    server.on('upgrade', this.handleUpgrade);

    this.sweepTimer = setInterval(() => {
      this.sweep();
    }, this.config.sweepIntervalMs);
    this.sweepTimer.unref();
  }

  get attached(): boolean {
    return this.wss !== null;
  }

  getMetrics(): GatewayMetrics {
    return { ...this.metricsState };
  }

  get sessionCount(): number {
    return this.sessions.size;
  }

  close(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.httpServer) {
      this.httpServer.off('upgrade', this.handleUpgrade);
      this.httpServer = null;
    }
    for (const context of this.connections.values()) {
      context.state = 'closing';
      if (context.helloTimer) {
        clearTimeout(context.helloTimer);
        context.helloTimer = null;
      }
      context.ws.close(CloseCode.GoingAway, 'Server shutting down');
    }
    this.connections.clear();
    this.metricsState.connections = 0;
    this.metricsState.authenticatedSessions = 0;
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private handleUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const wss = this.wss;
    if (!wss) {
      socket.destroy();
      return;
    }

    let pathname: string;
    try {
      pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }

    if (pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const allowedOrigins = this.config.allowedOrigins;
    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = request.headers.origin;
      if (!origin || !allowedOrigins.includes(origin)) {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  };

  private handleConnection(ws: WebSocket, _request: IncomingMessage): void {
    if (this.connections.size >= this.config.maxPlayers) {
      this.metricsState.serverFull += 1;
      ws.close(CloseCode.ServerFull, 'Server full');
      return;
    }

    const context: ConnectionContext = {
      ws,
      state: 'awaiting_hello',
      helloTimer: null,
      session: null,
      lastSeenAt: this.now(),
    };
    this.connections.set(ws, context);
    this.metricsState.connections = this.connections.size;
    this.metricsState.peakConnections = Math.max(
      this.metricsState.peakConnections,
      this.connections.size,
    );

    context.helloTimer = setTimeout(() => {
      if (context.state === 'ready' || context.state === 'closing') {
        return;
      }
      this.metricsState.helloTimedOut += 1;
      this.sendError(context, 'HELLO_TIMEOUT', true);
      this.closeContext(context, CloseCode.HelloTimeout, 'Hello timeout');
    }, this.config.helloTimeoutMs);
    context.helloTimer.unref();

    ws.on('message', (data: RawData, isBinary: boolean) => {
      this.onMessage(context, data, isBinary);
    });
    ws.on('close', (code: number, reason: Buffer) => {
      this.onClose(context, code, reason.toString());
    });
    ws.on('error', (error: Error) => {
      this.log('warn', { err: error }, 'websocket error');
    });
  }

  private onMessage(context: ConnectionContext, data: RawData, isBinary: boolean): void {
    if (context.state === 'closing') {
      return;
    }

    const raw = Array.isArray(data)
      ? Buffer.concat(data)
      : Buffer.isBuffer(data)
        ? data
        : Buffer.from(new Uint8Array(data));
    this.metricsState.bytesIn += raw.byteLength;
    this.metricsState.messagesReceived += 1;

    if (raw.byteLength > this.config.maxPayloadBytes) {
      this.sendError(context, 'PAYLOAD_TOO_LARGE', true);
      this.closeContext(context, CloseCode.MessageTooBig, 'Payload too large');
      return;
    }

    if (isBinary) {
      this.sendError(context, 'INVALID_MESSAGE', true);
      this.closeContext(context, CloseCode.UnsupportedData, 'Binary messages are not supported');
      return;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw.toString('utf8')) as unknown;
    } catch {
      this.sendError(context, 'INVALID_MESSAGE', true);
      this.closeContext(context, CloseCode.ProtocolError, 'Invalid JSON');
      return;
    }

    if (typeof decoded === 'object' && decoded !== null && 'v' in decoded) {
      const version = (decoded as { v?: unknown }).v;
      if (version !== PROTOCOL_VERSION) {
        this.sendError(context, 'PROTOCOL_VERSION_MISMATCH', true);
        this.closeContext(context, CloseCode.VersionMismatch, 'Protocol version mismatch');
        return;
      }
    }

    const parsed = ClientEnvelope.safeParse(decoded);
    if (!parsed.success) {
      this.sendError(context, 'INVALID_MESSAGE', true);
      this.closeContext(context, CloseCode.ProtocolViolation, 'Invalid message');
      return;
    }

    const envelope = parsed.data;
    const message = envelope.msg;

    if (context.state === 'awaiting_hello' && message.type !== 'hello') {
      this.metricsState.unauthenticated += 1;
      this.sendError(context, 'UNAUTHENTICATED', true);
      this.closeContext(context, CloseCode.Unauthenticated, 'Hello required');
      return;
    }

    if (message.type === 'hello') {
      if (context.state !== 'awaiting_hello') {
        this.sendError(context, 'INVALID_MESSAGE', true);
        this.closeContext(context, CloseCode.ProtocolViolation, 'Unexpected hello');
        return;
      }
      void this.handleHello(context, message);
      return;
    }

    if (context.state !== 'ready' || !context.session) {
      this.sendError(context, 'INVALID_MESSAGE', true);
      this.closeContext(context, CloseCode.ProtocolViolation, 'Session not ready');
      return;
    }

    const session = context.session;
    if (!session.acceptsSequence(envelope.cs)) {
      this.metricsState.sequenceDrops += 1;
      return;
    }
    if (!session.limiter.tryConsume(message.type)) {
      this.metricsState.rateLimitDrops += 1;
      return;
    }

    this.metricsState.messagesAccepted += 1;
    session.touch();
    context.lastSeenAt = session.lastSeenAt;

    switch (message.type) {
      case 'ping':
        session.send({ type: 'pong', t: message.t });
        break;
      case 'input':
        // Movement simulation arrives in Milestone 2. Inputs are validated and accepted now.
        break;
      case 'inv.move':
      case 'interact.begin':
      case 'interact.cancel':
      case 'chat':
        session.send({ type: 'error', code: 'NOT_IMPLEMENTED', fatal: false });
        break;
    }
  }

  private async handleHello(
    context: ConnectionContext,
    message: Extract<ClientMessage, { type: 'hello' }>,
  ): Promise<void> {
    if (context.state !== 'awaiting_hello') {
      return;
    }
    context.state = 'authenticating';
    if (context.helloTimer) {
      clearTimeout(context.helloTimer);
      context.helloTimer = null;
    }

    if (message.serverId !== this.config.serverId) {
      this.metricsState.unauthenticated += 1;
      this.sendError(context, 'FORBIDDEN', true);
      this.closeContext(context, CloseCode.Forbidden, 'Unknown server');
      return;
    }

    let identity: AuthenticatedIdentity;
    try {
      identity = await this.config.verifyToken(message.token);
    } catch (error) {
      this.metricsState.unauthenticated += 1;
      this.log('warn', { err: error }, 'token verification failed');
      this.sendError(context, 'UNAUTHENTICATED', true);
      this.closeContext(context, CloseCode.Unauthenticated, 'Unauthenticated');
      return;
    }

    if (context.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const sessionCharacterId = identity.characterId ?? identity.playerId;

    if (message.reconnectToken) {
      const accepted = this.reconnectTokens.consume(
        message.reconnectToken,
        identity.playerId,
        sessionCharacterId,
      );
      if (!accepted) {
        this.sendError(context, 'RECONNECT_REJECTED', true);
        this.closeContext(context, CloseCode.ReconnectRejected, 'Reconnect token rejected');
        return;
      }
      this.metricsState.reconnects += 1;
    }

    const displaced = this.sessions.findByCharacter(sessionCharacterId);
    if (displaced && displaced.socket !== context.ws) {
      this.metricsState.duplicateSessions += 1;
      displaced.socket.close(CloseCode.DuplicateSession, 'Signed in elsewhere');
      this.sessions.removeBySocket(displaced.socket);
    }

    const session = new GameSession(
      identity.playerId,
      sessionCharacterId,
      identity.displayName,
      context.ws,
      this.now,
      this.config.rateLimitRules,
    );
    this.sessions.add(session);
    context.session = session;
    context.state = 'ready';
    context.lastSeenAt = session.lastSeenAt;
    this.metricsState.authenticatedSessions = this.sessions.size;

    const reconnectToken = this.reconnectTokens.issue(identity.playerId, sessionCharacterId);
    const sent = session.send({
      type: 'welcome',
      playerId: identity.playerId,
      characterId: identity.characterId,
      worldTimeSec: this.config.worldTimeSec?.() ?? 0,
      tickRate: this.config.tickRate,
      reconnectToken,
    });
    if (!sent) {
      this.closeContext(context, CloseCode.InternalError, 'Failed to send welcome');
      return;
    }

    this.log(
      'info',
      { playerId: identity.playerId, characterId: identity.characterId },
      'session authenticated',
    );
  }

  private sweep(): void {
    const now = this.now();
    for (const context of this.connections.values()) {
      if (context.state !== 'ready' || !context.session) {
        continue;
      }
      if (now - context.session.lastSeenAt > this.config.deadTimeoutMs) {
        this.metricsState.heartbeatTimeouts += 1;
        this.sendError(context, 'SESSION_TIMEOUT', true);
        this.closeContext(context, CloseCode.HeartbeatTimeout, 'Heartbeat timeout');
      }
    }
  }

  private onClose(context: ConnectionContext, code: number, reason: string): void {
    if (context.helloTimer) {
      clearTimeout(context.helloTimer);
      context.helloTimer = null;
    }
    if (context.session) {
      this.sessions.removeBySocket(context.ws);
      this.metricsState.authenticatedSessions = this.sessions.size;
    }
    this.connections.delete(context.ws);
    this.metricsState.connections = this.connections.size;
    this.log('info', { code, reason }, 'connection closed');
  }

  private sendError(context: ConnectionContext, code: ProtocolErrorCode, fatal: boolean): void {
    this.sendTo(context, { type: 'error', code, fatal });
  }

  private sendTo(context: ConnectionContext, message: ServerMessage): void {
    if (context.session) {
      context.session.send(message);
      return;
    }
    if (context.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const envelope: ServerEnvelope = {
      v: PROTOCOL_VERSION,
      ss: 0,
      msg: message,
    };
    context.ws.send(JSON.stringify(envelope));
  }

  private closeContext(context: ConnectionContext, code: number, reason: string): void {
    if (context.state === 'closing') {
      return;
    }
    context.state = 'closing';
    if (context.helloTimer) {
      clearTimeout(context.helloTimer);
      context.helloTimer = null;
    }
    if (
      context.ws.readyState === WebSocket.OPEN ||
      context.ws.readyState === WebSocket.CONNECTING
    ) {
      context.ws.close(code, reason.slice(0, 120));
    }
  }

  private log(
    level: 'info' | 'warn' | 'error',
    context: Record<string, unknown>,
    message: string,
  ): void {
    this.config.logger?.[level](context, message);
  }
}
