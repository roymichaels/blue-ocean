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
  /** justify-content value */
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
}

export default function Stack({
  direction = 'vertical',
  gap,
  align,
  justify,
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
          justifyContent: justify,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
