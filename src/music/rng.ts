/** Xoshiro128** with fixed 32-bit seeding; algorithm version 1. */
export const MUSIC_ALGORITHM_VERSION = 1;

const UINT32_RANGE = 0x100000000;
const rotateLeft = (value: number, bits: number) => (value << bits) | (value >>> (32 - bits));

export function createMusicRng(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE) {
    throw new RangeError('Music seed must be a uint32');
  }

  let source = seed >>> 0;
  function splitmix32() {
    source = (source + 0x9e3779b9) >>> 0;
    let value = source;
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
    return (value ^ (value >>> 16)) >>> 0;
  }

  let a = splitmix32();
  let b = splitmix32();
  let c = splitmix32();
  let d = splitmix32();

  function nextUint32() {
    const result = Math.imul(rotateLeft(Math.imul(b, 5), 7), 9) >>> 0;
    const temp = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= temp;
    d = rotateLeft(d, 11);
    return result;
  }

  function nextInt(exclusiveUpperBound: number) {
    if (!Number.isInteger(exclusiveUpperBound) || exclusiveUpperBound < 1 || exclusiveUpperBound > UINT32_RANGE) {
      throw new RangeError('Upper bound must be an integer between 1 and 2^32');
    }
    const limit = UINT32_RANGE - (UINT32_RANGE % exclusiveUpperBound);
    let value: number;
    do value = nextUint32(); while (value >= limit);
    return value % exclusiveUpperBound;
  }

  return { nextUint32, nextInt, nextFloat: () => nextUint32() / UINT32_RANGE };
}

/** Stable substream seed for independently generated instrument parts. */
export function deriveMusicSeed(seed: number, part: string) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE || !part) {
    throw new RangeError('Invalid seed or part name');
  }
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (let index = 0; index < part.length; index++) {
    hash = Math.imul(hash ^ part.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash;
}
