import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useRequirePlatformAdmin } from '@/services';
import RequireWallet from '@/components/RequireWallet';
import chain from '@/services/chain';
import { User } from '@/types';
import EmptyState from '@/shared/ui/EmptyState';
import { Users } from 'lucide-react-native';

let listUsers: (() => Promise<User[]>) | undefined;
if (chain === 'near') {
  ({ listUsers } = require('@/features/auth/services/nearUsers'));
}

export default function UserDirectory() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (listUsers) {
      listUsers().then(setUsers).catch(() => {});
    }
  }, []);

  return (
    <RequireWallet>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users" message="No users found." />
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
