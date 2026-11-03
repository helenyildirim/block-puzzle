// Oyun mantığı testleri. Çalıştırma: npx tsx scripts/test-engine.ts
import assert from 'node:assert/strict';
import { SHAPES, getShape } from '../src/game/pieces';
import {
  SIZE,
  applyMove,
  boardToMasks,
  canPlace,
  createGame,
  emptyBoard,
  generateTray,
  isGameOver,
  GameState,
} from '../src/game/engine';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

function stateWith(board: number[][], tray: string[], extra: Partial<GameState> = {}): GameState {
  return {
    mode: 'classic',
    board,
    tray: tray.map((id) => ({ shapeId: id, color: getShape(id).color })),
    score: 0,
    streak: 0,
    dry: 0,
    over: false,
    seed: 1,
    trays: 1,
    moves: 0,
    ...extra,
  };
}

console.log('Parçalar');
test('id benzersiz, maske ve hücre sayısı tutarlı', () => {
  const ids = new Set(SHAPES.map((s) => s.id));
  assert.equal(ids.size, SHAPES.length);
  for (const s of SHAPES) {
    let bits = 0;
    for (const m of s.rowMasks) for (let i = 0; i < 8; i++) if (m & (1 << i)) bits++;
    assert.equal(bits, s.cells.length, s.id);
    assert.ok(s.w <= SIZE && s.h <= SIZE);
    assert.ok(s.color >= 1 && s.color <= 6);
  }
});

console.log('Yerleştirme ve patlama');
test('tek satır tamamlanınca patlar, puan = parça + 10', () => {
  const b = emptyBoard();
  for (let c = 0; c < 5; c++) b[7][c] = 1;
  b[0][0] = 1; // tahta boşalıp bonus tetiklemesin
  const res = applyMove(stateWith(b, ['h3', 'dot', 'dot']), 0, 7, 5);
  assert.ok(res.ok);
  assert.deepEqual(res.clearedRows, [7]);
  assert.equal(res.lines, 1);
  assert.equal(res.gained, 3 + 10);
  assert.equal(res.state.board[7].every((v) => v === 0), true);
  assert.equal(res.state.streak, 1);
});

test('satır ve sütun aynı hamlede patlar (kesişim bir kez sayılır)', () => {
  const b = emptyBoard();
  for (let c = 0; c < SIZE; c++) if (c !== 3) b[2][c] = 1; // satır 2, sütun 3 hariç dolu
  for (let r = 0; r < SIZE; r++) if (r !== 2) b[r][3] = 2; // sütun 3, satır 2 hariç dolu
  const res = applyMove(stateWith(b, ['dot', 'dot', 'dot']), 0, 2, 3);
  assert.ok(res.ok);
  assert.deepEqual(res.clearedRows, [2]);
  assert.deepEqual(res.clearedCols, [3]);
  assert.equal(res.clearedCells.length, 15);
  assert.equal(res.lines, 2);
  assert.equal(res.linePoints, 20);
});

test('geçersiz hamle reddedilir', () => {
  const b = emptyBoard();
  b[0][0] = 1;
  const s = stateWith(b, ['sq2', 'dot', 'dot']);
  assert.equal(applyMove(s, 0, 0, 0).ok, false); // dolu hücre
  assert.equal(applyMove(s, 0, 7, 7).ok, false); // taşıyor
  assert.equal(applyMove(s, 0, -1, 0).ok, false);
  assert.equal(canPlace(b, getShape('sq2'), 6, 6), true);
});

test('3 çizgi = 60 puan', () => {
  const b = emptyBoard();
  for (const r of [0, 1, 2]) for (let c = 0; c < 5; c++) b[r][c] = 1;
  b[7][7] = 1; // tahta boşalıp bonus tetiklemesin
  // v3 ile değil, r? 3x? -> 3 satır x 3 sütun kare ile tamamla: sq3 (3x3) 5..7. sütun
  const res = applyMove(stateWith(b, ['sq3', 'dot', 'dot']), 0, 0, 5);
  assert.equal(res.lines, 3);
  assert.equal(res.linePoints, 60);
  assert.equal(res.gained, 9 + 60);
});

console.log('Seri (streak)');
test('üst üste temizleme çarpanı artırır, 3 boş hamle seriyi sıfırlar', () => {
  const mk = () => {
    const b = emptyBoard();
    for (let c = 0; c < 7; c++) b[7][c] = 1;
    for (let c = 0; c < 7; c++) b[6][c] = 1;
    return b;
  };
  let s = stateWith(mk(), ['dot', 'dot', 'dot']);
  let res = applyMove(s, 0, 7, 7);
  assert.equal(res.state.streak, 1);
  assert.equal(res.linePoints, 10);
  s = res.state;
  // ikinci temizleme
  s = { ...s, board: (() => { const b = emptyBoard(); for (let c = 0; c < 7; c++) b[5][c] = 1; return b; })() };
  res = applyMove(s, 1, 5, 7);
  assert.equal(res.state.streak, 2);
  assert.equal(res.linePoints, 15); // 10 * 1.5
  // 3 boş hamle
  let t = stateWith(emptyBoard(), ['dot', 'dot', 'dot'], { streak: 2 });
  t = applyMove(t, 0, 0, 0).state;
  assert.equal(t.streak, 2);
  t = applyMove(t, 1, 0, 1).state;
  assert.equal(t.streak, 2);
  const last = applyMove(t, 2, 0, 2);
  assert.equal(last.state.streak, 0);
});

