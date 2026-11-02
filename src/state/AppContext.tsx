// Uygulama genel durumu: ayarlar ve en yüksek skorlar.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { dateSeed } from '../game/rng';
import { applySettings, initFeedback, setAppActive } from '../feedback';
import {
  DEFAULT_SETTINGS,
  Settings,
  loadBest,
  loadDaily,
  loadSettings,
  saveBest,
  saveDaily,
  saveSettings,
} from './storage';
import type { Mode } from '../game/engine';

type AppValue = {
  ready: boolean;
  settings: Settings;
  setSetting: (key: keyof Settings, value: boolean) => void;
  bestClassic: number;
  bestDaily: number;
  /** Skoru kaydeder; yeni rekor ise true döner. */
  submitScore: (mode: Mode, score: number) => boolean;
};

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [bestClassic, setBestClassic] = useState(0);
  const [bestDaily, setBestDaily] = useState(0);
  // submitScore'un en güncel değerleri okuması için
  const bestRef = useRef({ classic: 0, daily: 0, dailyDate: dateSeed() });

  useEffect(() => {
    (async () => {
      const [s, b, d] = await Promise.all([loadSettings(), loadBest(), loadDaily()]);
      setSettings(s);
      applySettings(s);
      setBestClassic(b.classic);
      const today = dateSeed();
      const dailyBest = d.date === today ? d.best : 0;
      setBestDaily(dailyBest);
      bestRef.current = { classic: b.classic, daily: dailyBest, dailyDate: today };
      await initFeedback();
      applySettings(s);
      setReady(true);
    })();
  }, []);

  // Uygulama arka plana geçince müzik dursun
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const setSetting = useCallback((key: keyof Settings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      applySettings(next);
      void saveSettings(next);
      return next;
    });
  }, []);

  const submitScore = useCallback((mode: Mode, score: number): boolean => {
    if (mode === 'classic') {
      if (score > bestRef.current.classic) {
        const isNew = bestRef.current.classic > 0 || score > 0;
        bestRef.current.classic = score;
        setBestClassic(score);
        void saveBest({ classic: score });
        return isNew;
      }
      return false;
    }
    const today = dateSeed();
    if (bestRef.current.dailyDate !== today) {
      bestRef.current.dailyDate = today;
      bestRef.current.daily = 0;
    }
    if (score > bestRef.current.daily) {
      bestRef.current.daily = score;
      setBestDaily(score);
      void saveDaily({ date: today, best: score });
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({ ready, settings, setSetting, bestClassic, bestDaily, submitScore }),
    [ready, settings, setSetting, bestClassic, bestDaily, submitScore],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider eksik');
  return v;
}
