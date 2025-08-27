import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import chain from '../../services/chain';
import { User } from '../../types';

let listUsers: (() => Promise<User[]>) | undefined;
if (chain === 'ton') {
  ({ listUsers } = require('../../services/tonUsers'));
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
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {users.map((u) => (
        <Text key={u.id} style={{ color: colors.text.primary }}>
          {u.displayName || u.id}
        </Text>
      ))}
      {users.length === 0 && (
        <Text style={{ color: colors.text.secondary }}>No users found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
});
