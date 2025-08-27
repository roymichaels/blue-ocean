import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { payPrivately, openModal, useNearAccount } from '../services/near';

interface PayPrivatelyButtonProps {
  listingId: number;
  amountYocto: string;
  onComplete?: () => void;
}

export default function PayPrivatelyButton({ listingId, amountYocto, onComplete }: PayPrivatelyButtonProps) {
  const { colors } = useTheme();
  const accountId = useNearAccount();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!accountId) {
      await openModal();
      return;
    }
    try {
      setLoading(true);
      await payPrivately({ id: listingId, buyer: accountId, amountYocto });
      onComplete?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      testID="pay-privately-button"
      style={[styles.button, { backgroundColor: colors.interactive.primary }]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.inverse} />
      ) : (
        <Text style={[styles.text, { color: colors.text.inverse }]}>Pay Privately</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

