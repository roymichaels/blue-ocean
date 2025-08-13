import { StyleSheet } from 'react-native';

export const spacing = {
  spacer4: 4,
  spacer8: 8,
  spacer12: 12,
  spacer16: 16,
  spacer20: 20,
  spacer24: 24,
  spacer40: 40,
};

export const typography = StyleSheet.create({
  heading1: {
    fontSize: 24,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 16,
  },
});

export const commonStyles = StyleSheet.create({
  spacer24: {
    width: spacing.spacer24,
    height: spacing.spacer24,
  },
  spacer40: {
    width: spacing.spacer40,
    height: spacing.spacer40,
  },
  flex1: {
    flex: 1,
  },
});

export default commonStyles;
