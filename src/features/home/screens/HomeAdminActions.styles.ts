import { StyleSheet } from 'react-native';
import { spacing } from '@/shared/ui/tokens';

export const styles = StyleSheet.create({
  container: {
    padding: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  clearDataLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: spacing.spacer4,
  },
  clearDataText: {
    fontSize: 12,
    textDecorationLine: 'underline',
    marginLeft: spacing.spacer4,
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.spacer4,
    textAlign: 'right',
  },
  buttonSpinner: {
    marginRight: spacing.spacer4,
  },
});
