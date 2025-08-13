import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import Card from '../Card';

interface Props {
  currencySymbol: string;
  setCurrencySymbolState: (v: string) => void;
  colors: any;
}

const CurrencySettings: React.FC<Props> = ({ currencySymbol, setCurrencySymbolState, colors }) => {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <View style={styles.header}>
        <DollarSign size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>הגדרות מטבע</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text.secondary }]}>גדר את סמל המטבע שיוצג בכל רחבי האפליקציה</Text>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>סמל מטבע</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={currencySymbol}
            onChangeText={setCurrencySymbolState}
            placeholder="₪"
            maxLength={3}
            textAlign="center"
          />
        </View>
        <Text style={[styles.helper, { color: colors.text.tertiary }]}>דוגמאות: ₪, $, €, £</Text>
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
  description: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'end',
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'end',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  helper: {
    fontSize: 12,
    textAlign: 'end',
  },
});

export default CurrencySettings;
