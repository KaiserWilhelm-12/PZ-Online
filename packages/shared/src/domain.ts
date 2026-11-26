import type { CharacterId, ContainerId, ItemId, PlayerId } from './ids';

export interface ItemDef {
  id: string;
  massG: number;
  volumeMl: number;
  maxStack: number;
  tags: readonly string[];
  spoilsAfterHours: number | null;
  maxDurability: number | null;
}

export interface ItemInstance {
  id: ItemId;
  defId: string;
  qty: number;
  durability: number | null;
  freshness: number | null;
  wetness: number;
  contamination: number;
  temperatureC: number;
  fuel: number | null;
  ammo: number | null;
  tags: readonly string[];
  version: number;
}

export type ContainerKind = 'body' | 'bag' | 'furniture' | 'ground' | 'vehicle';

export interface ContainerState {
  id: ContainerId;
  kind: ContainerKind;
  maxMassG: number;
  maxVolumeMl: number;
  nestDepth: number;
  lockedBy: PlayerId | null;
  version: number;
  itemIds: readonly ItemId[];
}

export type BodyRegion =
  'head' | 'torso' | 'armL' | 'armR' | 'handL' | 'handR' | 'legL' | 'legR' | 'footL' | 'footR';

export type WoundKind =
  | 'scratch'
  | 'laceration'
  | 'puncture'
  | 'bite'
  | 'bruise'
  | 'burn'
  | 'deep'
  | 'fracture'
  | 'sprain'
  | 'debris';

export interface Wound {
  id: string;
  region: BodyRegion;
  kind: WoundKind;
  severity: number;
  bleedPerMin: number;
  infection: number;
  dressed: boolean;
  dressingDirty: boolean;
  atWorldSec: number;
}

export interface Vitals {
  hunger: number;
  thirst: number;
  fatigue: number;
  bodyTempC: number;
  bloodMl: number;
  pain: number;
  endurance: number;
  fear: number;
  stress: number;
  morale: number;
}

export type SoundKind =
  | 'footstep'
  | 'melee'
  | 'gunshot'
  | 'glass'
  | 'door'
  | 'engine'
  | 'alarm'
  | 'generator'
  | 'voice'
  | 'impact';

export interface SoundEvent {
  id: number;
  kind: SoundKind;
  x: number;
  y: number;
  z: number;
  intensity: number;
  durationMs: number;
  indoor: boolean;
  sourceEntity: number | null;
  atTick: number;
}

export interface CharacterRef {
  readonly characterId: CharacterId;
}
