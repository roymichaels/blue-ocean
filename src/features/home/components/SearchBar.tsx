import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/ui/ThemeProvider';
import { TextField } from '@/ui';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <TextField
      variant="search"
      value={searchQuery}
      onChangeText={onSearchChange}
      placeholder={t('home.searchPlaceholder')}
      style={styles.field}
      textAlign="right"
    />
  );
}

const styles = StyleSheet.create({
  field: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});

