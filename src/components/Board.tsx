import React, { memo, useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { SIZE, Board as BoardData } from '../game/engine';
import { BOARD_PADDING, CELL_GAP, colors } from '../theme';
import { Block } from './Block';

export type Ghost = {
  cells: [number, number][];
  color: number;
  rows: number[];
  cols: number[];
};

/** Patlayan bir hücrenin küçülüp kaybolma animasyonu */
export type BurstEffect = { key: string; r: number; c: number; color: number; delay: number };
/** Yeni konan hücrelerde kısa beyaz parlama */
export type FlashEffect = { key: string; r: number; c: number };

export function boardOuterSize(cell: number): number {
  return SIZE * cell + (SIZE - 1) * CELL_GAP + BOARD_PADDING * 2;
}

type Props = {
  board: BoardData;
  cell: number;
  ghost: Ghost | null;
  effects: BurstEffect[];
  flashes: FlashEffect[];
};

const EmptyCells = memo(function EmptyCells({ cell }: { cell: number }) {
  const pitch = cell + CELL_GAP;
  const items: React.ReactElement[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      items.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: BOARD_PADDING + c * pitch,
            top: BOARD_PADDING + r * pitch,
            width: cell,
            height: cell,
            borderRadius: Math.max(3, cell * 0.2),
            backgroundColor: colors.cell,
            borderWidth: 1,
            borderColor: colors.cellBorder,
          }}
        />,
      );
    }
  }
  return <>{items}</>;
});

function Burst({ effect, cell }: { effect: BurstEffect; cell: number }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 420,
      delay: effect.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [p, effect.delay]);
  const pitch = cell + CELL_GAP;
  const scale = p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.18, 0] });
  const opacity = p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const flash = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: BOARD_PADDING + effect.c * pitch,
        top: BOARD_PADDING + effect.r * pitch,
        width: cell,
        height: cell,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Block size={cell} color={effect.color} />
      <Animated.View
        style={{
          ...StyleSheet.absoluteFill,
          borderRadius: Math.max(3, cell * 0.22),
          backgroundColor: '#fff',
          opacity: flash,
        }}
      />
    </Animated.View>
  );
}

function Flash({ effect, cell }: { effect: FlashEffect; cell: number }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [p]);
  const pitch = cell + CELL_GAP;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: BOARD_PADDING + effect.c * pitch,
        top: BOARD_PADDING + effect.r * pitch,
        width: cell,
        height: cell,
        borderRadius: Math.max(3, cell * 0.22),
        backgroundColor: '#fff',
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
      }}
    />
  );
}

/** 8x8 tahta: boş hücreler, bloklar, sürükleme gölgesi ve patlama efektleri. */
export const BoardView = memo(
  React.forwardRef<View, Props>(function BoardView({ board, cell, ghost, effects, flashes }, ref) {
    const pitch = cell + CELL_GAP;
    const size = boardOuterSize(cell);

    const lit = useMemo(() => {
      const set = new Set<number>();
      if (!ghost) return set;
      for (const r of ghost.rows) for (let c = 0; c < SIZE; c++) set.add(r * SIZE + c);
      for (const c of ghost.cols) for (let r = 0; r < SIZE; r++) set.add(r * SIZE + c);
      return set;
    }, [ghost]);

    const blocks: React.ReactElement[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        if (!v) continue;
        blocks.push(
          <View
            key={`b${r}-${c}`}
            style={{ position: 'absolute', left: BOARD_PADDING + c * pitch, top: BOARD_PADDING + r * pitch }}
          >
            <Block size={cell} color={v} />
          </View>,
        );
      }
    }

    const glow: React.ReactElement[] = [];
    lit.forEach((key) => {
      const r = Math.floor(key / SIZE);
      const c = key % SIZE;
      glow.push(
        <View
          key={`g${key}`}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: BOARD_PADDING + c * pitch,
            top: BOARD_PADDING + r * pitch,
            width: cell,
            height: cell,
            borderRadius: Math.max(3, cell * 0.22),
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />,
      );
    });

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: size,
          height: size,
          borderRadius: 18,
          backgroundColor: colors.boardBg,
          borderWidth: 1,
          borderColor: colors.panelBorder,
        }}
      >
        <EmptyCells cell={cell} />
        {blocks}
        {ghost &&
          ghost.cells.map(([r, c]) => (
            <View
              key={`gh${r}-${c}`}
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                left: BOARD_PADDING + c * pitch,
                top: BOARD_PADDING + r * pitch,
              }}
            >
              <Block size={cell} color={ghost.color} opacity={0.55} />
            </View>
          ))}
        {glow}
        {flashes.map((f) => (
          <Flash key={f.key} effect={f} cell={cell} />
        ))}
        {effects.map((e) => (
          <Burst key={e.key} effect={e} cell={cell} />
        ))}
      </View>
    );
  }),
);
