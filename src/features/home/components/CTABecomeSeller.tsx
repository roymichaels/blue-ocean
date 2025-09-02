import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import Text from '@/shared/ui/Text';

export default function CTABecomeSeller() {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.gold }]}
      onPress={() => router.push('/stores/create')}
      accessibilityRole="link"
    >
      <Text variant="md" weight="600" style={{ color: colors.text.inverse }}>
        Become a Seller
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
});

