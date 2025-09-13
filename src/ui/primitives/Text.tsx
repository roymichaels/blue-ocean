import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { typography } from '../tokens';

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
  const theme: any = useTheme() as any;
  const { fontSize, lineHeight, letterSpacing } = typography[variant];
  const color =
    (typeof theme.getColor === 'function'
      ? theme.getColor('text.primary')
      : theme?.colors?.text?.primary) || '#000';

  return (
    <RNText
      style={[
        {
          fontSize,
          lineHeight,
          letterSpacing,
          fontWeight: weight,
          color,
        },
        style,
      ]}
      {...rest}
    />
  );
}

