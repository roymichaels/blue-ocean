import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius } from '@/shared/ui/tokens';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - spacing.spacer16 * 2;
const BANNER_HEIGHT = (BANNER_WIDTH * 9) / 16;

export default function BannerAreaSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.banner,
          { backgroundColor: colors.surface.secondary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.spacer24, alignItems: 'center' },
  banner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: radius.lg,
  },
});

