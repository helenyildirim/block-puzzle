// Saf (UI'dan bağımsız) oyun mantığı: tahta, yerleştirme, patlama, puan, parça üretimi.
// Tahta hızlı hesap için satır bit maskelerine çevrilir (her satır 8 bit).

import { SHAPES, ShapeDef, getShape } from './pieces';
import { mulberry32 } from './rng';

export const SIZE = 8;
const FULL = 0xff;

/** [satır][sütun] -> 0 = boş, 1..6 = renk */
export type Board = number[][];
export type Mode = 'classic' | 'daily';

export type Piece = { shapeId: string; color: number };

export type GameState = {
  mode: Mode;
  board: Board;
  tray: (Piece | null)[];
  score: number;
  streak: number;
  /** Son temizlemeden beri kaç parça yerleştirildi */
  dry: number;
  over: boolean;
  seed: number;
  trays: number;
  moves: number;
};

export type MoveResult = {
  ok: boolean;
  state: GameState;
  placedCells: [number, number][];
  clearedRows: number[];
  clearedCols: number[];
  /** Patlayan hücreler (animasyon için renkleriyle birlikte) */
  clearedCells: { r: number; c: number; color: number }[];
  lines: number;
  placementPoints: number;
  linePoints: number;
  bonusPoints: number;
  gained: number;
  multiplier: number;
  emptied: boolean;
  newTray: boolean;
};

export const LINE_POINTS = [0, 10, 20, 60, 120, 200, 300];
export const EMPTY_BOARD_BONUS = 300;
const MAX_MULTIPLIER = 4;

// ---------------------------------------------------------------------------
// Tahta yardımcıları

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.slice());
}

export function boardToMasks(board: Board): number[] {
  return board.map((row) => {
    let m = 0;
    for (let c = 0; c < SIZE; c++) if (row[c]) m |= 1 << c;
    return m;
  });
}

export function filledCount(board: Board): number {
  let n = 0;
  for (const row of board) for (const v of row) if (v) n++;
  return n;
}

export function canPlaceMasks(masks: number[], shape: ShapeDef, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r + shape.h > SIZE || c + shape.w > SIZE) return false;
  for (let i = 0; i < shape.h; i++) {
    if (masks[r + i] & (shape.rowMasks[i] << c)) return false;
  }
  return true;
}

export function canPlace(board: Board, shape: ShapeDef, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r + shape.h > SIZE || c + shape.w > SIZE) return false;
  for (const [dr, dc] of shape.cells) {
    if (board[r + dr][c + dc]) return false;
  }
  return true;
}

export function fitsAnywhere(board: Board, shape: ShapeDef): boolean {
  const masks = boardToMasks(board);
  return fitsAnywhereMasks(masks, shape);
}

function fitsAnywhereMasks(masks: number[], shape: ShapeDef): boolean {
  for (let r = 0; r <= SIZE - shape.h; r++) {
    for (let c = 0; c <= SIZE - shape.w; c++) {
      if (canPlaceMasks(masks, shape, r, c)) return true;
    }
  }
  return false;
}

function placeMasks(masks: number[], shape: ShapeDef, r: number, c: number): number[] {
  const out = masks.slice();
  for (let i = 0; i < shape.h; i++) out[r + i] |= shape.rowMasks[i] << c;
  return out;
}

/** Dolu satır ve sütunları bulur (satır/sütunlar aynı anda değerlendirilir). */
function findFullLines(masks: number[]): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  let colAnd = FULL;
  for (let r = 0; r < SIZE; r++) {
    if (masks[r] === FULL) rows.push(r);
    colAnd &= masks[r];
  }
  const cols: number[] = [];
  for (let c = 0; c < SIZE; c++) if (colAnd & (1 << c)) cols.push(c);
  return { rows, cols };
}

function clearMasks(masks: number[], rows: number[], cols: number[]): number[] {
  const out = masks.slice();
  for (const r of rows) out[r] = 0;
  let colMask = 0;
  for (const c of cols) colMask |= 1 << c;
  if (colMask) for (let r = 0; r < SIZE; r++) out[r] &= ~colMask;
  return out;
}

// ---------------------------------------------------------------------------
// Parça üretimi (tahtaya duyarlı, oynanabilirlik kontrollü)

/**
 * Sıralı oynanabilirlik: parçalar bir sırayla (patlamalar simüle edilerek)
 * hepsi yerleştirilebiliyor mu? Düğüm bütçesi aşılırsa false döner.
 */
