import React from 'react';
import {
  AccessibilityRole,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { Card, Text } from '@/ui';
import { Stack } from '@/ui/layout';
import { spacing, radius, shadows } from '@/ui/tokens';

interface PromoCardProps {
  backgroundColor: string;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function PromoCard({
  backgroundColor,
  icon,
  title,
  subtitle,
  onPress,
  accessibilityRole,
  testID,
  children,
  style,
}: PromoCardProps) {
  const { colors } = useTheme();

  const content = (
    <Stack gap="spacer8" align="center">
      {icon}
      {title && (
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {subtitle}
        </Text>
      )}
      {children}
    </Stack>
  );

  return (
    <Card style={[styles.card, { backgroundColor }, style]}>
      {onPress ? (
        <TouchableOpacity
          style={styles.touch}
          onPress={onPress}
          accessibilityRole={accessibilityRole}
          testID={testID}
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.spacer16,
    borderRadius: radius.xl,
    ...Platform.select(shadows.md),
  },
  touch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});

