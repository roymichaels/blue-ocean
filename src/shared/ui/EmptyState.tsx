import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import Heading from '@/ui/primitives/Heading';
import type { LucideProps } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import Button from '@/ui/primitives/Button';
import { spacing } from './tokens';

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
      <Heading style={[styles.title, { color: getColor('text.primary') }]} size="lg">
        {title}
      </Heading>
      <Text style={[styles.message, { color: getColor('text.secondary') }]}>{message}</Text>
      {actionText && onAction && (
        <Button title={actionText} onPress={onAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spacer24,
    paddingVertical: spacing.spacer40,
  },
  title: {
    marginTop: spacing.spacer16,
    marginBottom: spacing.spacer8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.spacer24,
  },
});

