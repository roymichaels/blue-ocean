import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { typography } from './tokens';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  weight?: TextStyle['fontWeight'];
}

export default function Text({
  variant = 'md',
  weight = '400',
  style,
  ...rest
}: Props) {
  const { getColor } = useTheme();
  const { fontSize, lineHeight, letterSpacing } = typography[variant];

  return (
    <RNText
      style={[
        {
          fontSize,
          lineHeight,
          letterSpacing,
          fontWeight: weight,
          color: getColor('text.primary'),
        },
        style,
      ]}
      {...rest}
    />
  );
}

