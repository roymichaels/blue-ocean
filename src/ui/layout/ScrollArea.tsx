import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { spacing } from '../tokens';

interface ScrollAreaProps extends ScrollViewProps {
  padding?: keyof typeof spacing;
}

export default function ScrollArea({ padding, contentContainerStyle, children, ...rest }: ScrollAreaProps) {
  return (
    <ScrollView
      {...rest}
      contentContainerStyle={[
        padding ? { padding: spacing[padding] } : null,
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

