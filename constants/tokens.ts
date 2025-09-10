// Centralized design token definitions.
// These provide consistent spacing, radius, color, and elevation values.
import { Colors as darkColors } from './Colors';
import { LightColors } from './LightColors';

export const spacing = {
  spacer4: 4,
  spacer8: 8,
  spacer12: 12,
  spacer16: 16,
  spacer20: 20,
  spacer24: 24,
  spacer40: 40,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const zIndex = {
  dropdown: 100,
  modal: 1000,
  overlay: 2000,
};

export const shadows = {
  sm: {
    ios: { elevation: 2 },
    android: { elevation: 2 },
    macos: { elevation: 2 },
    windows: { elevation: 2 },
    native: { elevation: 2 },
    web: { elevation: 2, boxShadow: `0px 2px 4px rgba(0,0,0,0.1)` },
  },
  md: {
    ios: { elevation: 5 },
    android: { elevation: 5 },
    macos: { elevation: 5 },
    windows: { elevation: 5 },
    native: { elevation: 5 },
    web: { elevation: 5, boxShadow: `0px 4px 12px rgba(0,0,0,0.15)` },
  },
  lg: {
    ios: { elevation: 12 },
    android: { elevation: 12 },
    macos: { elevation: 12 },
    windows: { elevation: 12 },
    native: { elevation: 12 },
    web: { elevation: 12, boxShadow: `0px 4px 8px rgba(0,0,0,0.3)` },
  },
};

const dark = {
  ...darkColors,
  primary: darkColors.interactive.primary,
  muted: darkColors.text.secondary,
  // Flatten commonly used color tokens for easy access
  canvas: darkColors.canvas,
};

const light = {
  ...LightColors,
  primary: LightColors.interactive.primary,
  muted: LightColors.text.secondary,
  canvas: LightColors.canvas,
};

export const colors = dark;

export const tokens = { spacing, radius, colors, zIndex, shadows };
export const lightTokens = { ...tokens, colors: light };

export type Tokens = typeof tokens;
