import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import type { LucideProps } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import Button from '@/ui/primitives/Button';

type IconComponent = React.ComponentType<LucideProps>;

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  const { getColor } = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={80} color={getColor('interactive.disabled')} />
      <Text style={[styles.title, { color: getColor('text.primary') }]}>{title}</Text>
      <Text style={[styles.message, { color: getColor('text.secondary') }]}>{message}</Text>
      {actionText && onAction && (
        <Button title={actionText} onPress={onAction} style={styles.actionButton} />
      )}
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
    borderRadius: 25,
    paddingHorizontal: 24,
  },
});

