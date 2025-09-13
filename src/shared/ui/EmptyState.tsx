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
  icon?: IconComponent; // optional — when omitted, no icon renders
  title: string;
  message?: string; // semantic alias for description
  description?: string;
  actionText?: string;
  onAction?: () => void;
  action?: React.ReactNode; // advanced: custom action node
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  actionText,
  onAction,
  action,
}: EmptyStateProps) {
  const { getColor } = useTheme();

  return (
    <View style={styles.container}>
      {Icon ? (
        <Icon size={80} color={getColor('interactive.disabled')} />
      ) : null}
      <Heading style={[styles.title, { color: getColor('text.primary') }]} size="lg">
        {title}
      </Heading>
      {(message || description) && (
        <Text style={[styles.message, { color: getColor('text.secondary') }]}>
          {message ?? description}
        </Text>
      )}
      {action
        ? action
        : actionText && onAction
        ? <Button title={actionText} onPress={onAction} />
        : null}
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

