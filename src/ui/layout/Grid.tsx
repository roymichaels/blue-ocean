import React from 'react';
import { View, ViewProps } from 'react-native';
import { spacing } from '../tokens';

interface GridProps extends ViewProps {
  gap?: keyof typeof spacing;
}

export default function Grid({ gap, style, children, ...rest }: GridProps) {
  return (
    <View
      style={[
        { flexDirection: 'row', flexWrap: 'wrap', gap: gap ? spacing[gap] : undefined },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

