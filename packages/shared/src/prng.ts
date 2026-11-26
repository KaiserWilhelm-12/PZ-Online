/**
 * Deterministic, seedable PRNG for gameplay rolls.
 * This is intentionally not cryptographically secure.
 */
export interface Prng {
  nextUint32(): number;
  nextFloat(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
  fork(label: string): Prng;
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deriveSeed(parts: readonly (string | number | boolean)[]): number {
  const material = parts.map((part) => `${typeof part}:${String(part)}`).join('|');
  return hashString(material);
}

export function createPrng(seed: number): Prng {
  const baseSeed = seed >>> 0;
  let state = baseSeed;

  const nextUint32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  };

  return {
    nextUint32,
    nextFloat: () => nextUint32() / 4294967296,
    nextInt: (minInclusive, maxExclusive) => {
      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
        throw new RangeError('nextInt requires integer bounds');
      }
      if (maxExclusive <= minInclusive) {
        throw new RangeError('nextInt requires maxExclusive > minInclusive');
      }
      return minInclusive + Math.floor((nextUint32() / 4294967296) * (maxExclusive - minInclusive));
    },
    fork: (label) => createPrng(deriveSeed([baseSeed, label])),
  };
}
