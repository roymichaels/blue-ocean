import React from 'react';
import { View, Text } from 'react-native';
import GoldDivider from './GoldDivider';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/tokens';

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
    <View style={{ paddingHorizontal: spacing.spacer16, paddingVertical: spacing.spacer16 }}>
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
      <View style={{ alignItems: center ? 'center' : 'flex-start', marginTop: spacing.spacer8 }}>
        <GoldDivider width={center ? 160 : 120} />
      </View>
      <View style={{ marginTop: spacing.spacer12 }}>{children}</View>
    </View>
  );
}

