import { StyleSheet } from 'react-native';
import { spacing } from '@/shared/ui/tokens';

export const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.spacer16,
    marginBottom: spacing.spacer24,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesList: {
    paddingLeft: spacing.spacer16,
  },
  categoryWrapper: {
    marginLeft: spacing.spacer20,
  },
});
