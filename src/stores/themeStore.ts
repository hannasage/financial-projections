import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, ThemeColors, PlanColor } from '../lib/themes';
import { THEMES, DEFAULT_THEME } from '../lib/themes';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'projection-theme',
      // Only persist the theme id, restore full theme object on load
      partialize: (state) => ({ themeId: state.theme.id }),
      merge: (persisted, current) => {
        const saved = persisted as { themeId?: string };
        const found = saved.themeId ? THEMES.find(t => t.id === saved.themeId) : null;
        return { ...current, theme: found ?? current.theme };
      },
    },
  ),
);

export function useColors(): ThemeColors {
  return useThemeStore(s => s.theme.colors);
}

export function usePlanColors(): PlanColor[] {
  return useThemeStore(s => s.theme.planColors);
}
