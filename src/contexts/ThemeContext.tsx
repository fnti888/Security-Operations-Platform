import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getUserSettings, saveUserSettings } from '../lib/userSettings';

type ThemeMode = 'classic' | 'accessible' | 'midnight' | 'matrix';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'classic';
  });

  const [reduceMotion, setReduceMotionState] = useState(() => {
    const saved = localStorage.getItem('reduce-motion');
    return saved === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadUserSettings(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        if (session?.user) {
          setUserId(session.user.id);
          loadUserSettings(session.user.id);
        } else {
          setUserId(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserSettings = async (uid: string) => {
    const settings = await getUserSettings(uid);
    if (settings) {
      setModeState(settings.themeMode);
      setReduceMotionState(settings.reduceMotion);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    if (userId) {
      try {
        await saveUserSettings(userId, { themeMode: newMode });
      } catch (error) {
        console.error('Failed to save theme mode:', error);
      }
    }
  };

  const setReduceMotion = async (reduce: boolean) => {
    setReduceMotionState(reduce);
    if (userId) {
      try {
        await saveUserSettings(userId, { reduceMotion: reduce });
      } catch (error) {
        console.error('Failed to save reduce motion setting:', error);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('reduce-motion', String(reduceMotion));
    document.documentElement.setAttribute('data-reduce-motion', String(reduceMotion));
  }, [reduceMotion]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, reduceMotion, setReduceMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
