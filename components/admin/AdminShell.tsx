import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ui/ThemeProvider';
import { Divider } from '@/ui';

export default function AdminShell({ title, children, actions }: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text.primary, fontSize: 20, fontWeight: '700' }}>{title}</Text>
          {actions}
        </View>
        <Divider
          style={{
            width: 160,
            height: 2,
            backgroundColor: colors.gold,
            borderRadius: 1,
            marginVertical: 0,
            marginTop: 8,
          }}
        />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

