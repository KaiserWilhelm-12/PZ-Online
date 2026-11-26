import type { ClientMessageType } from '@lanternfall/protocol';

export interface RateLimitRule {
  readonly ratePerSecond: number;
  readonly burst: number;
}

export const DEFAULT_RATE_LIMITS: Readonly<Record<ClientMessageType, RateLimitRule>> = {
  hello: { ratePerSecond: 1, burst: 1 },
  input: { ratePerSecond: 30, burst: 30 },
  'inv.move': { ratePerSecond: 10, burst: 20 },
  'interact.begin': { ratePerSecond: 2, burst: 4 },
  'interact.cancel': { ratePerSecond: 2, burst: 4 },
  chat: { ratePerSecond: 1, burst: 5 },
  ping: { ratePerSecond: 2, burst: 5 },
};

export class TokenBucket {
  private tokens: number;
  private lastRefillAt: number;

  constructor(
    private readonly rule: RateLimitRule,
    now: number,
  ) {
    this.tokens = rule.burst;
    this.lastRefillAt = now;
  }

  tryConsume(now: number): boolean {
    const elapsedSeconds = Math.max(0, now - this.lastRefillAt) / 1000;
    this.lastRefillAt = now;
    this.tokens = Math.min(this.rule.burst, this.tokens + elapsedSeconds * this.rule.ratePerSecond);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

export class MessageRateLimiter {
  private readonly buckets = new Map<ClientMessageType, TokenBucket>();
  private droppedCount = 0;

  constructor(
    private readonly now: () => number,
    private readonly rules: Readonly<
      Record<ClientMessageType, RateLimitRule>
    > = DEFAULT_RATE_LIMITS,
  ) {}

  tryConsume(type: ClientMessageType): boolean {
    let bucket = this.buckets.get(type);
    if (!bucket) {
      bucket = new TokenBucket(this.rules[type], this.now());
      this.buckets.set(type, bucket);
    }
    if (bucket.tryConsume(this.now())) {
      return true;
    }
    this.droppedCount += 1;
    return false;
  }

  get dropped(): number {
    return this.droppedCount;
  }
}
