import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { radius, spacing, typography } from '../tokens';
import Button from './Button';

interface ChipProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Chip({ label, onPress, style, textStyle }: ChipProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <Button
      title={label}
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        {
          borderRadius: radius.full,
          paddingHorizontal: spacing.spacer12,
          paddingVertical: spacing.spacer4,
          backgroundColor: colors.surface.primary,
          borderWidth: 1,
          borderColor: colors.border.primary,
          minHeight: 44,
          minWidth: 44,
        },
        style,
        isFocused && {
          borderColor: colors.border.focus,
          borderWidth: 2,
        },
      ]}
      textStyle={[{ color: colors.text.primary, ...typography.sm }, textStyle]}
    />
  );
}
