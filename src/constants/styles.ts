import { StyleSheet } from 'react-native';
import { spacing } from './tokens';

export { spacing };

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
