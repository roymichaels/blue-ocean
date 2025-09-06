import React from 'react';
import { TextInput, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';

interface TextFieldProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  secureTextEntry?: boolean;
}

export default function TextField({ value, onChangeText, placeholder, style, secureTextEntry }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.tertiary}
      secureTextEntry={secureTextEntry}
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
