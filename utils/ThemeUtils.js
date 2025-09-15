/**
 * Theme utility functions and color definitions
 */

export const lightTheme = {
  // Background colors
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  
  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  
  // Border colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  // Game specific colors
  gameBackground: '#faf8ef',
  boardBackground: '#bbada0',
  gridCell: '#cdc1b4',
  
  // Tile colors (same for both themes as they're part of game design)
  tile2: { bg: '#eee4da', text: '#776e65' },
  tile4: { bg: '#ede0c8', text: '#776e65' },
  tile8: { bg: '#f2b179', text: '#f9f6f2' },
  tile16: { bg: '#f59563', text: '#f9f6f2' },
  tile32: { bg: '#f67c5f', text: '#f9f6f2' },
  tile64: { bg: '#f65e3b', text: '#f9f6f2' },
  tile128: { bg: '#edcf72', text: '#f9f6f2' },
  tile256: { bg: '#edcc61', text: '#f9f6f2' },
  tile512: { bg: '#edc850', text: '#f9f6f2' },
  tile1024: { bg: '#edc53f', text: '#f9f6f2' },
  tile2048: { bg: '#edc22e', text: '#f9f6f2' },
  tileDefault: { bg: '#3c3a32', text: '#f9f6f2' },
  
  // Status colors
  primary: '#667eea',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // Score box colors
  scoreBackground: '#bbada0',
  scoreLabel: '#eee4da',
  scoreValue: '#ffffff',
  
  // Button colors
  buttonPrimary: '#667eea',
  buttonSecondary: '#8f7a66',
  buttonText: '#ffffff',
};

export const darkTheme = {
  // Background colors
  background: '#0f172a',
  surface: '#1e293b',
  surfaceSecondary: '#334155',
  
  // Text colors
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e0',
  textTertiary: '#94a3b8',
  
  // Border colors
  border: '#475569',
  borderLight: '#334155',
  
  // Game specific colors
  gameBackground: '#1e293b',
  boardBackground: '#475569',
  gridCell: '#64748b',
  
  // Tile colors (same as light theme)
  tile2: { bg: '#eee4da', text: '#776e65' },
  tile4: { bg: '#ede0c8', text: '#776e65' },
  tile8: { bg: '#f2b179', text: '#f9f6f2' },
  tile16: { bg: '#f59563', text: '#f9f6f2' },
  tile32: { bg: '#f67c5f', text: '#f9f6f2' },
  tile64: { bg: '#f65e3b', text: '#f9f6f2' },
  tile128: { bg: '#edcf72', text: '#f9f6f2' },
  tile256: { bg: '#edcc61', text: '#f9f6f2' },
  tile512: { bg: '#edc850', text: '#f9f6f2' },
  tile1024: { bg: '#edc53f', text: '#f9f6f2' },
  tile2048: { bg: '#edc22e', text: '#f9f6f2' },
  tileDefault: { bg: '#3c3a32', text: '#f9f6f2' },
  
  // Status colors
  primary: '#667eea',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // Score box colors
  scoreBackground: '#475569',
  scoreLabel: '#cbd5e0',
  scoreValue: '#f1f5f9',
  
  // Button colors
  buttonPrimary: '#667eea',
  buttonSecondary: '#64748b',
  buttonText: '#ffffff',
};

export const getTheme = (themeName) => {
  return themeName === 'dark' ? darkTheme : lightTheme;
};

export const createThemedStyles = (styles, theme) => {
  const themedStyles = {};
  
  for (const [key, style] of Object.entries(styles)) {
    if (typeof style === 'function') {
      themedStyles[key] = style(theme);
    } else {
      themedStyles[key] = style;
    }
  }
  
  return themedStyles;
};