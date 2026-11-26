export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new RangeError('clamp requires finite numbers');
  }
  if (min > max) {
    throw new RangeError('clamp requires min <= max');
  }
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export function normalizeVector(x: number, y: number): Vector2 {
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

export function quantizeToSixteenth(tiles: number): number {
  return Math.round(tiles * 16);
}

export function dequantizeFromSixteenth(units: number): number {
  return units / 16;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function shortestAngleDifference(fromRad: number, toRad: number): number {
  let delta = (toRad - fromRad) % (Math.PI * 2);
  if (delta > Math.PI) {
    delta -= Math.PI * 2;
  } else if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return delta;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface IsometricProjection {
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly originX: number;
  readonly originY: number;
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  projection: IsometricProjection,
): ScreenPoint {
  if (
    !Number.isFinite(worldX) ||
    !Number.isFinite(worldY) ||
    !Number.isFinite(projection.tileWidth) ||
    !Number.isFinite(projection.tileHeight) ||
    !Number.isFinite(projection.originX) ||
    !Number.isFinite(projection.originY)
  ) {
    throw new RangeError('Isometric projection values must be finite');
  }
  if (projection.tileWidth <= 0 || projection.tileHeight <= 0) {
    throw new RangeError('Isometric tile dimensions must be positive');
  }

  return {
    x: projection.originX + (worldX - worldY) * (projection.tileWidth / 2),
    y: projection.originY + (worldX + worldY) * (projection.tileHeight / 2),
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  projection: IsometricProjection,
): ScreenPoint {
  if (
    !Number.isFinite(screenX) ||
    !Number.isFinite(screenY) ||
    !Number.isFinite(projection.tileWidth) ||
    !Number.isFinite(projection.tileHeight) ||
    !Number.isFinite(projection.originX) ||
    !Number.isFinite(projection.originY)
  ) {
    throw new RangeError('Isometric projection values must be finite');
  }
  if (projection.tileWidth <= 0 || projection.tileHeight <= 0) {
    throw new RangeError('Isometric tile dimensions must be positive');
  }

  const relativeX = screenX - projection.originX;
  const relativeY = screenY - projection.originY;
  return {
    x: relativeX / projection.tileWidth + relativeY / projection.tileHeight,
    y: relativeY / projection.tileHeight - relativeX / projection.tileWidth,
  };
}

export function screenToTile(
  screenX: number,
  screenY: number,
  projection: IsometricProjection,
): ScreenPoint {
  const world = screenToWorld(screenX, screenY, projection);
  const candidates: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] = [
    { x: Math.floor(world.x), y: Math.floor(world.y) },
    { x: Math.floor(world.x), y: Math.ceil(world.y) },
    { x: Math.ceil(world.x), y: Math.floor(world.y) },
    { x: Math.ceil(world.x), y: Math.ceil(world.y) },
  ];

  let nearest = candidates[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const center = worldToScreen(candidate.x, candidate.y, projection);
    const distanceX = screenX - center.x;
    const distanceY = screenY - center.y;
    const distance = distanceX * distanceX + distanceY * distanceY;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}
