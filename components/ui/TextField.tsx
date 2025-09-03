import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius } from '@shared/ui/tokens';

interface TextFieldProps extends TextInputProps {
  variant?: 'default' | 'search';
}

export default function TextField({ variant = 'default', style, ...props }: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border.primary,
          backgroundColor: colors.surface.primary,
          borderRadius: radius.md,
          paddingVertical: spacing.spacer8,
          paddingHorizontal: spacing.spacer12,
        },
        style,
      ]}
    >
      {variant === 'search' && (
        <Search
          size={20}
          color={colors.text.tertiary}
          style={{ marginEnd: spacing.spacer8 }}
        />
      )}
      <TextInput
        style={{ flex: 1, color: colors.text.primary }}
        placeholderTextColor={colors.text.tertiary}
        {...props}
      />
    </View>
  );
}

