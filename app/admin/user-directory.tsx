import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useRequirePlatformAdmin, useUsers } from '@/services';
import RequireWallet from '@/components/RequireWallet';
import EmptyState from '@/shared/ui/EmptyState';
import { Users } from 'lucide-react-native';

export default function UserDirectory() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { data: users = [], isLoading } = useUsers();

  return (
    <RequireWallet>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {users.length === 0 && !isLoading ? (
          <EmptyState
            icon={Users}
            title={t('admin.noUsers') as string}
            message={t('admin.noUsersFound') as string}
          />
        ) : (
          users.map((u) => (
            <Text key={u.id} style={{ color: colors.text.primary }}>
              {u.displayName || u.id}
            </Text>
          ))
        )}
      </View>
    </RequireWallet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
});
