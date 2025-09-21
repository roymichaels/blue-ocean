import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Screen } from '@/ui/layout/Screen';
import { Card } from '@/ui/components/Card';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { useAppMode } from '@/application/providers/AppModeProvider';
import { appSlug, appVersion } from '@/application/config/appConfig';

export default function ProfileScreen() {
  const { colors, spacing, typography } = useTheme();
  const { mode, setMode } = useAppMode();
  const version = appVersion;

  return (
    <Screen scrollable>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: typography.heading, fontWeight: '600' }}>Your space</Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.body }}>
            Switch between demo data and live mode instantly.
          </Text>
        </View>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: '600' }}>Live data mode</Text>
              <Text style={{ color: colors.textMuted, fontSize: typography.small }}>
                {mode === 'live'
                  ? 'Connected to your production services.'
                  : 'Uses bundled mock data so you can demo offline.'}
              </Text>
            </View>
            <Switch
              value={mode === 'live'}
              onValueChange={(value) => setMode(value ? 'live' : 'mock')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, fontSize: typography.small }}>Build info</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Blue Ocean</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.small }}>Version {version}</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.small }}>
              Bundle ID {appSlug}
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
