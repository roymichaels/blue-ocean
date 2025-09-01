import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function GoldDivider({ width = 120 }: { width?: number }) {
  const { getColor } = useTheme();
  return (
    <View
      style={{
        height: 2,
        width,
        backgroundColor: getColor('gold'),
        borderRadius: 1,
      }}
    />
  );
}

