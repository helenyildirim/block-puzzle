// Açılış ekranı (Splash): logo, slogan ve yükleniyor çubuğu; sonra Home'a geçer.

import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '../components/ui';
import { Logo, logoHeight } from '../components/Logo';
import { useApp } from '../state/AppContext';
import { colors, fonts } from '../theme';

const BAR_W = 190;

export default function SplashScreen() {
  const router = useRouter();
  const { ready } = useApp();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const progress = useAnimatedValue(0);
  const intro = useAnimatedValue(0);
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    Animated.timing(progress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setAnimDone(true);
    });
  }, [intro, progress]);

  useEffect(() => {
    if (animDone && ready) router.replace('/home');
  }, [animDone, ready, router]);

  const logoW = Math.min(width * 0.46, 190);
  const centerY = height * 0.42;

  return (
    <Background glowTop={centerY}>
      <View style={[styles.center, { paddingBottom: insets.bottom }]}>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: intro,
            transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}
        >
          <Logo width={logoW} />
          <Text style={[styles.title, { marginTop: logoHeight(logoW) * 0.12 }]}>BLOCK{'\n'}PUZZLE</Text>
          <Text style={styles.tagline}>A little space. Endless possibilities.</Text>
        </Animated.View>
      </View>

      <View style={[styles.loader, { bottom: insets.bottom + 72 }]}>
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_W] }) }]}
          />
        </View>
        <Text style={styles.loading}>Loading your next move...</Text>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  title: {
    color: '#fff',
    fontFamily: fonts.black,
    fontSize: 44,
    lineHeight: 48,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 16,
    color: colors.textDim,
    fontFamily: fonts.semi,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  loader: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  track: {
    width: BAR_W,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(20,40,90,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(120,170,255,0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#6FB6FF', borderRadius: 3 },
  loading: { marginTop: 12, color: '#B9CCEE', fontFamily: fonts.semi, fontSize: 12 },
});
