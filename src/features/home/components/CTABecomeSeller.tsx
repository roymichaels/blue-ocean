import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface CTABecomeSellerProps {
  onPress: () => void;
}

export default function CTABecomeSeller({ onPress }: CTABecomeSellerProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.gold }]}
      onPress={onPress}
      accessibilityRole="link"
    >
      <Text style={[styles.text, { color: colors.text.inverse }]}>
        {t('home.becomeSeller')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
