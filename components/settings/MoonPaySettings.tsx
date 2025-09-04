import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import Card from '@/ui/primitives/Card';

interface Props {
  fiatKeyInput: string;
  setFiatKeyInput: (v: string) => void;
  colors: any;
}

const MoonPaySettings: React.FC<Props> = ({ fiatKeyInput, setFiatKeyInput, colors }) => {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <View style={styles.header}>
        <SettingsIcon size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>MoonPay</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Publishable Key</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={fiatKeyInput}
            onChangeText={setFiatKeyInput}
            placeholder="pk_live_..."
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
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
});

export default MoonPaySettings;
