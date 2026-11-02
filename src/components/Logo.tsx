// Logo (mavi, sarı, pembe bloklardan küme) ve Game Over ekranındaki kutlama çizimi.

import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Block } from './Block';

type LogoCell = { x: number; y: number; rot: number; color: number };

// Birim = blok boyu. Sıra önemli: sonradan gelen üstte çizilir.
const LOGO: LogoCell[] = [
  { x: 0.04, y: 0.73, rot: -8, color: 1 },
  { x: 0.22, y: 1.75, rot: -5, color: 1 },
  { x: 1.27, y: 1.6, rot: -5, color: 1 },
  { x: 2.82, y: 1.67, rot: -2, color: 3 },
  { x: 3.85, y: 1.56, rot: -2, color: 3 },
  { x: 2.9, y: 2.73, rot: -2, color: 3 },
  { x: 3.93, y: 2.6, rot: -2, color: 3 },
  { x: 1.58, y: 0.04, rot: -4, color: 2 },
  { x: 2.64, y: 0.13, rot: 3, color: 2 },
  { x: 2.53, y: 1.16, rot: -6, color: 2 },
];

const LOGO_UNITS_W = 4.95;
const LOGO_UNITS_H = 3.75;

export function logoHeight(width: number): number {
  return (width / LOGO_UNITS_W) * LOGO_UNITS_H;
}

export function Logo({ width }: { width: number }) {
  const unit = width / LOGO_UNITS_W;
  const size = unit * 0.97;
  return (
    <View style={{ width, height: logoHeight(width) }}>
      {LOGO.map((c, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: c.x * unit, top: c.y * unit, transform: [{ rotate: `${c.rot}deg` }] }}
        >
          <Block size={size} color={c.color} />
        </View>
      ))}
    </View>
  );
}

// --- Game Over kutlama çizimi (340 x 170 birimlik tasarım alanı) ---

const CW = 340;
const CH = 170;
const B = 46; // blok boyu
const CELEB: LogoCell[] = [
  // sarı 2x3 yığın
  { x: 102, y: 6, rot: 0, color: 2 },
  { x: 150, y: 10, rot: 0, color: 2 },
  { x: 102, y: 54, rot: 0, color: 2 },
  { x: 150, y: 58, rot: 0, color: 2 },
  { x: 102, y: 104, rot: 0, color: 2 },
  { x: 150, y: 108, rot: 0, color: 2 },
  // mavi
  { x: 18, y: 48, rot: -10, color: 1 },
  { x: 25, y: 96, rot: -6, color: 1 },
  { x: 75, y: 88, rot: 8, color: 1 },
  // mor 2x2
  { x: 208, y: 60, rot: 6, color: 5 },
  { x: 256, y: 65, rot: 8, color: 5 },
  { x: 200, y: 108, rot: 6, color: 5 },
  { x: 248, y: 114, rot: 8, color: 5 },
];

export function Celebration({ width }: { width: number }) {
  const s = width / CW;
  return (
    <View style={{ width, height: CH * s }}>
      {/* zemin gölgesi */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 152 * s,
          width: CW * s,
          height: 16 * s,
          borderRadius: 100,
          backgroundColor: 'rgba(0,0,0,0.28)',
        }}
      />
      {CELEB.map((c, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: c.x * s, top: c.y * s, transform: [{ rotate: `${c.rot}deg` }] }}
        >
          <Block size={B * s} color={c.color} />
        </View>
      ))}
      {/* konfeti */}
      <MaterialCommunityIcons name="star" size={22 * s} color="#FFC83D" style={{ position: 'absolute', left: -6 * s, top: 6 * s }} />
      <MaterialCommunityIcons name="star" size={16 * s} color="#4DA3FF" style={{ position: 'absolute', left: 318 * s, top: 14 * s }} />
      <View style={{ position: 'absolute', left: 62 * s, top: -6 * s, width: 7 * s, height: 20 * s, borderRadius: 4, backgroundColor: '#FF6B8A', transform: [{ rotate: '-24deg' }] }} />
      <View style={{ position: 'absolute', left: 276 * s, top: -4 * s, width: 7 * s, height: 20 * s, borderRadius: 4, backgroundColor: '#3ED6A0', transform: [{ rotate: '28deg' }] }} />
      <View style={{ position: 'absolute', left: -14 * s, top: 98 * s, width: 9 * s, height: 9 * s, borderRadius: 5, backgroundColor: '#A56BFF' }} />
      <View style={{ position: 'absolute', left: 332 * s, top: 102 * s, width: 9 * s, height: 9 * s, borderRadius: 5, backgroundColor: '#FF6B8A' }} />
    </View>
  );
}
