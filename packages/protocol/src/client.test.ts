import { describe, expect, it } from 'vitest';
import { ClientEnvelope, ClientMessage, MAX_CHAT_CHARS, PROTOCOL_VERSION } from './client';
import { ServerEnvelope } from './server';

const playerId = '11111111-1111-4111-8111-111111111111';
const characterId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const opId = '44444444-4444-4444-8444-444444444444';
const containerId = '55555555-5555-4555-8555-555555555555';
const serverId = '66666666-6666-4666-8666-666666666666';

const envelope = (msg: unknown, overrides: { v?: number; cs?: number } = {}) => ({
  v: overrides.v ?? PROTOCOL_VERSION,
  cs: overrides.cs ?? 1,
  msg,
});

describe('ClientEnvelope', () => {
  it('accepts a hello message', () => {
    const result = ClientEnvelope.safeParse(
      envelope({
        type: 'hello',
        token: 'signed.jwt.value',
        serverId,
        reconnectToken: 'reconnect-token',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts an input message', () => {
    const result = ClientEnvelope.safeParse(
      envelope({
        type: 'input',
        seq: 1,
        dtMs: 50,
        moveX: 0.5,
        moveY: -1,
        facing: 128,
        flags: 0,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts an inventory move with both container kinds', () => {
    const result = ClientEnvelope.safeParse(
      envelope({
        type: 'inv.move',
        opId,
        itemId,
        qty: 2,
        from: { kind: 'container', id: containerId },
        to: { kind: 'ground', x: 10, y: 20, z: 0 },
        expectedFromVersion: 3,
        expectedToVersion: 7,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts interact begin and cancel messages', () => {
    const begin = ClientEnvelope.safeParse(
      envelope({ type: 'interact.begin', opId, targetId: 42, actionId: 'open' }),
    );
    const cancel = ClientEnvelope.safeParse(envelope({ type: 'interact.cancel', opId }));
    expect(begin.success).toBe(true);
    expect(cancel.success).toBe(true);
  });

  it('accepts chat and ping messages', () => {
    const chat = ClientEnvelope.safeParse(
      envelope({ type: 'chat', channel: 'local', text: 'Anyone near the mill?' }),
    );
    const ping = ClientEnvelope.safeParse(envelope({ type: 'ping', t: 1234 }));
    expect(chat.success).toBe(true);
    expect(ping.success).toBe(true);
  });

  it('rejects an unknown message type', () => {
    const result = ClientEnvelope.safeParse(envelope({ type: 'teleport', x: 1, y: 1 }));
    expect(result.success).toBe(false);
  });

  it('rejects a wrong protocol version', () => {
    const result = ClientEnvelope.safeParse(
      envelope({ type: 'ping', t: 1 }, { v: PROTOCOL_VERSION + 1 }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects a missing or negative sequence number', () => {
    expect(
      ClientEnvelope.safeParse({ v: PROTOCOL_VERSION, msg: { type: 'ping', t: 1 } }).success,
    ).toBe(false);
    expect(ClientEnvelope.safeParse(envelope({ type: 'ping', t: 1 }, { cs: -1 })).success).toBe(
      false,
    );
  });

  it('rejects oversized payloads', () => {
    const oversizedChat = ClientEnvelope.safeParse(
      envelope({ type: 'chat', channel: 'local', text: 'x'.repeat(MAX_CHAT_CHARS + 1) }),
    );
    const oversizedToken = ClientEnvelope.safeParse(
      envelope({ type: 'hello', token: 'x'.repeat(4097), serverId }),
    );
    expect(oversizedChat.success).toBe(false);
    expect(oversizedToken.success).toBe(false);
  });

  it('rejects malformed inventories and inputs', () => {
    const zeroQuantity = ClientEnvelope.safeParse(
      envelope({
        type: 'inv.move',
        opId,
        itemId,
        qty: 0,
        from: { kind: 'container', id: containerId },
        to: { kind: 'container', id: containerId },
        expectedFromVersion: 0,
        expectedToVersion: 0,
      }),
    );
    const badFloor = ClientEnvelope.safeParse(
      envelope({
        type: 'inv.move',
        opId,
        itemId,
        qty: 1,
        from: { kind: 'ground', x: 0, y: 0, z: 3 },
        to: { kind: 'container', id: containerId },
        expectedFromVersion: 0,
        expectedToVersion: 0,
      }),
    );
    const badInput = ClientEnvelope.safeParse(
      envelope({
        type: 'input',
        seq: 0,
        dtMs: 500,
        moveX: 2,
        moveY: 0,
        facing: 0,
        flags: 0,
      }),
    );
    expect(zeroQuantity.success).toBe(false);
    expect(badFloor.success).toBe(false);
    expect(badInput.success).toBe(false);
  });

  it('rejects a malformed message for every remaining variant', () => {
    const invalidMessages: unknown[] = [
      { type: 'hello', token: '', serverId },
      { type: 'hello', token: 'signed.jwt.value', serverId: 'not-a-uuid' },
      { type: 'input', seq: 0, dtMs: 101, moveX: 0, moveY: 0, facing: 0, flags: 0 },
      {
        type: 'inv.move',
        opId,
        itemId,
        qty: 1,
        from: { kind: 'container', id: 'not-a-uuid' },
        to: { kind: 'container', id: containerId },
        expectedFromVersion: 0,
        expectedToVersion: 0,
      },
      { type: 'interact.begin', opId, targetId: 1, actionId: '' },
      { type: 'interact.cancel', opId: 'not-a-uuid' },
      { type: 'chat', channel: 'global', text: 'hello' },
      { type: 'chat', channel: 'local', text: '' },
      { type: 'ping', t: -1 },
    ];

    for (const msg of invalidMessages) {
      expect(ClientEnvelope.safeParse(envelope(msg)).success, JSON.stringify(msg)).toBe(false);
    }
  });

  it('rejects a malformed envelope', () => {
    expect(ClientEnvelope.safeParse({ cs: 1, msg: { type: 'ping', t: 1 } }).success).toBe(false);
    expect(ClientEnvelope.safeParse('not-json').success).toBe(false);
  });
});

describe('ClientMessage', () => {
  it('parses a message independently of the envelope', () => {
    const result = ClientMessage.safeParse({ type: 'ping', t: 0 });
    expect(result.success).toBe(true);
  });
});

describe('ServerEnvelope', () => {
  it('accepts a welcome message', () => {
    const result = ServerEnvelope.safeParse({
      v: PROTOCOL_VERSION,
      ss: 0,
      msg: {
        type: 'welcome',
        playerId,
        characterId,
        entityId: 7,
        worldTimeSec: 0,
        tickRate: 20,
        reconnectToken: 'token',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a legacy welcome without an entity id', () => {
    const result = ServerEnvelope.safeParse({
      v: PROTOCOL_VERSION,
      ss: 0,
      msg: {
        type: 'welcome',
        playerId,
        characterId,
        worldTimeSec: 0,
        tickRate: 20,
        reconnectToken: 'token',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a pong message', () => {
    const result = ServerEnvelope.safeParse({
      v: PROTOCOL_VERSION,
      ss: 1,
      msg: { type: 'pong', t: 42 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a welcome with a non-uuid player id', () => {
    const result = ServerEnvelope.safeParse({
      v: PROTOCOL_VERSION,
      ss: 0,
      msg: {
        type: 'welcome',
        playerId: 'not-a-uuid',
        characterId: null,
        worldTimeSec: 0,
        tickRate: 20,
        reconnectToken: 'token',
      },
    });
    expect(result.success).toBe(false);
  });
});
