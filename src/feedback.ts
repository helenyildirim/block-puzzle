// Ses efektleri, müzik ve titreşim. Ayarlar (ses/müzik/titreşim) burada uygulanır.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { Settings } from './state/storage';

type SfxName = 'place' | 'invalid' | 'clear1' | 'clear2' | 'clear3' | 'gameover' | 'record' | 'tap';

const SOURCES: Record<SfxName | 'music', number> = {
  place: require('../assets/sounds/place.wav'),
  invalid: require('../assets/sounds/invalid.wav'),
  clear1: require('../assets/sounds/clear1.wav'),
  clear2: require('../assets/sounds/clear2.wav'),
  clear3: require('../assets/sounds/clear3.wav'),
  gameover: require('../assets/sounds/gameover.wav'),
  record: require('../assets/sounds/record.wav'),
  tap: require('../assets/sounds/tap.wav'),
  music: require('../assets/sounds/music.wav'),
};

let settings: Settings = { sound: true, music: true, vibration: true };
const players: Partial<Record<SfxName | 'music', AudioPlayer>> = {};
let initialized = false;
let musicWanted = true;
let appActive = true;

function getPlayer(name: SfxName | 'music'): AudioPlayer | null {
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      if (name === 'music') {
        p.loop = true;
        p.volume = 0.35;
      } else {
        p.volume = name === 'tap' ? 0.5 : 0.8;
      }
      players[name] = p;
    }
    return p;
  } catch {
    return null;
  }
}

export async function initFeedback(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  } catch {
    // ses modu ayarlanamazsa varsayılanla devam
  }
  (Object.keys(SOURCES) as (SfxName | 'music')[]).forEach((n) => getPlayer(n));
}

export function applySettings(next: Settings): void {
  settings = next;
  syncMusic();
}

function syncMusic(): void {
  const p = getPlayer('music');
  if (!p) return;
  try {
    if (settings.music && musicWanted && appActive) p.play();
    else p.pause();
  } catch {
    // yoksay
  }
}

/** Uygulama arka plana geçince müzik durur, geri gelince devam eder. */
export function setAppActive(active: boolean): void {
  appActive = active;
  syncMusic();
}

/** Müzik ekran durumuna göre istenir (oyun/menü açıkken çalsın). */
export function setMusicWanted(wanted: boolean): void {
  musicWanted = wanted;
  syncMusic();
}

export function sfx(name: SfxName): void {
  if (!settings.sound) return;
  const p = getPlayer(name);
  if (!p) return;
  try {
    Promise.resolve(p.seekTo(0)).catch(() => {});
    p.play();
  } catch {
    // yoksay
  }
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select';

export function haptic(kind: HapticKind): void {
  if (!settings.vibration) return;
  try {
    switch (kind) {
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'select':
        void Haptics.selectionAsync();
        break;
    }
  } catch {
    // yoksay
  }
}
