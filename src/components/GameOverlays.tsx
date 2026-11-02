// Oyun ekranının üstüne binen parçalar: Pause paneli, Game Over ekranı, puan/combo yazısı.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background, Crown, GlossyButton, Overlay, Panel, SettingsList, formatScore } from './ui';
import { Celebration } from './Logo';
import { colors, fonts, radius } from '../theme';

/** Sayıyı eski değerinden yeni değerine akıcı şekilde sayarak yükseltir. */
export function useCountUp(target: number, opts: { duration?: number; initial?: number; delay?: number } = {}): number {
  const { duration = 450, initial = target, delay = 0 } = opts;
  const [value, setValue] = useState(initial);
  const from = useRef(initial);
  useEffect(() => {
    if (target <= from.current) {
      from.current = target;
      setValue(target);
      return;
    }
    const a = from.current;
    let raf = 0;
    let start = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const v = Math.round(a + (target - a) * (1 - Math.pow(1 - t, 3)));
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      start = Date.now();
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

// ---------------------------------------------------------------------------
// Duraklatma paneli

export function PausePanel({ onResume, onRestart, onHome }: { onResume: () => void; onRestart: () => void; onHome: () => void }) {
  return (
    <Overlay>
      <Panel>
        <Text style={styles.panelTitle}>PAUSED</Text>
        <Text style={styles.panelSub}>Take a breath. Your board can wait.</Text>
        <View style={{ height: 14 }} />
        <SettingsList />
        <View style={styles.divider} />
        <GlossyButton label="RESUME" icon="play" height={56} onPress={onResume} />
        <View style={{ height: 10 }} />
        <GlossyButton label="RESTART" icon="restart" variant="secondary" height={50} onPress={onRestart} />
        <View style={{ height: 10 }} />
        <GlossyButton label="HOME" icon="home-outline" variant="dark" height={50} onPress={onHome} />
      </Panel>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// Oyun bitti ekranı

export function GameOverScreen({
  score,
  best,
  isNew,
  onAgain,
  onHome,
}: {
  score: number;
  best: number;
  isNew: boolean;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fade = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);
  const shown = useCountUp(score, { initial: 0, duration: 900, delay: 250 });
  const w = Math.min(width * 0.84, 340);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Background glowTop={260}>
        <View style={[styles.goMain, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.goTitle}>GAME OVER</Text>
          {isNew ? (
            <View style={styles.newBest}>
              <Crown size={16} />
              <Text style={styles.newBestText}>NEW BEST</Text>
            </View>
          ) : (
            <View style={{ height: 34 }} />
          )}

          <View style={[styles.scoreCard, { width: w }]}>
            <Text style={styles.cardLabel}>FINAL SCORE</Text>
            <Text style={styles.cardScore}>{formatScore(shown)}</Text>
            <View style={styles.bestRow}>
              <Crown size={16} />
              <Text style={styles.bestText}>BEST  {formatScore(best)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 34 }}>
            <Celebration width={Math.min(w * 0.85, 290)} />
          </View>
          <Text style={styles.message}>{isNew ? 'Brilliant run. You raised the bar!' : 'So close! Your next run could be the one.'}</Text>

          <View style={{ width: w, marginTop: 26 }}>
            <GlossyButton label="PLAY AGAIN" icon="restart" height={60} onPress={onAgain} />
            <View style={{ height: 12 }} />
            <GlossyButton label="HOME" icon="home-outline" variant="secondary" height={54} onPress={onHome} />
          </View>
        </View>
      </Background>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Tahtanın ortasında yükselip kaybolan puan / combo yazısı

export type PopupData = { key: string; main: string; label?: string; label2?: string };

export function ScorePopup({ data }: { data: PopupData }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 1150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [p]);
  return (
    <Animated.View
      style={{
        alignItems: 'center',
        opacity: p.interpolate({ inputRange: [0, 0.1, 0.72, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [12, -56] }) },
          { scale: p.interpolate({ inputRange: [0, 0.14, 0.32, 1], outputRange: [0.6, 1.2, 1, 1] }) },
        ],
      }}
    >
      {data.label ? <Text style={styles.popLabel}>{data.label}</Text> : null}
      <Text style={styles.popMain}>{data.main}</Text>
      {data.label2 ? <Text style={styles.popLabel2}>{data.label2}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panelTitle: { color: '#fff', fontFamily: fonts.black, fontSize: 32, letterSpacing: 0.6 },
  panelSub: { marginTop: 4, color: '#A9BFE6', fontFamily: fonts.semi, fontSize: 13 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(150,195,255,0.18)', marginVertical: 14 },

  goMain: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  goTitle: { color: '#fff', fontFamily: fonts.black, fontSize: 38, letterSpacing: 0.8 },
  newBest: {
    marginTop: 12,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,200,61,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.38)',
  },
  newBestText: { marginLeft: 6, color: colors.gold, fontFamily: fonts.extra, fontSize: 12, letterSpacing: 1.2 },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: radius.card + 6,
    backgroundColor: 'rgba(30,60,120,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(120,170,255,0.18)',
  },
  cardLabel: { color: '#A9BFE6', fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4 },
  cardScore: { color: '#fff', fontFamily: fonts.black, fontSize: 60, lineHeight: 70, marginTop: 2 },
  bestRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bestText: { marginLeft: 6, color: colors.gold, fontFamily: fonts.extra, fontSize: 14, letterSpacing: 0.8 },
  message: { marginTop: 16, color: '#B9CCEE', fontFamily: fonts.semi, fontSize: 14, textAlign: 'center' },

  popMain: {
    color: '#fff',
    fontFamily: fonts.black,
    fontSize: 44,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  popLabel: {
    color: colors.gold,
    fontFamily: fonts.black,
    fontSize: 22,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  popLabel2: {
    color: '#9FE0FF',
    fontFamily: fonts.extra,
    fontSize: 18,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
