import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
      ]}
    >
      <Search size={20} color={colors.text.tertiary} />
      <TextInput
        style={[styles.input, { color: colors.text.primary }]}
        placeholder={t('home.searchPlaceholder')}
        placeholderTextColor={colors.text.tertiary}
        value={searchQuery}
        onChangeText={onSearchChange}
        textAlign="end"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginStart: 8,
  },
});

