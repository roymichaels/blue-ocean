import React from 'react';
import {
  Pressable,
  StyleSheet,
  AccessibilityRole,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { Card, Text } from '@/ui';
import { Stack } from '@/ui/layout';
import { useTheme } from '@/ui/ThemeProvider';
import { radius, shadows } from '@/ui/tokens';

interface ServiceCardProps {
  title: string;
  icon?: React.ReactNode;
  image?: ImageSourcePropType;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

export default function ServiceCard({
  title,
  icon,
  image,
  onPress,
  accessibilityRole = 'button',
  testID,
}: ServiceCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <Pressable
        android_ripple={{ color: colors.interactive.secondary }}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        testID={testID}
      >
   <Stack gap="spacer8" style={styles.content}>
          {image ? <Image source={image} style={styles.image} /> : icon}
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        </Stack>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: radius.xl,
    ...Platform.select(shadows.md),
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
});

