'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyThemeAppearance,
  type CustomPalette,
  type DisplayMode,
  persistCustomPalette,
  persistDisplayMode,
  persistPalette,
  persistThemeMode,
  readCustomPaletteFromStorage,
  readThemeStateFromStorage,
  STORAGE_KEYS,
  type PaletteId,
  type ThemeMode,
  type ThemeState,
} from '@/lib/theme-system';

type ThemeContextValue = {
  ready: boolean;
  customPalette: CustomPalette;
  state: ThemeState;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPalette: (palette: PaletteId) => void;
  setCustomPalette: (palette: CustomPalette) => void;
  setDisplayMode: (displayMode: DisplayMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export default function ThemeProvider({
  children,
  initialState,
  initialCustomPalette,
}: {
  children: React.ReactNode;
  initialState: ThemeState;
  initialCustomPalette: CustomPalette;
}) {
  const [state, setState] = useState<ThemeState>(initialState);
  const [customPalette, setCustomPaletteState] = useState<CustomPalette>(initialCustomPalette);
  const ready = true;

  useEffect(() => {
    applyThemeAppearance(initialState, initialCustomPalette);

    const syncState = () => {
      const nextState = readThemeStateFromStorage();
      const nextCustomPalette = readCustomPaletteFromStorage();
      applyThemeAppearance(nextState, nextCustomPalette);
      setCustomPaletteState(nextCustomPalette);
      setState(nextState);
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
      if (storedTheme === 'light' || storedTheme === 'dark') return;

      setState((current) => {
        const nextTheme: ThemeMode = event.matches ? 'dark' : 'light';
        const nextState: ThemeState = {
          ...current,
          theme: nextTheme,
        };
        applyThemeAppearance(nextState, customPalette);
        return nextState;
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== STORAGE_KEYS.theme &&
        event.key !== STORAGE_KEYS.palette &&
        event.key !== STORAGE_KEYS.displayMode &&
        event.key !== STORAGE_KEYS.customPalette
      ) {
        return;
      }

      syncState();
    };

    media.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      media.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [customPalette, initialCustomPalette, initialState]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((current) => {
      const nextState = { ...current, theme };
      applyThemeAppearance(nextState, customPalette);
      persistThemeMode(theme);
      return nextState;
    });
  }, [customPalette]);

  const toggleTheme = useCallback(() => {
    setState((current) => {
      const nextTheme: ThemeMode = current.theme === 'dark' ? 'light' : 'dark';
      const nextState: ThemeState = {
        ...current,
        theme: nextTheme,
      };
      applyThemeAppearance(nextState, customPalette);
      persistThemeMode(nextState.theme);
      return nextState;
    });
  }, [customPalette]);

  const setPalette = useCallback((palette: PaletteId) => {
    setState((current) => {
      const nextState = { ...current, palette };
      applyThemeAppearance(nextState, customPalette);
      persistPalette(palette);
      return nextState;
    });
  }, [customPalette]);

  const setCustomPalette = useCallback((palette: CustomPalette) => {
    setCustomPaletteState(palette);
    setState((current) => {
      const nextState = { ...current, palette: 'custom' as PaletteId };
      applyThemeAppearance(nextState, palette);
      persistCustomPalette(palette);
      persistPalette('custom');
      return nextState;
    });
  }, []);

  const setDisplayMode = useCallback((displayMode: DisplayMode) => {
    setState((current) => {
      const nextState = { ...current, displayMode };
      applyThemeAppearance(nextState, customPalette);
      persistDisplayMode(displayMode);
      return nextState;
    });
  }, [customPalette]);

  const value = useMemo(
    () => ({
      ready,
      customPalette,
      state,
      setTheme,
      toggleTheme,
      setPalette,
      setCustomPalette,
      setDisplayMode,
    }),
    [customPalette, ready, setCustomPalette, setDisplayMode, setPalette, setTheme, state, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
