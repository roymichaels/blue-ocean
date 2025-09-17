import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '@/ui';
import { spacing, radius, colors } from '@/shared/ui/tokens';
import EmptyState from '@/shared/ui/EmptyState';
import { Inbox } from 'lucide-react-native';

export type AdminListItem = {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
};


type Props = { items: AdminListItem[]; emptyText?: string };

// TODO:TODO-124 Allow AdminList to render action badges (approve/deny) inline for pending administrator requests.
// TODO:REC-224 Memoize list virtualization so large admin rosters don't re-render on each theme change.
function AdminList({ items, emptyText = 'Nothing yet.' }: Props) {
  const { colors } = useTheme();

  const buttonBackground = useMemo(
    () => ({ backgroundColor: colors.surface.primary }),
    [colors.surface.primary]
  );
  const primaryTextColor = useMemo(
    () => ({ color: colors.text.primary }),
    [colors.text.primary]
  );
  const secondaryTextColor = useMemo(
    () => ({ color: colors.text.secondary }),
    [colors.text.secondary]
  );

  if (!items.length) {
    return (
      <View style={styles.container}>
        <EmptyState icon={Inbox} title="No items" message={emptyText} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((it) => (
        <Button
          key={it.id}
          onPress={it.onPress}

          style={[styles.button, buttonBackground]}
          accessibilityRole="button"
        >
          <Text style={[styles.title, primaryTextColor]}>{it.title}</Text>
          {it.subtitle ? (
            <Text style={[styles.subtitle, secondaryTextColor]}>{it.subtitle}</Text>
          ) : null}
        </Button>
      ))}
    </View>
  );
}

export default memo(AdminList);

const styles = StyleSheet.create({
  container: {
    padding: spacing.spacer16,
  },
  emptyText: {
    color: colors.text.secondary,
  },
  itemButton: {
    marginBottom: spacing.spacer12,
    alignItems: 'flex-start',
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: spacing.spacer4,
  },
});

