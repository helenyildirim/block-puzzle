import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BLOCK_COLORS, CELL_GAP } from '../theme';
import { ShapeDef } from '../game/pieces';

type BlockProps = {
  size: number;
  color: number;
  opacity?: number;
};

/** Tek bir parlak (glossy) blok. */
export const Block = memo(function Block({ size, color, opacity = 1 }: BlockProps) {
  const [light, dark] = BLOCK_COLORS[color] ?? BLOCK_COLORS[1];
  const r = Math.max(3, size * 0.22);
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', opacity }}>
      <LinearGradient colors={[light, dark]} style={StyleSheet.absoluteFill} />
      {/* üst parlama */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.07,
          left: size * 0.1,
          right: size * 0.1,
          height: size * 0.3,
          borderRadius: r * 0.8,
          backgroundColor: 'rgba(255,255,255,0.3)',
        }}
      />
      {/* alt gölge şeridi */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: size * 0.16,
          backgroundColor: 'rgba(0,0,0,0.18)',
        }}
      />
      {/* ince kenar */}
      <View
        style={{
          ...StyleSheet.absoluteFill,
          pointerEvents: 'none',
          borderRadius: r,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.22)',
        }}
      />
    </View>
  );
});

type PieceViewProps = {
  shape: ShapeDef;
  cell: number;
  gap?: number;
  opacity?: number;
};

/** Bir parçayı (birkaç blok) çizer. */
export const PieceView = memo(function PieceView({ shape, cell, gap = CELL_GAP, opacity = 1 }: PieceViewProps) {
  const pitch = cell + gap;
  return (
    <View style={{ width: shape.w * pitch - gap, height: shape.h * pitch - gap }}>
      {shape.cells.map(([r, c]) => (
        <View key={`${r}-${c}`} style={{ position: 'absolute', left: c * pitch, top: r * pitch }}>
          <Block size={cell} color={shape.color} opacity={opacity} />
        </View>
      ))}
    </View>
  );
});
