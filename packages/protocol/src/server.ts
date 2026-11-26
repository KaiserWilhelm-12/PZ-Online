import { z } from 'zod';
import { PROTOCOL_VERSION } from './client';

const uuid = z.string().uuid();
const nat = z.number().int().nonnegative();

export const SoundKindSchema = z.enum([
  'footstep',
  'melee',
  'gunshot',
  'glass',
  'door',
  'engine',
  'alarm',
  'generator',
  'voice',
  'impact',
]);

export const SoundEventSchema = z.object({
  id: z.number().int().nonnegative(),
  kind: SoundKindSchema,
  x: z.number(),
  y: z.number(),
  z: z.number().int().min(0).max(2),
  intensity: z.number().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  indoor: z.boolean(),
  sourceEntity: z.number().int().nonnegative().nullable(),
  atTick: z.number().int().nonnegative(),
});

export type SoundEvent = z.infer<typeof SoundEventSchema>;

export const EntityDeltaSchema = z.object({
  id: z.number().int().nonnegative(),
  kind: z.number().int().min(0).max(255),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int().min(0).max(2),
  facing: z.number().int().min(0).max(255),
  state: z.number().int().min(0).max(255),
  mask: z.number().int().nonnegative(),
});

export type EntityDelta = z.infer<typeof EntityDeltaSchema>;

export const InvFailureSchema = z.enum([
  'version_conflict',
  'over_capacity',
  'not_reachable',
  'locked',
  'not_found',
  'rate_limited',
]);

export type InvFailure = z.infer<typeof InvFailureSchema>;

export const ServerMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    playerId: uuid,
    characterId: uuid.nullable(),
    worldTimeSec: z.number().nonnegative(),
    tickRate: z.number().int().positive(),
    reconnectToken: z.string().min(1).max(128),
  }),
  z.object({
    type: z.literal('snapshot'),
    id: nat,
    tick: nat,
    ackInput: nat,
    entities: z.array(EntityDeltaSchema),
    removed: z.array(nat),
  }),
  z.object({
    type: z.literal('inv.result'),
    opId: uuid,
    ok: z.boolean(),
    reason: InvFailureSchema.optional(),
    versions: z.array(
      z.object({
        containerId: uuid,
        version: nat,
      }),
    ),
  }),
  z.object({
    type: z.literal('sound'),
    event: SoundEventSchema,
  }),
  z.object({
    type: z.literal('pong'),
    t: nat,
  }),
  z.object({
    type: z.literal('error'),
    code: z.string().min(1).max(64),
    fatal: z.boolean(),
  }),
]);

export type ServerMessage = z.infer<typeof ServerMessage>;

export const ServerEnvelope = z.object({
  v: z.literal(PROTOCOL_VERSION),
  ss: nat,
  msg: ServerMessage,
});

export type ServerEnvelope = z.infer<typeof ServerEnvelope>;
