import { z } from 'zod';

export const PROTOCOL_VERSION = 1;
export const SUPPORTED_PROTOCOL_VERSIONS: readonly number[] = [PROTOCOL_VERSION];
export const MAX_CLIENT_PAYLOAD_BYTES = 8192;
export const MAX_CHAT_CHARS = 200;

const uuid = z.string().uuid();
const nat = z.number().int().nonnegative();

export const ContainerRef = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('container'),
    id: uuid,
  }),
  z.object({
    kind: z.literal('ground'),
    x: z.number().int(),
    y: z.number().int(),
    z: z.number().int().min(0).max(2),
  }),
]);

export const ClientMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    token: z.string().min(1).max(4096),
    serverId: uuid,
    reconnectToken: z.string().min(1).max(128).optional(),
  }),
  z.object({
    type: z.literal('input'),
    seq: nat,
    dtMs: z.number().int().min(1).max(100),
    moveX: z.number().min(-1).max(1),
    moveY: z.number().min(-1).max(1),
    facing: z.number().int().min(0).max(255),
    flags: z.number().int().min(0).max(255),
  }),
  z.object({
    type: z.literal('inv.move'),
    opId: uuid,
    itemId: uuid,
    qty: z.number().int().min(1).max(999),
    from: ContainerRef,
    to: ContainerRef,
    expectedFromVersion: nat,
    expectedToVersion: nat,
  }),
  z.object({
    type: z.literal('interact.begin'),
    opId: uuid,
    targetId: nat,
    actionId: z.string().min(1).max(32),
  }),
  z.object({
    type: z.literal('interact.cancel'),
    opId: uuid,
  }),
  z.object({
    type: z.literal('chat'),
    channel: z.enum(['local', 'group']),
    text: z.string().min(1).max(MAX_CHAT_CHARS),
  }),
  z.object({
    type: z.literal('ping'),
    t: nat,
  }),
]);

export type ClientMessage = z.infer<typeof ClientMessage>;
export type ClientMessageType = ClientMessage['type'];
export type ContainerRef = z.infer<typeof ContainerRef>;

export const ClientEnvelope = z.object({
  v: z.literal(PROTOCOL_VERSION),
  cs: nat,
  msg: ClientMessage,
});

export type ClientEnvelope = z.infer<typeof ClientEnvelope>;
