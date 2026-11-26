import {
  ClientEnvelope,
  PROTOCOL_VERSION,
  ServerEnvelope,
  type ClientMessage,
  type ServerMessage,
} from '@lanternfall/protocol';
import type { DiagnosticsCollector } from '../runtime/diagnostics';

export type ConnectionStatus =
  'idle' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface ServerEndpoints {
  authUrl: string;
  wsUrl: string;
}

export function resolveServerEndpoints(): ServerEndpoints {
  const configured = (import.meta.env.VITE_GAME_SERVER_URL as string | undefined)?.trim();
  if (configured) {
    const httpBase = configured.replace(/\/+$/, '');
    const wsBase = httpBase.replace(/^http/, 'ws');
    return {
      authUrl: `${httpBase}/auth/dev`,
      wsUrl: `${wsBase}/ws`,
    };
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return {
    authUrl: '/api/auth/dev',
    wsUrl: `${wsProtocol}//${window.location.host}/ws`,
  };
}

export interface GameSessionCredentials {
  token: string;
  serverId: string;
}

export interface ConnectionCallbacks {
  onStatus?: (status: ConnectionStatus, detail?: string) => void;
  onMessage?: (message: ServerMessage) => void;
}

export interface ConnectionOptions {
  wsUrl: string;
  getSession: () => Promise<GameSessionCredentials>;
  diagnostics: DiagnosticsCollector;
  callbacks?: ConnectionCallbacks;
  heartbeatMs?: number;
  deadAfterMs?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

const encoder = new TextEncoder();
const STORAGE_PREFIX = 'lanternfall.reconnect.v1.';
const HELLO_TIMEOUT_MS = 5000;

const byteLength = (text: string): number => encoder.encode(text).byteLength;

export class GameConnection {
  private readonly heartbeatMs: number;
  private readonly deadAfterMs: number;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly reconnectStorageKey: string;
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'idle';
  private clientSequence = 0;
  private inputSequence = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private helloTimer: number | null = null;
  private lastPongAt = 0;
  private latencyMs: number | null = null;
  private trafficInBytes = 0;
  private trafficOutBytes = 0;
  private stopped = true;
  private suspended = false;
  private opening = false;

  constructor(private readonly options: ConnectionOptions) {
    this.heartbeatMs = options.heartbeatMs ?? 5000;
    this.deadAfterMs = options.deadAfterMs ?? 15000;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 500;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 10000;
    this.reconnectStorageKey = `${STORAGE_PREFIX}${options.wsUrl}`;
  }

  start(): void {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    window.addEventListener('online', this.onOnline);
    window.addEventListener('pageshow', this.onPageShow);
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (document.visibilityState === 'hidden') {
      this.suspended = true;
      return;
    }
    void this.connect(false);
  }

  stop(): void {
    this.stopped = true;
    this.suspended = false;
    this.clearTimers();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('pageshow', this.onPageShow);
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, 'Client stopped');
    this.setStatus('idle');
  }

  sendInput(moveX: number, moveY: number, facing: number, dtMs: number): void {
    if (!this.socket) {
      return;
    }
    this.send(this.socket, {
      type: 'input',
      seq: this.inputSequence,
      dtMs,
      moveX,
      moveY,
      facing,
      flags: 0,
    });
    this.inputSequence += 1;
  }

  private connect(isRetry: boolean): void {
    if (this.stopped || this.suspended || this.socket || this.opening) {
      return;
    }
    this.setStatus(isRetry ? 'reconnecting' : 'connecting');

    void this.openSocket(isRetry);
  }

  private async openSocket(isRetry: boolean): Promise<void> {
    if (this.opening) {
      return;
    }
    this.opening = true;
    try {
      let credentials: GameSessionCredentials;
      try {
        credentials = await this.options.getSession();
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Sign-in failed';
        this.setStatus('error', detail);
        this.scheduleReconnect();
        return;
      }

      if (this.stopped || this.suspended || this.socket) {
        return;
      }

      const socket = new WebSocket(this.options.wsUrl);
      this.socket = socket;
      this.status = isRetry ? 'reconnecting' : 'connecting';

      socket.addEventListener('open', () => {
        if (this.socket !== socket) {
          return;
        }
        this.authenticate(socket, credentials);
      });

      socket.addEventListener('message', (event) => {
        this.onSocketMessage(socket, event);
      });

      socket.addEventListener('error', () => {
        // The close event carries the actionable information.
      });

      socket.addEventListener('close', (event) => {
        this.onSocketClose(socket, event);
      });
    } finally {
      this.opening = false;
    }
  }

  private authenticate(socket: WebSocket, credentials: GameSessionCredentials): void {
    const reconnectToken = this.readReconnectToken();
    this.send(socket, {
      type: 'hello',
      token: credentials.token,
      serverId: credentials.serverId,
      ...(reconnectToken ? { reconnectToken } : {}),
    });
    this.setStatus('authenticating');

    this.helloTimer = window.setTimeout(() => {
      if (this.socket === socket && this.status === 'authenticating') {
        socket.close(4000, 'Hello timeout');
      }
    }, HELLO_TIMEOUT_MS);
  }

  private onSocketMessage(socket: WebSocket, event: MessageEvent): void {
    if (this.socket !== socket || typeof event.data !== 'string') {
      return;
    }

    const text = event.data;
    this.trafficInBytes += byteLength(text);

    let envelope: ServerEnvelope;
    try {
      const parsed = ServerEnvelope.safeParse(JSON.parse(text));
      if (!parsed.success) {
        this.setStatus('error', 'The server sent an invalid message envelope');
        socket.close(4009, 'Invalid envelope');
        return;
      }
      envelope = parsed.data;
    } catch {
      this.setStatus('error', 'The server sent malformed JSON');
      socket.close(4009, 'Malformed JSON');
      return;
    }

    const message = envelope.msg;
    if (message.type === 'welcome') {
      if (this.helloTimer !== null) {
        clearTimeout(this.helloTimer);
        this.helloTimer = null;
      }
      this.writeReconnectToken(message.reconnectToken);
      this.reconnectAttempts = 0;
      this.lastPongAt = Date.now();
      this.setStatus('connected');
      this.startHeartbeat(socket);
      this.options.callbacks?.onMessage?.(message);
      this.publishNetwork();
      return;
    }

    if (message.type === 'pong') {
      const latency = Date.now() - message.t;
      this.latencyMs = latency >= 0 ? latency : 0;
      this.lastPongAt = Date.now();
      this.publishNetwork();
      return;
    }

    if (message.type === 'error') {
      this.publishNetwork();
      if (message.fatal) {
        this.setStatus('error', message.code);
      }
      return;
    }

    this.options.callbacks?.onMessage?.(message);
    this.publishNetwork();
  }

  private onSocketClose(socket: WebSocket, event: CloseEvent): void {
    if (this.socket !== socket) {
      return;
    }
    this.socket = null;
    this.clearTimers();
    this.publishNetwork();

    if (this.stopped) {
      return;
    }

    switch (event.code) {
      case 1000:
        if (event.reason === 'Client stopped') {
          return;
        }
        this.scheduleReconnect();
        return;
      case 4001:
      case 4002:
      case 4004:
      case 4009:
      case 1002:
      case 1003:
      case 1009:
        this.setStatus('error', event.reason || `Connection rejected (${event.code})`);
        return;
      case 4003:
        this.clearReconnectToken();
        this.setStatus('error', 'This character signed in elsewhere');
        return;
      case 4006:
        this.clearReconnectToken();
        this.scheduleReconnect();
        return;
      default:
        this.scheduleReconnect();
    }
  }

  private startHeartbeat(socket: WebSocket): void {
    this.stopHeartbeat();
    this.sendPing(socket);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (Date.now() - this.lastPongAt > this.deadAfterMs) {
        socket.close(4000, 'Heartbeat lost');
        return;
      }
      this.sendPing(socket);
    }, this.heartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendPing(socket: WebSocket): void {
    this.send(socket, { type: 'ping', t: Date.now() });
  }

  private send(socket: WebSocket, message: ClientMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.clientSequence += 1;
    const envelope = ClientEnvelope.safeParse({
      v: PROTOCOL_VERSION,
      cs: this.clientSequence,
      msg: message,
    });
    if (!envelope.success) {
      this.setStatus('error', 'Blocked an invalid outgoing message');
      return;
    }
    const text = JSON.stringify(envelope.data);
    socket.send(text);
    this.trafficOutBytes += byteLength(text);
    this.publishNetwork();
  }

  private scheduleReconnect(delayOverride?: number): void {
    if (this.stopped || this.suspended || this.reconnectTimer !== null) {
      return;
    }
    this.reconnectAttempts += 1;
    const base = Math.min(
      this.reconnectBaseMs * 2 ** (this.reconnectAttempts - 1),
      this.reconnectMaxMs,
    );
    const delay = delayOverride ?? Math.round(base * (0.75 + Math.random() * 0.5));
    this.setStatus('reconnecting', `Retrying in ${(delay / 1000).toFixed(1)} s`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(true);
    }, delay);
  }

  private ensureConnection(): void {
    if (this.stopped || this.suspended || this.socket) {
      return;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.scheduleReconnect(0);
  }

  /**
   * iPad Safari freezes hidden pages, so keeping a socket "alive" in the
   * background only produces server-side timeouts and reconnect churn. Close
   * cleanly on hide and reconnect once on resume using the grace token.
   */
  private suspendForBackground(): void {
    if (this.stopped || this.suspended) {
      return;
    }
    this.suspended = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, 'Page hidden');
    this.setStatus('idle', 'Paused while hidden');
  }

  private resumeFromBackground(): void {
    if (this.stopped || !this.suspended) {
      return;
    }
    this.suspended = false;
    this.clearTimers();
    this.reconnectAttempts = 0;
    this.connect(false);
  }

  private readonly onOnline = (): void => {
    this.ensureConnection();
  };

  private readonly onPageShow = (): void => {
    this.resumeFromBackground();
  };

  private readonly onPageHide = (): void => {
    this.suspendForBackground();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.suspendForBackground();
    } else {
      this.resumeFromBackground();
    }
  };

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.helloTimer !== null) {
      clearTimeout(this.helloTimer);
      this.helloTimer = null;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus, detail?: string): void {
    if (this.status === status && detail === undefined) {
      return;
    }
    this.status = status;
    this.options.callbacks?.onStatus?.(status, detail);
  }

  private publishNetwork(): void {
    this.options.diagnostics.setNetwork(this.latencyMs, this.trafficInBytes, this.trafficOutBytes);
  }

  private readReconnectToken(): string | null {
    try {
      return window.sessionStorage.getItem(this.reconnectStorageKey);
    } catch {
      return null;
    }
  }

  private writeReconnectToken(token: string): void {
    try {
      window.sessionStorage.setItem(this.reconnectStorageKey, token);
    } catch {
      // Non-persistent reconnect still works through the in-memory socket lifetime.
    }
  }

  private clearReconnectToken(): void {
    try {
      window.sessionStorage.removeItem(this.reconnectStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }
}
