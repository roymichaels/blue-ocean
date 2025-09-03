import React from 'react';
import { View, ViewProps } from 'react-native';
import { spacing } from '../tokens';

interface ContainerProps extends ViewProps {
  padding?: keyof typeof spacing;
  backgroundColor?: string;
}

export default function Container({ padding, backgroundColor, style, children, ...rest }: ContainerProps) {
  return (
    <View
      style={[
        padding ? { padding: spacing[padding] } : null,
        backgroundColor ? { backgroundColor } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