function solvable(masks: number[], shapes: ShapeDef[], budget: { n: number }): boolean {
  if (shapes.length === 0) return true;
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const rest = shapes.filter((_, j) => j !== i);
    for (let r = 0; r <= SIZE - shape.h; r++) {
      for (let c = 0; c <= SIZE - shape.w; c++) {
        if (!canPlaceMasks(masks, shape, r, c)) continue;
        if (budget.n-- <= 0) return false;
        let next = placeMasks(masks, shape, r, c);
        const { rows, cols } = findFullLines(next);
        if (rows.length || cols.length) next = clearMasks(next, rows, cols);
        if (solvable(next, rest, budget)) return true;
      }
    }
  }
  return false;
}

function canClearWith(masks: number[], shape: ShapeDef): boolean {
  for (let r = 0; r <= SIZE - shape.h; r++) {
    for (let c = 0; c <= SIZE - shape.w; c++) {
      if (!canPlaceMasks(masks, shape, r, c)) continue;
      const next = placeMasks(masks, shape, r, c);
      const { rows, cols } = findFullLines(next);
      if (rows.length || cols.length) return true;
    }
  }
  return false;
}

function weightedPick(weights: number[], rnd: () => number): number {
  let total = 0;
  for (const w of weights) total += w;
  let x = rnd() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * 3 parçalık yeni set üretir. Tamamen rastgele değil:
 *  - tahtaya sığmayan parçaların ağırlığı düşürülür, satır tamamlayanların artırılır
 *  - set, sınırlı sayıda denemeyle "üçü de sırayla yerleştirilebilir" kontrolünden geçirilir
 *  - olmazsa en az biri sığan sete, o da olmazsa rastgele sete düşülür
 */
export function generateTray(board: Board, seed: number, trayIndex: number): Piece[] {
  const rnd = mulberry32(seed + trayIndex * 7919 + 13);
  const masks = boardToMasks(board);
  const crowded = filledCount(board) > 40;

  const weights = SHAPES.map((s) => {
    let w = s.weight;
    if (!fitsAnywhereMasks(masks, s)) w *= 0.1;
    else if (canClearWith(masks, s)) w *= 2.2;
    if (crowded && s.cells.length >= 5) w *= 0.5;
    return w;
  });

  const draw = (): ShapeDef[] => {
    const picked: ShapeDef[] = [];
    for (let k = 0; k < 3; k++) picked.push(SHAPES[weightedPick(weights, rnd)]);
    // Üçü birden aynı olmasın
    if (picked[0].id === picked[1].id && picked[1].id === picked[2].id) {
      picked[2] = SHAPES[weightedPick(weights, rnd)];
    }
    return picked;
  };

  let fallbackAny: ShapeDef[] | null = null;
  let last: ShapeDef[] = draw();
  for (let attempt = 0; attempt < 40; attempt++) {
    const cand = attempt === 0 ? last : draw();
    last = cand;
    if (solvable(masks, cand, { n: 4000 })) return toPieces(cand);
    if (!fallbackAny && cand.some((s) => fitsAnywhereMasks(masks, s))) fallbackAny = cand;
  }
  return toPieces(fallbackAny ?? last);
}

function toPieces(shapes: ShapeDef[]): Piece[] {
  return shapes.map((s) => ({ shapeId: s.id, color: s.color }));
}

// ---------------------------------------------------------------------------
// Oyun durumu

export function createGame(mode: Mode, seed: number): GameState {
  let board = emptyBoard();
  if (mode === 'daily') board = dailyBoard(seed);
  return {
    mode,
    board,
    tray: generateTray(board, seed, 0),
    score: 0,
    streak: 0,
    dry: 0,
    over: false,
    seed,
    trays: 1,
    moves: 0,
  };
}

/** Günlük meydan okuma: tohumdan türeyen, hazır dolu bir başlangıç tahtası. */
function dailyBoard(seed: number): Board {
  const rnd = mulberry32(seed * 31 + 7);
  const board = emptyBoard();
  const target = 3 + Math.floor(rnd() * 3); // 3-5 parça
  let placed = 0;
  let guard = 0;
  while (placed < target && guard++ < 60) {
    const shape = SHAPES[Math.floor(rnd() * SHAPES.length)];
    const r = Math.floor(rnd() * (SIZE - shape.h + 1));
    const c = Math.floor(rnd() * (SIZE - shape.w + 1));
    if (!canPlace(board, shape, r, c)) continue;
    for (const [dr, dc] of shape.cells) board[r + dr][c + dc] = shape.color;
    placed++;
  }
  // Başlangıçta tamamlanmış çizgi kalmasın
  const { rows, cols } = findFullLines(boardToMasks(board));
  for (const r of rows) for (let c = 0; c < SIZE; c++) board[r][c] = 0;
  for (const c of cols) for (let r = 0; r < SIZE; r++) board[r][c] = 0;
  return board;
}

export function lineMultiplier(streak: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + 0.5 * (streak - 1));
}

