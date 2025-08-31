import React from 'react';
import { View, Text } from 'react-native';
import GoldDivider from './GoldDivider';
import { useTheme } from '../../contexts/ThemeContext';

export default function Section({
  title,
  children,
  center = false,
}: {
  title: string;
  children: React.ReactNode;
  center?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
      <Text
        style={{
          color: colors.text.primary,
          fontSize: 18,
          fontWeight: '700',
          textAlign: center ? 'center' : 'left',
        }}
      >
        {title}
      </Text>
      <View style={{ alignItems: center ? 'center' : 'flex-start', marginTop: 8 }}>
        <GoldDivider width={center ? 160 : 120} />
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

