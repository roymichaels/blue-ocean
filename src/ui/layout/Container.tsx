import React from 'react';
import { View, ViewProps, useWindowDimensions } from 'react-native';
import { spacing } from '../tokens';

interface ContainerProps extends ViewProps {
  padding?: keyof typeof spacing;
  backgroundColor?: string;
}

export default function Container({
  padding,
  backgroundColor,
  style,
  children,
  ...rest
}: ContainerProps) {
  const { width } = useWindowDimensions();
  const basePaddingHorizontal =
    width >= 768 ? spacing.spacer24 : spacing.spacer16;

  return (
    <View
      style={[
        {
          maxWidth: 1280,
          marginHorizontal: 'auto' as any,
          paddingVertical: 32,
          paddingHorizontal: basePaddingHorizontal,
        },
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

