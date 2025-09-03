import React from 'react';
import { TextProps, TextStyle } from 'react-native';
import Text from './Text';
import { typography } from './tokens';

type Size = keyof typeof typography;

interface HeadingProps extends TextProps {
  size?: Size;
  weight?: TextStyle['fontWeight'];
}

export default function Heading({
  size = 'lg',
  weight = '700',
  ...rest
}: HeadingProps) {
  return <Text variant={size} weight={weight} {...rest} />;
}

