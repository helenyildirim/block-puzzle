// Ortak arayüz parçaları: arka plan, butonlar, anahtar (toggle), panel, taç etiketi.

import React, { useEffect } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useAnimatedValue } from '../useAnimatedValue';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';
import { haptic, sfx } from '../feedback';
import { useApp } from '../state/AppContext';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Tasarımdaki koyu mavi degrade arka plan; istenirse logonun arkasında soluk daire (glow). */
export function Background({
  children,
  glowTop,
}: {
  children: React.ReactNode;
  /** Soluk dairenin merkezinin ekranın üstünden uzaklığı (px). Verilmezse çizilmez. */
  glowTop?: number;
}) {
  const { width } = useWindowDimensions();
  const d = Math.min(width * 1.15, 520);
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgMid, colors.bgBottom]} locations={[0, 0.45, 1]} style={styles.fill}>
      {glowTop !== undefined && (
        <>
          <View
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              left: (width - d) / 2,
              top: glowTop - d / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: 'rgba(90,150,255,0.035)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              left: (width - d * 0.6) / 2,
              top: glowTop - (d * 0.6) / 2,
              width: d * 0.6,
              height: d * 0.6,
              borderRadius: (d * 0.6) / 2,
              backgroundColor: 'rgba(90,150,255,0.04)',
            }}
          />
        </>
      )}
      {children}
    </LinearGradient>
  );
}

type GlossyButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'dark';
  height?: number;
  style?: ViewStyle;
};

export function GlossyButton({ label, onPress, icon, variant = 'primary', height = 58, style }: GlossyButtonProps) {
  const scale = useAnimatedValue(1);
  const grad: [string, string] =
    variant === 'primary'
      ? [colors.primaryTop, colors.primaryBottom]
      : variant === 'secondary'
        ? [colors.secondaryTop, colors.secondaryBottom]
        : [colors.darkTop, colors.darkBottom];
  const edge = variant === 'primary' ? colors.primaryEdge : variant === 'secondary' ? colors.secondaryEdge : '#10244A';
  const fg = variant === 'primary' ? colors.onPrimary : '#fff';
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }], width: '100%' }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          sfx('tap');
          haptic('light');
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <LinearGradient
          colors={grad}
          style={[
            styles.button,
            { height, borderBottomWidth: 4, borderBottomColor: edge },
            variant === 'primary' ? styles.primaryShadow : styles.secondaryBorder,
          ]}
        >
          {variant === 'primary' && <View style={styles.gloss} />}
          {icon ? <MaterialCommunityIcons name={icon} size={24} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/** Tasarımdaki yuvarlak köşeli kare ikon butonu (ayarlar, ses). */
export function IconButton({
  icon,
  label,
  onPress,
  size = 44,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        sfx('tap');
        haptic('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size * 0.3, opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={8}
    >
      <MaterialCommunityIcons name={icon} size={size * 0.52} color="#A9C0EA" />
    </Pressable>
  );
}

export function Toggle({ value, label, onChange }: { value: boolean; label?: string; onChange: (v: boolean) => void }) {
  const x = useAnimatedValue(value ? 1 : 0);
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        haptic('select');
        onChange(!value);
      }}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? colors.toggleOn : colors.toggleOff }]}
    >
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: value ? colors.knobOn : colors.knobOff,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }],
          },
        ]}
      />
    </Pressable>
  );
}

export function Crown({ size = 18 }: { size?: number }) {
  return <MaterialCommunityIcons name="crown" size={size} color={colors.gold} />;
}

export function formatScore(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Tam ekran koyu perde + ortada panel (Pause / Ayarlar). */
export function Overlay({ children }: { children: React.ReactNode }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [p]);
  return (
    <Animated.View style={[styles.overlay, { opacity: p }]}>
      <Animated.View
        style={{ width: '100%', alignItems: 'center', transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <LinearGradient colors={[colors.panelTop, colors.panelBottom]} style={[styles.panel, { width: Math.min(width - 48, 360) }]}>
      {children}
    </LinearGradient>
  );
}

function SettingRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={22} color="#9DB6E6" style={{ width: 34 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Toggle value={value} label={label} onChange={onChange} />
    </View>
  );
}

/** Ses / Müzik / Titreşim anahtarları (Pause ve Home ayarlarında ortak). */
export function SettingsList() {
  const { settings, setSetting } = useApp();
  return (
    <View style={{ width: '100%' }}>
      <SettingRow icon="volume-high" label="Sound" value={settings.sound} onChange={(v) => setSetting('sound', v)} />
      <SettingRow icon="music-note" label="Music" value={settings.music} onChange={(v) => setSetting('music', v)} />
      <SettingRow icon="vibrate" label="Vibration" value={settings.vibration} onChange={(v) => setSetting('vibration', v)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  button: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  primaryShadow: {
    shadowColor: '#2F7DE8',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: 'rgba(140,180,255,0.22)',
  },
  gloss: {
    position: 'absolute',
    top: 3,
    left: 10,
    right: 10,
    height: '34%',
    borderRadius: radius.button,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    fontFamily: fonts.extra,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  iconButton: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    borderRadius: radius.panel,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150,195,255,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  rowLabel: {
    flex: 1,
    color: '#fff',
    fontFamily: fonts.bold,
    fontSize: 17,
  },
});
