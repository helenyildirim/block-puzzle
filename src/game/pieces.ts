// Parça (şekil) kataloğu. Parçalar döndürülmez; her yön ayrı bir şekil olarak tanımlı.

export type ShapeDef = {
  id: string;
  /** [satır, sütun] hücreleri */
  cells: [number, number][];
  w: number;
  h: number;
  /** 1..6 renk indeksi */
  color: number;
  /** Üretimde seçilme ağırlığı */
  weight: number;
  /** Her satır için bit maskesi (bit i = i. sütun) */
  rowMasks: number[];
};

// Renk indeksleri: 1 mavi, 2 sarı, 3 kırmızı, 4 yeşil, 5 mor, 6 turuncu
const BLUE = 1;
const YELLOW = 2;
const RED = 3;
const GREEN = 4;
const PURPLE = 5;
const ORANGE = 6;

function parse(id: string, rows: string[], color: number, weight: number): ShapeDef {
  const cells: [number, number][] = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') cells.push([r, c]);
    });
  });
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const rowMasks = rows.map((row) => {
    let m = 0;
    [...row].forEach((ch, c) => {
      if (ch === '#') m |= 1 << c;
    });
    return m;
  });
  return { id, cells, w, h, color, weight, rowMasks };
}

export const SHAPES: ShapeDef[] = [
  // Tek kare
  parse('dot', ['#'], BLUE, 2),

  // Düz çizgiler
  parse('h2', ['##'], BLUE, 5),
  parse('v2', ['#', '#'], BLUE, 5),
  parse('h3', ['###'], BLUE, 6),
  parse('v3', ['#', '#', '#'], BLUE, 6),
  parse('h4', ['####'], BLUE, 4),
  parse('v4', ['#', '#', '#', '#'], BLUE, 4),
  parse('h5', ['#####'], BLUE, 2.5),
  parse('v5', ['#', '#', '#', '#', '#'], BLUE, 2.5),

  // Kareler / dikdörtgenler
  parse('sq2', ['##', '##'], YELLOW, 6),
  parse('sq3', ['###', '###', '###'], YELLOW, 2.5),
  parse('r23', ['###', '###'], YELLOW, 3.5),
  parse('r32', ['##', '##', '##'], YELLOW, 3.5),

  // Küçük L (3 kare, 4 yön)
  parse('l2a', ['#.', '##'], ORANGE, 4),
  parse('l2b', ['.#', '##'], ORANGE, 4),
  parse('l2c', ['##', '#.'], ORANGE, 4),
  parse('l2d', ['##', '.#'], ORANGE, 4),

  // Büyük L (5 kare, 3x3 köşe, 4 yön)
  parse('l3a', ['#..', '#..', '###'], PURPLE, 2.5),
  parse('l3b', ['..#', '..#', '###'], PURPLE, 2.5),
  parse('l3c', ['###', '#..', '#..'], PURPLE, 2.5),
  parse('l3d', ['###', '..#', '..#'], PURPLE, 2.5),

  // Uzun L (4 kare, 8 yön)
  parse('lg1', ['#.', '#.', '##'], PURPLE, 2),
  parse('lg2', ['.#', '.#', '##'], PURPLE, 2),
  parse('lg3', ['##', '#.', '#.'], PURPLE, 2),
  parse('lg4', ['##', '.#', '.#'], PURPLE, 2),
  parse('lg5', ['###', '#..'], PURPLE, 2),
  parse('lg6', ['###', '..#'], PURPLE, 2),
  parse('lg7', ['#..', '###'], PURPLE, 2),
  parse('lg8', ['..#', '###'], PURPLE, 2),

  // T şekilleri
  parse('t1', ['###', '.#.'], GREEN, 3),
  parse('t2', ['.#.', '###'], GREEN, 3),
  parse('t3', ['#.', '##', '#.'], GREEN, 3),
  parse('t4', ['.#', '##', '.#'], GREEN, 3),

  // S / Z şekilleri
  parse('s1', ['.##', '##.'], RED, 3),
  parse('s2', ['##.', '.##'], RED, 3),
  parse('s3', ['#.', '##', '.#'], RED, 3),
  parse('s4', ['.#', '##', '#.'], RED, 3),
];

const BY_ID: Record<string, ShapeDef> = {};
SHAPES.forEach((s) => {
  BY_ID[s.id] = s;
});

export function getShape(id: string): ShapeDef {
  const s = BY_ID[id];
  if (!s) throw new Error(`Unknown shape: ${id}`);
  return s;
}
