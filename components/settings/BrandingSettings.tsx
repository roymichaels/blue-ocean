import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import Card from '@/ui/primitives/Card';

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
      <View style={styles.header}>
        <SettingsIcon size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>הגדרות מיתוג</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>שם הפלטפורמה</Text>
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
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>לוגו (CID או URL)</Text>
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
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>צבע נושא</Text>
          {Platform.OS === 'web' ? (
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColorState(e.target.value)}
              style={styles.colorInput}
            />
          ) : (
            <View style={styles.colorOptions}>
              {['#B99C5A', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF'].map((c) => (
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
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  colorInput: {
    width: 40,
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
});

export default BrandingSettings;
