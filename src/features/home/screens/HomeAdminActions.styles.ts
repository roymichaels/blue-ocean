import { StyleSheet } from 'react-native';
import { spacing } from '@/shared/ui/tokens';

export const styles = StyleSheet.create({
  container: {
    padding: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  clearDataButton: {
    borderRadius: 12,
    paddingVertical: spacing.spacer12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDataText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.spacer8,
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.spacer4,
    textAlign: 'right',
  },
  buttonSpinner: {
    marginRight: spacing.spacer8,
  },
});
