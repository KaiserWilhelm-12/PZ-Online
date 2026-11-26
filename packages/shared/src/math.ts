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
