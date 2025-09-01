import { Colors as DarkColors } from './Colors';
import { LightColors } from './LightColors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 60,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 25,
  full: 9999,
};

export const zIndex = {
  base: 0,
  dropdown: 1000,
  modal: 1100,
  toast: 1200,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
};

export const darkTokens = {
  spacing,
  radius,
  zIndex,
  shadows,
  colors: DarkColors,
};

export const lightTokens = {
  spacing,
  radius,
  zIndex,
  shadows,
  colors: LightColors,
};

export type Tokens = typeof darkTokens;
