import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  type ClientMessageType,
  type ServerEnvelope,
  type ServerMessage,
} from '@lanternfall/protocol';
import { DEFAULT_RATE_LIMITS, MessageRateLimiter, type RateLimitRule } from './rate-limit';

export interface SessionSnapshot {
  id: string;
  playerId: string;
  characterId: string;
  displayName: string | null;
  connectedAt: number;
  lastSeenAt: number;
  lastSequence: number;
}

export class GameSession {
  readonly id = randomUUID();
  readonly limiter: MessageRateLimiter;
  readonly connectedAt: number;
  lastSeenAt: number;
  lastSequence = -1;
  private outboundSequence = 0;

  constructor(
    readonly playerId: string,
    readonly characterId: string,
    readonly displayName: string | null,
    readonly socket: WebSocket,
    private readonly clock: () => number,
    rateLimitRules?: Partial<Record<ClientMessageType, RateLimitRule>>,
  ) {
    this.connectedAt = clock();
    this.lastSeenAt = this.connectedAt;
    this.limiter = new MessageRateLimiter(clock, {
      ...DEFAULT_RATE_LIMITS,
      ...rateLimitRules,
    });
  }

  send(message: ServerMessage): boolean {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const envelope: ServerEnvelope = {
      v: PROTOCOL_VERSION,
      ss: this.outboundSequence,
      msg: message,
    };
    this.outboundSequence += 1;
    this.socket.send(JSON.stringify(envelope));
    return true;
  }

  acceptsSequence(clientSequence: number): boolean {
    if (clientSequence <= this.lastSequence) {
      return false;
    }
    this.lastSequence = clientSequence;
    return true;
  }

  touch(): void {
    this.lastSeenAt = this.clock();
  }

  snapshot(): SessionSnapshot {
    return {
      id: this.id,
      playerId: this.playerId,
      characterId: this.characterId,
      displayName: this.displayName,
      connectedAt: this.connectedAt,
      lastSeenAt: this.lastSeenAt,
      lastSequence: this.lastSequence,
    };
  }
}

export class SessionRegistry {
  private readonly byCharacter = new Map<string, GameSession>();
  private readonly bySocket = new Map<WebSocket, GameSession>();

  add(session: GameSession): GameSession | null {
    const displaced = this.byCharacter.get(session.characterId) ?? null;
    if (displaced && displaced.socket !== session.socket) {
      this.bySocket.delete(displaced.socket);
    }
    this.byCharacter.set(session.characterId, session);
    this.bySocket.set(session.socket, session);
    return displaced;
  }

  removeBySocket(socket: WebSocket): GameSession | null {
    const session = this.bySocket.get(socket) ?? null;
    if (!session) {
      return null;
    }
    this.bySocket.delete(socket);
    if (this.byCharacter.get(session.characterId) === session) {
      this.byCharacter.delete(session.characterId);
    }
    return session;
  }

  findByCharacter(characterId: string): GameSession | null {
    return this.byCharacter.get(characterId) ?? null;
  }

  findBySocket(socket: WebSocket): GameSession | null {
    return this.bySocket.get(socket) ?? null;
  }

  get size(): number {
    return this.bySocket.size;
  }

  all(): GameSession[] {
    return [...this.bySocket.values()];
  }
}

interface ReconnectGrant {
  playerId: string;
  characterId: string;
  expiresAt: number;
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export class ReconnectTokenStore {
  private readonly grants = new Map<string, ReconnectGrant>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number,
  ) {}

  issue(playerId: string, characterId: string): string {
    this.prune();
    const token = randomBytes(32).toString('base64url');
    this.grants.set(hashToken(token), {
      playerId,
      characterId,
      expiresAt: this.now() + this.ttlMs,
    });
    return token;
  }

  consume(token: string, playerId: string, characterId: string): boolean {
    this.prune();
    const key = hashToken(token);
    const grant = this.grants.get(key);
    if (
      !grant ||
      grant.expiresAt <= this.now() ||
      grant.playerId !== playerId ||
      grant.characterId !== characterId
    ) {
      return false;
    }
    this.grants.delete(key);
    return true;
  }

  private prune(): void {
    const now = this.now();
    for (const [key, grant] of this.grants) {
      if (grant.expiresAt <= now) {
        this.grants.delete(key);
      }
    }
  }
}
