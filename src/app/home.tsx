// Ana menü: logo, kişisel rekor, PLAY, DAILY CHALLENGE, ayarlar ve ses düğmeleri.

import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background, Crown, GlossyButton, IconButton, Overlay, Panel, SettingsList, formatScore } from '../components/ui';
import { Logo } from '../components/Logo';
import { useApp } from '../state/AppContext';
import { colors, fonts, radius } from '../theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { bestClassic, settings, setSetting } = useApp();
  const [showSettings, setShowSettings] = useState(false);

  const soundOn = settings.sound || settings.music;
  const buttonW = Math.min(width * 0.8, 330);
  const logoW = Math.min(width * 0.32, 130);

  return (
    <Background glowTop={height * 0.27}>
      <View style={[styles.main, { paddingTop: insets.top + 24 }]}>
        <Logo width={logoW} />
        <Text style={styles.title}>BLOCK PUZZLE</Text>

        <View style={styles.bestCard}>
          <Crown size={34} />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.bestLabel}>PERSONAL BEST</Text>
            <Text style={styles.bestValue}>{formatScore(bestClassic)}</Text>
          </View>
        </View>

        <View style={{ width: buttonW, marginTop: 34 }}>
          <GlossyButton label="PLAY" icon="play" onPress={() => router.push('/game?mode=classic')} height={60} />
          <View style={{ height: 14 }} />
          <GlossyButton
            label="DAILY CHALLENGE"
            icon="calendar-check-outline"
            variant="secondary"
            height={54}
            onPress={() => router.push('/game?mode=daily')}
          />
        </View>
        <Text style={styles.sub}>A fresh puzzle, every day</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 34 }]}>
        <IconButton icon="cog-outline" onPress={() => setShowSettings(true)} />
        <View style={{ width: 14 }} />
        <IconButton
          icon={soundOn ? 'volume-high' : 'volume-off'}
          onPress={() => {
            // Sesi tek dokunuşla aç/kapat: ses efektleri ve müzik birlikte
            setSetting('sound', !soundOn);
            setSetting('music', !soundOn);
          }}
        />
      </View>

      {showSettings && (
        <Overlay>
          <Panel>
            <Text style={styles.panelTitle}>SETTINGS</Text>
            <View style={{ height: 10 }} />
            <SettingsList />
            <View style={styles.divider} />
            <GlossyButton label="CLOSE" variant="secondary" height={52} onPress={() => setShowSettings(false)} />
          </Panel>
        </Overlay>
      )}
    </Background>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  title: {
    marginTop: 22,
    color: '#fff',
    fontFamily: fonts.black,
    fontSize: 34,
    letterSpacing: 0.6,
  },
  bestCard: {
    marginTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: radius.card + 6,
    backgroundColor: 'rgba(30,60,120,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(120,170,255,0.18)',
    minWidth: 210,
  },
  bestLabel: { color: '#A9BFE6', fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2 },
  bestValue: { color: colors.gold, fontFamily: fonts.black, fontSize: 32, marginTop: 2 },
  sub: { marginTop: 18, color: colors.textDim, fontFamily: fonts.semi, fontSize: 13 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center' },
  panelTitle: { color: '#fff', fontFamily: fonts.black, fontSize: 30, letterSpacing: 0.6 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(150,195,255,0.18)', marginVertical: 14 },
});
