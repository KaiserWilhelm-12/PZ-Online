import { describe, expect, it } from 'vitest';
import { createPrng, deriveSeed, hashString } from './prng';

describe('hashString', () => {
  it('is stable and unsigned', () => {
    const first = hashString('lanternfall');
    expect(first).toBe(hashString('lanternfall'));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(0xffffffff);
  });

  it('changes when the input changes', () => {
    expect(hashString('chunk:0,0')).not.toBe(hashString('chunk:0,1'));
  });
});

describe('deriveSeed', () => {
  it('is deterministic for the same parts', () => {
    expect(deriveSeed(['server', 7, 'container', 'abc'])).toBe(
      deriveSeed(['server', 7, 'container', 'abc']),
    );
  });

  it('distinguishes part boundaries', () => {
    expect(deriveSeed(['ab', 'c'])).not.toBe(deriveSeed(['a', 'bc']));
  });
});

describe('createPrng', () => {
  it('produces the same sequence for the same seed', () => {
    const left = createPrng(123456);
    const right = createPrng(123456);
    const leftValues = Array.from({ length: 16 }, () => left.nextUint32());
    const rightValues = Array.from({ length: 16 }, () => right.nextUint32());
    expect(leftValues).toEqual(rightValues);
  });

  it('produces different sequences for different seeds', () => {
    const left = createPrng(1).nextUint32();
    const right = createPrng(2).nextUint32();
    expect(left).not.toBe(right);
  });

  it('keeps floats in [0, 1)', () => {
    const prng = createPrng(99);
    for (let index = 0; index < 1000; index += 1) {
      const value = prng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps integers inside the requested range', () => {
    const prng = createPrng(77);
    for (let index = 0; index < 1000; index += 1) {
      const value = prng.nextInt(-5, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(6);
    }
  });

  it('rejects invalid integer bounds', () => {
    const prng = createPrng(1);
    expect(() => prng.nextInt(5, 5)).toThrow(RangeError);
    expect(() => prng.nextInt(0.5, 2)).toThrow(RangeError);
  });

  it('forks deterministically and independently', () => {
    const first = createPrng(42).fork('loot');
    const second = createPrng(42).fork('loot');
    expect(first.nextUint32()).toBe(second.nextUint32());
    expect(createPrng(42).fork('loot').nextUint32()).not.toBe(
      createPrng(42).fork('migration').nextUint32(),
    );
  });
});
