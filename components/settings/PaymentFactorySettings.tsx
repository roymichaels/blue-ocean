import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import Card from '../Card';

interface Props {
  paymentFactoryAddress: string;
  setPaymentFactoryAddress: (v: string) => void;
  colors: any;
}

const PaymentFactorySettings: React.FC<Props> = ({
  paymentFactoryAddress,
  setPaymentFactoryAddress,
  colors,
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
        <Text style={[styles.title, { color: colors.text.primary }]}>Payment Factory</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Factory Address</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={paymentFactoryAddress}
            onChangeText={setPaymentFactoryAddress}
            placeholder="EQ..."
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

export default PaymentFactorySettings;