/** Tepsideki parça `slot`'u (r, c) köşesine koyar. Geçersizse ok=false döner. */
export function applyMove(state: GameState, slot: number, r: number, c: number): MoveResult {
  const piece = state.tray[slot];
  const fail: MoveResult = {
    ok: false,
    state,
    placedCells: [],
    clearedRows: [],
    clearedCols: [],
    clearedCells: [],
    lines: 0,
    placementPoints: 0,
    linePoints: 0,
    bonusPoints: 0,
    gained: 0,
    multiplier: 1,
    emptied: false,
    newTray: false,
  };
  if (state.over || !piece) return fail;
  const shape = getShape(piece.shapeId);
  if (!canPlace(state.board, shape, r, c)) return fail;

  const board = cloneBoard(state.board);
  const placedCells: [number, number][] = shape.cells.map(([dr, dc]) => [r + dr, c + dc]);
  for (const [pr, pc] of placedCells) board[pr][pc] = piece.color;

  const { rows, cols } = findFullLines(boardToMasks(board));
  const clearedCells: { r: number; c: number; color: number }[] = [];
  const seen = new Set<number>();
  const collect = (rr: number, cc: number) => {
    const key = rr * SIZE + cc;
    if (seen.has(key)) return;
    seen.add(key);
    clearedCells.push({ r: rr, c: cc, color: board[rr][cc] });
  };
  for (const rr of rows) for (let cc = 0; cc < SIZE; cc++) collect(rr, cc);
  for (const cc of cols) for (let rr = 0; rr < SIZE; rr++) collect(rr, cc);
  for (const cell of clearedCells) board[cell.r][cell.c] = 0;

  const lines = rows.length + cols.length;
  const placementPoints = shape.cells.length;

  let streak = state.streak;
  let dry = state.dry;
  let linePoints = 0;
  let multiplier = 1;
  if (lines > 0) {
    streak += 1;
    dry = 0;
    multiplier = lineMultiplier(streak);
    linePoints = Math.round(LINE_POINTS[Math.min(lines, 6)] * multiplier);
  } else {
    dry += 1;
    if (dry >= 3) streak = 0;
  }

  const emptied = lines > 0 && filledCount(board) === 0;
  const bonusPoints = emptied ? EMPTY_BOARD_BONUS : 0;
  const gained = placementPoints + linePoints + bonusPoints;

  const tray = state.tray.slice();
  tray[slot] = null;
  let trays = state.trays;
  let newTray = false;
  let nextTray: (Piece | null)[] = tray;
  if (tray.every((p) => p === null)) {
    nextTray = generateTray(board, state.seed, trays);
    trays += 1;
    newTray = true;
  }

  const next: GameState = {
    ...state,
    board,
    tray: nextTray,
    score: state.score + gained,
    streak,
    dry,
    trays,
    moves: state.moves + 1,
    over: false,
  };
  next.over = isGameOver(next);

  return {
    ok: true,
    state: next,
    placedCells,
    clearedRows: rows,
    clearedCols: cols,
    clearedCells,
    lines,
    placementPoints,
    linePoints,
    bonusPoints,
    gained,
    multiplier,
    emptied,
    newTray,
  };
}

/** Tepsideki hiçbir parça tahtaya sığmıyorsa oyun biter. */
export function isGameOver(state: GameState): boolean {
  const masks = boardToMasks(state.board);
  for (const p of state.tray) {
    if (!p) continue;
    if (fitsAnywhereMasks(masks, getShape(p.shapeId))) return false;
  }
  return true;
}

/** Tepsideki her parça için: şu an tahtaya sığıyor mu? */
export function trayFits(state: GameState): boolean[] {
  const masks = boardToMasks(state.board);
  return state.tray.map((p) => (p ? fitsAnywhereMasks(masks, getShape(p.shapeId)) : false));
}

/**
 * Bir parça (r, c)'ye konursa hangi satır/sütunlar patlar? (Sürüklerken parlatmak için.)
 */
export function previewClears(
  board: Board,
  shape: ShapeDef,
  r: number,
  c: number,
): { rows: number[]; cols: number[] } {
  if (!canPlace(board, shape, r, c)) return { rows: [], cols: [] };
  const masks = placeMasks(boardToMasks(board), shape, r, c);
  return findFullLines(masks);
}
