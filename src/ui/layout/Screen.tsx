import React from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';

export default function Screen({ style, children, ...rest }: SafeAreaViewProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.canvas }, style]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