test('tahta tamamen boşalınca bonus', () => {
  const b = emptyBoard();
  for (let c = 0; c < 7; c++) b[0][c] = 1;
  const res = applyMove(stateWith(b, ['dot', 'dot', 'dot']), 0, 0, 7);
  assert.equal(res.emptied, true);
  assert.equal(res.bonusPoints, 300);
});

console.log('Oyun bitişi ve yeni set');
test('hiçbir parça sığmazsa oyun biter', () => {
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) b[r][c] = 1;
  b[0][0] = 0;
  assert.equal(isGameOver(stateWith(b, ['h2', 'sq2', 'v3'])), true);
  assert.equal(isGameOver(stateWith(b, ['h2', 'dot', 'v3'])), false);
});

test('3 parça da kullanılınca yeni set gelir', () => {
  let s = stateWith(emptyBoard(), ['dot', 'dot', 'dot']);
  s = applyMove(s, 0, 0, 0).state;
  s = applyMove(s, 1, 0, 1).state;
  const r = applyMove(s, 2, 0, 2);
  assert.equal(r.newTray, true);
  assert.equal(r.state.tray.filter(Boolean).length, 3);
  assert.equal(r.state.trays, 2);
});

console.log('Günlük meydan okuma');
test('aynı tohum aynı tahta ve set; temiz başlangıç', () => {
  const a = createGame('daily', 20261012);
  const b = createGame('daily', 20261012);
  assert.deepEqual(a.board, b.board);
  assert.deepEqual(a.tray, b.tray);
  const masks = boardToMasks(a.board);
  assert.ok(masks.every((m) => m !== 0xff));
  const other = createGame('daily', 20261013);
  assert.notDeepEqual(a.board, other.board);
});

// Herkes aynı gün aynı başlangıcı görmeli: üretici değişirse bu test uyarır
test('bilinen bir günün başlangıcı değişmez', () => {
  const game = createGame('daily', 20261103);
  assert.equal(game.board.flat().join(''), '0000000000000000000554440000504000005000000000400000004400000040');
  assert.equal(game.tray.map((piece) => piece?.shapeId).join(','), 'h5,h3,l2c');
});

console.log('Parça üretimi simülasyonu');
test('rastgele oyuncu botuyla 300 oyun: çökme yok, set kalitesi ölçümü', () => {
  let games = 0;
  let totalMoves = 0;
  let trays = 0;
  let maxMs = 0;
  for (let g = 0; g < 300; g++) {
    let s = createGame('classic', 1000 + g);
    let guard = 0;
    while (!s.over && guard++ < 1500) {
      // Bot: bir parça ve geçerli yer seç (patlatan hamleye öncelik)
      const options: { slot: number; r: number; c: number; lines: number }[] = [];
      s.tray.forEach((p, slot) => {
        if (!p) return;
        const sh = getShape(p.shapeId);
        for (let r = 0; r <= SIZE - sh.h; r++)
          for (let c = 0; c <= SIZE - sh.w; c++)
            if (canPlace(s.board, sh, r, c)) options.push({ slot, r, c, lines: 0 });
      });
      if (options.length === 0) break;
      let best = options[Math.floor(Math.random() * options.length)];
      let bestLines = -1;
      for (const o of options.slice(0, 400)) {
        const l = applyMove(s, o.slot, o.r, o.c).lines;
        if (l > bestLines) {
          bestLines = l;
          best = o;
        }
      }
      const before = Date.now();
      const res = applyMove(s, best.slot, best.r, best.c);
      maxMs = Math.max(maxMs, Date.now() - before);
      assert.ok(res.ok);
      if (res.newTray) {
        trays++;
      }
      s = res.state;
      totalMoves++;
    }
    games++;
  }
  console.log(`      oyun=${games} ortalama hamle=${(totalMoves / games).toFixed(1)} yeni set=${trays} en yavaş hamle=${maxMs}ms`);
  assert.ok(totalMoves / games > 15, 'oyunlar çok erken bitiyor');
  assert.ok(maxMs < 500, 'parça üretimi çok yavaş');
});

test('generateTray boş tahtada her zaman oynanabilir 3 parça verir', () => {
  for (let i = 0; i < 200; i++) {
    const tray = generateTray(emptyBoard(), i, 0);
    assert.equal(tray.length, 3);
    const s = stateWith(emptyBoard(), tray.map((p) => p.shapeId));
    assert.equal(isGameOver(s), false);
  }
});

console.log(`\n${passed} test geçti`);
