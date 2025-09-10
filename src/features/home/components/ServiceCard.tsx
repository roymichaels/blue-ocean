import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from '@/ui';
import { Stack } from '@/ui/layout';
import { radius, typography } from '@/ui/tokens';
import { useTheme } from '@/ui/ThemeProvider';

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityRole?: 'button' | 'link';
  testID?: string;
}

export default function ServiceCard({
  title,
  icon,
  onPress,
  accessibilityRole = 'button',
  testID,
}: ServiceCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface.secondary }]}>
      <TouchableOpacity
        style={styles.touch}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        testID={testID}
      >
        <Stack gap="spacer8" style={styles.content}>
          {icon}
          <Text style={[typography.sm, { color: colors.text.primary }]}>{title}</Text>
        </Stack>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
  },
  touch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
});

