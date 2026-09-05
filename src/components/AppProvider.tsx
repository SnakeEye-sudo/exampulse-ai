'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { UserState, Lang, IndexRecord, Manifest } from '@/lib/types';
import { loadState, saveState, emptyState } from '@/lib/store';
import { getIndex, getManifest } from '@/lib/data';
import { ui as uiText, type UiKey } from '@/lib/i18n';

type Theme = 'light' | 'dark' | 'system';

interface Ctx {
  state: UserState;
  /** Apply a pure transform to user state; persists synchronously. */
  update: (fn: (s: UserState) => UserState) => void;
  reset: () => void;
  replace: (s: UserState) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  T: (k: UiKey) => string;
  index: IndexRecord[];
  manifest: Manifest | null;
  dataReady: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  hydrated: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}

const THEME_KEY = 'exampulse.theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Start from the empty state so server and first client render agree; the
  // real state arrives in the effect below, after which `hydrated` flips.
  const [state, setState] = useState<UserState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [index, setIndex] = useState<IndexRecord[]>([]);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    setState(loadState());
    const savedTheme = (localStorage.getItem(THEME_KEY) as Theme) || 'system';
    setThemeState(savedTheme);
    applyTheme(savedTheme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [idx, man] = await Promise.all([getIndex(), getManifest()]);
      if (!alive) return;
      setIndex(idx);
      setManifest(man);
      setDataReady(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const update = useCallback((fn: (s: UserState) => UserState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const replace = useCallback((s: UserState) => { saveState(s); setState(s); }, []);
  const reset = useCallback(() => { const e = emptyState(); saveState(e); setState(e); }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  }, []);

  const lang = state.profile.lang;
  const setLang = useCallback(
    (l: Lang) => update((s) => ({ ...s, profile: { ...s.profile, lang: l } })),
    [update]
  );
  const T = useCallback((k: UiKey) => uiText(k, lang), [lang]);

  const value = useMemo<Ctx>(
    () => ({ state, update, reset, replace, lang, setLang, T, index, manifest, dataReady, theme, setTheme, hydrated }),
    [state, update, reset, replace, lang, setLang, T, index, manifest, dataReady, theme, setTheme, hydrated]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
