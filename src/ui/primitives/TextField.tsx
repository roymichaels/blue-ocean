import React from 'react';
import { TextInput, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';

interface TextFieldProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
}

export default function TextField({ value, onChangeText, placeholder, style }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.tertiary}
      style={[
        {
          backgroundColor: colors.surface.primary,
          color: colors.text.primary,
          paddingHorizontal: spacing.spacer16,
          paddingVertical: spacing.spacer8,
          borderRadius: radius.md,
          ...typography.md,
        },
        style,
      ]}
    />
  );
}
