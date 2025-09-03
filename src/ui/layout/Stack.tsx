import React from 'react';
import { View, ViewProps } from 'react-native';
import { spacing } from '../tokens';

interface StackProps extends ViewProps {
  /** flex direction, default vertical */
  direction?: 'vertical' | 'horizontal';
  /** spacing key from tokens */
  gap?: keyof typeof spacing;
}

export default function Stack({
  direction = 'vertical',
  gap,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <View
      style={[
        { flexDirection: direction === 'horizontal' ? 'row' : 'column', gap: gap ? spacing[gap] : undefined },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

