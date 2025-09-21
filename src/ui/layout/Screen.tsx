import React from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface ScreenProps {
  children: React.ReactNode;
  padded?: boolean;
  scrollable?: boolean;
}

export function Screen({ children, padded = true, scrollable = false }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const content = (
    <View style={[styles.content, padded && { paddingHorizontal: spacing.md }]}>{children}</View>
  );

  const paddingTop = Platform.select({ ios: spacing.lg, android: spacing.md, default: spacing.md });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop }]}>
      <StatusBar
        barStyle={colors.background === '#05070a' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      {scrollable ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: spacing.lg }}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 24,
  },
});
