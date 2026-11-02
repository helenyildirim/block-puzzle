// Telefonda kalıcı kayıt (AsyncStorage). Hata olursa sessizce varsayılana döner.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState, Mode } from '../game/engine';
import { getShape } from '../game/pieces';
import { dateSeed } from '../game/rng';

const KEYS = {
  settings: 'bp.settings.v1',
  best: 'bp.best.v1',
  daily: 'bp.daily.v1',
  game: 'bp.game.v1',
  gameDaily: 'bp.game.daily.v1',
};

export type Settings = { sound: boolean; music: boolean; vibration: boolean };
export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, vibration: true };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...(typeof fallback === 'object' ? fallback : {}), ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // kayıt başarısız olursa oyun devam etsin
  }
}

export const loadSettings = () => readJson<Settings>(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => writeJson(KEYS.settings, s);

export type BestScores = { classic: number };
export const loadBest = () => readJson<BestScores>(KEYS.best, { classic: 0 });
export const saveBest = (b: BestScores) => writeJson(KEYS.best, b);

/** Günlük meydan okuma: tarih (YYYYMMDD) -> o günün en yüksek skoru */
export type DailyScores = { date: number; best: number };
export const loadDaily = () => readJson<DailyScores>(KEYS.daily, { date: 0, best: 0 });
export const saveDaily = (d: DailyScores) => writeJson(KEYS.daily, d);

const gameKey = (mode: Mode) => (mode === 'daily' ? KEYS.gameDaily : KEYS.game);

function isValidGame(g: unknown, mode: Mode): g is GameState {
  if (!g || typeof g !== 'object') return false;
  const s = g as GameState;
  if (s.mode !== mode || s.over) return false;
  if (!Array.isArray(s.board) || s.board.length !== 8) return false;
  if (!s.board.every((row) => Array.isArray(row) && row.length === 8)) return false;
  if (!Array.isArray(s.tray) || s.tray.length !== 3) return false;
  try {
    for (const p of s.tray) if (p) getShape(p.shapeId);
  } catch {
    return false;
  }
  // Günlük oyun sadece aynı güne aittir
  if (mode === 'daily' && s.seed !== dateSeed()) return false;
  return true;
}

/** Yarım kalan oyunu yükler (yoksa, bozuksa ya da bittiyse null). */
export async function loadGame(mode: Mode): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(gameKey(mode));
    if (!raw) return null;
    const g = JSON.parse(raw);
    return isValidGame(g, mode) ? g : null;
  } catch {
    return null;
  }
}

export const saveGame = (g: GameState) => writeJson(gameKey(g.mode), g);

export async function clearGame(mode: Mode): Promise<void> {
  try {
    await AsyncStorage.removeItem(gameKey(mode));
  } catch {
    // yoksay
  }
}
