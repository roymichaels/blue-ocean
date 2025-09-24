import React from 'react';
import { TextInput, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { Card } from '@/ui';
import Text from '@/ui/primitives/Text';
import { Stack } from '@/ui/layout';
import { spacing, radius } from '@/shared/ui/tokens';

const colorChoices = [0xb99c5a, 0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff].map(
  (c) => `#${c.toString(16).padStart(6, '0')}`
);

interface Props {
  name: string;
  setName: (v: string) => void;
  logoCidInput: string;
  setLogoCidInput: (v: string) => void;
  themeColor: string;
  setThemeColorState: (v: string) => void;
  colors: any;
  t: (key: string) => string;
}

const BrandingSettings: React.FC<Props> = ({
  name,
  setName,
  logoCidInput,
  setLogoCidInput,
  themeColor,
  setThemeColorState,
  colors,
  t,
}) => {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <Stack direction="row" style={styles.header}>
        <SettingsIcon size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('brandingSettings.title')}
        </Text>
      </Stack>
      <Stack style={styles.content} gap="spacer8">
        <Stack gap="spacer8">
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t('brandingSettings.platformName')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={t('ageVerification.platformName')}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </Stack>
        <Stack gap="spacer8">
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t('brandingSettings.logo')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.primary,
                color: colors.text.primary,
              },
            ]}
            value={logoCidInput}
            onChangeText={setLogoCidInput}
            placeholder="ipfs://..."
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </Stack>
        <Stack gap="spacer8">
          <Text style={[styles.label, { color: colors.text.primary }]}>
            {t('brandingSettings.themeColor')}
          </Text>
          {Platform.OS === 'web' ? (
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColorState(e.target.value)}
              style={styles.colorInput}
            />
          ) : (
            <Stack direction="row" style={styles.colorOptions}>
              {colorChoices.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setThemeColorState(c)}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: c,
                      borderWidth: themeColor === c ? 3 : 1,
                      borderColor: themeColor === c ? colors.gold : colors.border.primary,
                    },
                  ]}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.spacer16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: spacing.spacer16,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: spacing.spacer8,
  },
  content: {
    padding: spacing.spacer16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer12,
    fontSize: 16,
  },
  colorInput: {
    width: spacing.spacer40,
    height: spacing.spacer40,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  colorOptions: {
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    marginRight: spacing.spacer8,
    marginBottom: spacing.spacer8,
  },
});

export default BrandingSettings;
