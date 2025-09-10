import React from 'react';
import {
  AccessibilityRole,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, Text } from '@/ui';
import { Stack } from '@/ui/layout';
import { useTheme } from '@/ui/ThemeProvider';
import { spacing, radius } from '@/ui/tokens';

interface ServiceCardProps {
  title: string;
  onPress: () => void;
  Icon: React.ComponentType<{ size: number; color: string }>;
  subtitle?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

export default function ServiceCard({
  title,
  onPress,
  Icon,
  subtitle,
  accessibilityRole,
  testID,
}: ServiceCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.touch}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        testID={testID}
      >
        <Stack gap="spacer8" align="center">
          <Icon size={32} color={colors.gold} />
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </Stack>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: radius.lg,
    padding: spacing.spacer16,
  },
  touch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});

