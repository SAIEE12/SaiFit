import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as baseTheme } from '../theme';

const ThemeContext = createContext({
  isDark: false,
  theme: baseTheme,
  toggleTheme: () => {},
  themeName: 'Day Workout'
});

export const useTheme = () => useContext(ThemeContext);

const darkColors = {
  primary: '#FF2D55',          // Velvet Crimson
  primaryLight: 'rgba(255, 45, 85, 0.15)',
  primaryBorder: 'rgba(255, 45, 85, 0.3)',

  // Semantic
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  danger: '#FF3B30',
  dangerLight: 'rgba(255, 59, 48, 0.15)',
  info: '#0A84FF',             // Neon blue
  infoLight: 'rgba(10, 132, 255, 0.15)',

  // Surfaces
  background: '#0B0C0E',       // Night Deep Canvas
  surface: '#14161B',          // Sleek Charcoal Card
  surfaceElevated: '#1F222A',  // Modals, sheets

  // Borders
  border: '#1F222A',           // Dark borders
  borderStrong: '#2A2E39',

  // Text
  textPrimary: '#FFFFFF',      // High-contrast white
  textSecondary: '#9EAFBF',    // Muted ice-blue gray
  textTertiary: '#5A6275',     // Dark slate gray

  // AI Accent
  aiAccent: '#FF2D55',
  aiAccentLight: 'rgba(255, 45, 85, 0.15)',

  // Misc helpers (kept for backward compat)
  secondary: '#0A84FF',
  secondaryLight: 'rgba(10, 132, 255, 0.15)',
  orange: '#FF9500',
  green: '#10B981',
  yellow: '#F59E0B',
  card: '#14161B',
  darkBase: '#FFFFFF',
  darkPillBg: 'rgba(255, 255, 255, 0.08)',
  darkSheetOverlay: 'rgba(0, 0, 0, 0.7)',
  accentPinkLight: 'rgba(255, 45, 85, 0.15)',
  accentBlueLight: 'rgba(10, 132, 255, 0.15)',
  accentGreenLight: 'rgba(16, 185, 129, 0.15)',
  accentYellowLight: 'rgba(245, 158, 11, 0.15)',
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved theme preference on start
  useEffect(() => {
    AsyncStorage.getItem('theme_preference').then(savedPref => {
      if (savedPref) {
        setIsDark(savedPref === 'dark');
      } else {
        setIsDark(systemScheme === 'dark');
      }
      setLoading(false);
    }).catch(() => {
      setIsDark(systemScheme === 'dark');
      setLoading(false);
    });
  }, [systemScheme]);

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    try {
      await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const theme = useMemo(() => {
    const activeColors = isDark ? darkColors : baseTheme.colors;
    
    // Update typography text colors dynamically as well
    const updatedTypography = {};
    Object.keys(baseTheme.typography).forEach(key => {
      updatedTypography[key] = {
        ...baseTheme.typography[key],
        color: isDark ? (key.startsWith('label') || key.startsWith('caption') ? darkColors.textSecondary : darkColors.textPrimary) : baseTheme.typography[key].color
      };
    });

    return {
      ...baseTheme,
      colors: activeColors,
      typography: updatedTypography
    };
  }, [isDark]);

  const themeName = isDark ? 'Night Run' : 'Day Workout';

  if (loading) return null;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, themeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to dynamically generate stylesheets that react to theme shifts
export const useThemedStyles = (stylesFactory) => {
  const { theme } = useTheme();
  return useMemo(() => stylesFactory(theme), [theme, stylesFactory]);
};
