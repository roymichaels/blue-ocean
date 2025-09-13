import React from 'react';
import { View } from 'react-native';
import { ScrollArea, Container } from '@/ui/layout';
import { Heading, Text } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <ScrollArea backgroundColor={colors.canvas}>
      <Container>
        <Heading size="xl">{t('navigation.settings', 'Settings')}</Heading>
        <View style={{ height: 8 }} />
        <Text>{t('common.comingSoon', 'Coming Soon')}</Text>
      </Container>
    </ScrollArea>
  );
}

