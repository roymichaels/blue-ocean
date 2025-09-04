import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import Card from '@/ui/primitives/Card';

interface Props {
  colors: any;
  admins: string[];
}

const EnvironmentSettings: React.FC<Props> = ({ colors, admins }) => {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <View style={styles.header}>
        <SettingsIcon size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Environment</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text.primary }]}>Admin Addresses: {admins.join(', ') || 'Not set'}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    textAlign: 'right',
  },
});

export default EnvironmentSettings;
