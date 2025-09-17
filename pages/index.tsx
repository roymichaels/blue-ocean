// TOUCHPOINT: pages/index.tsx — MVP network homepage (hero + 4 cards)
import React, { Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrollArea, Stack } from '@/ui/layout';
import { Spinner } from '@/ui/primitives';
import HeroCallout from '@/features/home/components/HeroCallout';
import HomeOptions from '@/features/home/components/HomeOptions';
import { useTheme } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';

// TODO:TODO-125 Introduce above-the-fold personalization on IndexPage based on tenant insights.
// TODO:REC-225 Prefetch hero assets during idle periods to reduce initial skeleton time.
export default function IndexPage() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary>
      <ScrollArea backgroundColor={colors.canvas}>
        <View style={[styles.wrapper, { backgroundColor: colors.canvas }]}>
          <Stack gap="spacer24">
            <Suspense fallback={<Spinner />}>
              <HeroCallout />
            </Suspense>
            <Suspense fallback={<Spinner />}>
              <HomeOptions />
            </Suspense>
          </Stack>
        </View>
      </ScrollArea>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: '100vh' as any,
    paddingVertical: 24,
  },
});
