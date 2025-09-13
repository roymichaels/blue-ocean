import React from 'react';
import { View, ViewProps } from 'react-native';
import { spacing } from '../tokens';

interface StackProps extends ViewProps {
  /** flex direction, default vertical */
  direction?: 'vertical' | 'horizontal';
  /** spacing key from tokens */
  gap?: keyof typeof spacing;
  /** align-items value */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
}

export default function Stack({
  direction = 'vertical',
  gap,
  align,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: gap ? spacing[gap] : undefined,
          alignItems: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

