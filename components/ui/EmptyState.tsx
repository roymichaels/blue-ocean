import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Video as LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={80} color={colors.interactive.disabled} />
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
      {action ? (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.gold }]} onPress={action.onPress}>
          <Text style={[styles.actionButtonText, { color: colors.text.inverse }]}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
