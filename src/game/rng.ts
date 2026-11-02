// Tohumlu (seeded) rastgele sayı üretici. Günlük meydan okuma için aynı gün = aynı tohum.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Yerel tarihten YYYYMMDD sayısı */
export function dateSeed(d: Date = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
