import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { spacing } from '../tokens';

interface ScrollAreaProps extends ScrollViewProps {
  padding?: keyof typeof spacing;
  backgroundColor?: string;
}

export default function ScrollArea({
  padding,
  backgroundColor,
  contentContainerStyle,
  style,
  children,
  ...rest
}: ScrollAreaProps) {
  return (
    <ScrollView
      style={[backgroundColor ? { backgroundColor } : null, { flex: 1 }, style]}
      {...rest}
      contentContainerStyle={[
        padding ? { padding: spacing[padding] } : null,
        { flexGrow: 1 },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

