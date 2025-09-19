import React from 'react';
import { TextInput, StyleProp, TextStyle, TextInputProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';

export interface TextFieldProps extends TextInputProps {
  variant?: 'default' | 'search';
  style?: StyleProp<TextStyle>;
}

export default function TextField({
  value,
  onChangeText,
  placeholder,
  style,
  secureTextEntry,
  keyboardType,
  textAlign,
  variant = 'default',
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();

  const variantStyle =
    variant === 'search'
      ? {
          borderRadius: radius.full,
          paddingHorizontal: spacing.spacer16,
        }
      : undefined;

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text.tertiary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      textAlign={textAlign as TextStyle['textAlign']}
      style={[
        {
          backgroundColor: colors.surface.primary,
          color: colors.text.primary,
          paddingHorizontal: spacing.spacer16,
          paddingVertical: spacing.spacer8,
          borderRadius: radius.md,
          ...typography.md,
        },
        variantStyle,
        style,
      ]}
      {...rest}
    />
  );
}
