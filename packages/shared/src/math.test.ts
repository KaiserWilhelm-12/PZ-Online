import { describe, expect, it } from 'vitest';
import {
  clamp,
  dequantizeFromSixteenth,
  degToRad,
  distance,
  lerp,
  normalizeVector,
  quantizeToSixteenth,
  radToDeg,
  shortestAngleDifference,
} from './math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('rejects inverted or non-finite bounds', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
    expect(() => clamp(Number.NaN, 0, 1)).toThrow(RangeError);
  });
});

describe('lerp', () => {
  it('interpolates between endpoints', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});

describe('distance and vector helpers', () => {
  it('measures euclidean distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('normalizes a vector to unit length', () => {
    const vector = normalizeVector(3, 4);
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1);
  });

  it('returns a zero vector for zero input', () => {
    expect(normalizeVector(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('fixed point conversion', () => {
  it('round-trips tile coordinates at 1/16 precision', () => {
    expect(dequantizeFromSixteenth(quantizeToSixteenth(12.0625))).toBe(12.0625);
    expect(quantizeToSixteenth(1.04)).toBe(17);
  });
});

describe('angles', () => {
  it('converts between degrees and radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
  });

  it('finds the shortest wrapped difference', () => {
    expect(shortestAngleDifference(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(shortestAngleDifference(Math.PI * 1.9, Math.PI * 0.1)).toBeCloseTo(Math.PI * 0.2);
  });
});
