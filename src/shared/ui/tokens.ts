import {
  spacing,
  radius,
  zIndex,
  shadows,
  colors,
  tokens as baseTokens,
  lightTokens as baseLightTokens,
} from '@/constants/tokens';

export const typography = {
  xs: { fontSize: 12, lineHeight: 16, letterSpacing: 0.01 },
  sm: { fontSize: 14, lineHeight: 20, letterSpacing: 0.01 },
  md: { fontSize: 16, lineHeight: 24, letterSpacing: 0.01 },
  lg: { fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  xl: { fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  '2xl': { fontSize: 32, lineHeight: 40, letterSpacing: 0 },
};

export const tokens = { ...baseTokens, typography };
export const lightTokens = { ...baseLightTokens, typography };

export { spacing, radius, zIndex, shadows, colors };

export type Tokens = typeof tokens;

