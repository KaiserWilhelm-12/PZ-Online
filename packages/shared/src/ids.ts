export type Brand<T, B extends string> = T & { readonly __brand: B };

export type PlayerId = Brand<string, 'PlayerId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ContainerId = Brand<string, 'ContainerId'>;
export type OpId = Brand<string, 'OpId'>;
export type EntityId = Brand<number, 'EntityId'>;

export const asPlayerId = (value: string): PlayerId => value as PlayerId;
export const asCharacterId = (value: string): CharacterId => value as CharacterId;
export const asItemId = (value: string): ItemId => value as ItemId;
export const asContainerId = (value: string): ContainerId => value as ContainerId;
export const asOpId = (value: string): OpId => value as OpId;

export const asEntityId = (value: number): EntityId => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('EntityId must be an unsigned 32-bit integer');
  }
  return value as EntityId;
};

export const CHUNK_SIZE = 32;
export const TILES_PER_CHUNK_FLOOR = CHUNK_SIZE * CHUNK_SIZE;
export const FLOOR_COUNT = 3;
export const MAX_FLOOR_Z = FLOOR_COUNT - 1;

export interface TileCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ChunkCoord {
  readonly cx: number;
  readonly cy: number;
}

export const chunkCoordOfTile = (tile: TileCoord): ChunkCoord => ({
  cx: Math.floor(tile.x / CHUNK_SIZE),
  cy: Math.floor(tile.y / CHUNK_SIZE),
});

export const chunkKey = (coord: ChunkCoord): string => `${coord.cx},${coord.cy}`;

export const localTileIndex = (tile: TileCoord): number => {
  const lx = ((tile.x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((tile.y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return tile.z * TILES_PER_CHUNK_FLOOR + ly * CHUNK_SIZE + lx;
};
