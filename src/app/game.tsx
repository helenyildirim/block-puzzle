// Oyun ekranı: skor, tahta, parça tepsisi; Pause ve Game Over katmanları.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background, Crown, IconButton, formatScore } from '../components/ui';
import { PlayArea, trayHeight } from '../components/PlayArea';
import { BurstEffect, FlashEffect, boardOuterSize } from '../components/Board';
import { GameOverScreen, PausePanel, PopupData, ScorePopup, useCountUp } from '../components/GameOverlays';
import { GameState, Mode, applyMove, createGame, trayFits } from '../game/engine';
import { dateSeed, randomSeed } from '../game/rng';
import { clearGame, loadGame, saveGame } from '../state/storage';
import { useApp } from '../state/AppContext';
import { haptic, sfx } from '../feedback';
import { BOARD_PADDING, CELL_GAP, colors, fonts } from '../theme';

type OverState = { score: number; best: number; isNew: boolean };

const LINE_LABELS = ['', '', 'DOUBLE', 'TRIPLE', 'AMAZING', 'INCREDIBLE'];

function freshGame(mode: Mode): GameState {
  return createGame(mode, mode === 'daily' ? dateSeed() : randomSeed());
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === 'daily' ? 'daily' : 'classic';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { bestClassic, bestDaily, submitScore } = useApp();
  const best = mode === 'daily' ? bestDaily : bestClassic;

  const [state, setState] = useState<GameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState<OverState | null>(null);
  const [effects, setEffects] = useState<BurstEffect[]>([]);
  const [flashes, setFlashes] = useState<FlashEffect[]>([]);
  const [popup, setPopup] = useState<PopupData | null>(null);

  const stateRef = useRef<GameState | null>(null);
  const bestRef = useRef(best);
  const overRef = useRef<OverState | null>(null);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    bestRef.current = best;
    overRef.current = over;
  });

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Yarım kalan oyunu yükle, yoksa yenisini başlat
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadGame(mode);
      if (!alive) return;
      const g = saved ?? freshGame(mode);
      stateRef.current = g;
      setState(g);
      if (!saved) void saveGame(g);
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  const startNew = useCallback(() => {
    // Yarıda bırakılan oyunun skoru da rekor sayılır
    const previous = stateRef.current;
    if (previous && !previous.over) submitScore(mode, previous.score);
    const g = freshGame(mode);
    stateRef.current = g;
    setState(g);
    void saveGame(g);
    setOver(null);
    setPaused(false);
    setEffects([]);
    setFlashes([]);
    setPopup(null);
  }, [mode, submitScore]);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [router]);

  const handlePlace = useCallback(
    (slot: number, r: number, c: number) => {
      const cur = stateRef.current;
      if (!cur || cur.over) return;
      const res = applyMove(cur, slot, r, c);
      if (!res.ok) {
        sfx('invalid');
        return;
      }
      stateRef.current = res.state;
      setState(res.state);

      const id = ++seq.current;
      sfx('place');
      haptic('light');

      // Yeni konan hücrelerde kısa parlama
      const flashKeys = res.placedCells.map(([pr, pc]) => ({ key: `f${id}-${pr}-${pc}`, r: pr, c: pc }));
      setFlashes((prev) => [...prev, ...flashKeys]);
      later(() => setFlashes((prev) => prev.filter((f) => !flashKeys.some((k) => k.key === f.key))), 400);

      if (res.lines > 0) {
        // Patlama: yerleşen parçaya yakın hücreler önce kaybolur
        const center = res.placedCells.reduce((acc, [pr, pc]) => ({ r: acc.r + pr, c: acc.c + pc }), { r: 0, c: 0 });
        center.r /= res.placedCells.length;
        center.c /= res.placedCells.length;
        const bursts: BurstEffect[] = res.clearedCells.map((cell) => ({
          key: `x${id}-${cell.r}-${cell.c}`,
          r: cell.r,
          c: cell.c,
          color: cell.color,
          delay: Math.min(260, Math.hypot(cell.r - center.r, cell.c - center.c) * 38),
        }));
        setEffects((prev) => [...prev, ...bursts]);
        later(() => setEffects((prev) => prev.filter((e) => !bursts.some((b) => b.key === e.key))), 1000);

        sfx(res.lines >= 3 ? 'clear3' : res.lines === 2 ? 'clear2' : 'clear1');
        haptic(res.lines >= 3 ? 'heavy' : 'success');

        const label = res.emptied ? 'PERFECT!' : LINE_LABELS[Math.min(res.lines, 5)];
        setPopup({
          key: `p${id}`,
          main: `+${res.gained}`,
          label: label || undefined,
          label2: res.state.streak >= 2 ? `COMBO ×${res.state.streak}` : undefined,
        });
        later(() => setPopup((p) => (p && p.key === `p${id}` ? null : p)), 1300);
      }

      if (res.state.over) {
        void clearGame(mode);
        const finalScore = res.state.score;
        const previousBest = bestRef.current;
        const isNew = submitScore(mode, finalScore);
        later(() => {
          sfx('gameover');
          haptic('error');
          setOver({ score: finalScore, best: isNew ? finalScore : previousBest, isNew });
          if (isNew) later(() => sfx('record'), 900);
        }, 900);
      } else {
        void saveGame(res.state);
      }
    },
    [later, mode, submitScore],
  );

  // Android geri tuşu: oyunda duraklat/devam, oyun bitince ana menü
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overRef.current) goHome();
      else setPaused((p) => !p);
      return true;
    });
    return () => sub.remove();
  }, [goHome]);

  // Uygulama arka plana geçerse oyunu duraklat
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && !overRef.current) setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // Tahta boyutu: önce genişliğe, sonra ekran yüksekliğine göre sığdır
  const cell = useMemo(() => {
    const maxBoardW = Math.min(width - 40, 440);
    let c = Math.floor((maxBoardW - BOARD_PADDING * 2 - CELL_GAP * 7 - 2) / 8);
    const availH = height - insets.top - insets.bottom - (8 + 44 + 92 + 34 + 10 + 20);
    while (c > 22 && boardOuterSize(c) + 18 + trayHeight(c) > availH) c--;
    return c;
  }, [width, height, insets.top, insets.bottom]);

  const fits = useMemo(() => (state ? trayFits(state) : [true, true, true]), [state]);
  const score = useCountUp(state?.score ?? 0);

  if (!state) return <Background>{null}</Background>;

  const shownBest = Math.max(best, state.score);
  const enabled = !paused && !over && !state.over;

  return (
    <Background glowTop={height * 0.3}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.topBar}>
          <View style={styles.bestRow}>
            <Crown size={20} />
            <Text style={styles.bestText}>{formatScore(shownBest)}</Text>
          </View>
          <IconButton icon="cog-outline" label="Pause" onPress={() => setPaused(true)} />
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>{mode === 'daily' ? 'DAILY SCORE' : 'SCORE'}</Text>
          <Text style={styles.scoreValue}>{formatScore(score)}</Text>
        </View>

        <View style={styles.playWrap}>
          <PlayArea
            state={state}
            cell={cell}
            fits={fits}
            enabled={enabled}
            effects={effects}
            flashes={flashes}
            popups={popup ? <ScorePopup key={popup.key} data={popup} /> : null}
            onPlace={handlePlace}
          />
        </View>

        <Text style={styles.hint}>Drag blocks. Fill a row or column.</Text>
      </View>

      {paused && !over && (
        <PausePanel
          onResume={() => setPaused(false)}
          onRestart={startNew}
          onHome={goHome}
        />
      )}
      {over && <GameOverScreen score={over.score} best={over.best} isNew={over.isNew} onAgain={startNew} onHome={goHome} />}
    </Background>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, userSelect: 'none' },
  topBar: {
    height: 44,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestRow: { flexDirection: 'row', alignItems: 'center' },
  bestText: { marginLeft: 8, color: colors.gold, fontFamily: fonts.extra, fontSize: 17 },
  scoreBlock: { height: 92, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  scoreLabel: { color: '#A9BFE6', fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6 },
  scoreValue: { color: '#fff', fontFamily: fonts.black, fontSize: 56, lineHeight: 64 },
  playWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    height: 34,
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.semi,
    fontSize: 13,
  },
});
