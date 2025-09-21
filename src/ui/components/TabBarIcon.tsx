import React from 'react';
import { Platform, Text } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

type TabIconName = 'home' | 'search' | 'message-square' | 'shopping-bag' | 'user';

interface TabBarIconProps {
  name: TabIconName;
  focused: boolean;
}

const ICON_MAP: Record<TabIconName, string> = {
  home: '⌂',
  search: '⌕',
  'message-square': '✉',
  'shopping-bag': '🛒',
  user: '☺',
};

export function TabBarIcon({ name, focused }: TabBarIconProps) {
  const { colors } = useTheme();
  const glyph = ICON_MAP[name];
  return (
    <Text
      style={{
        fontSize: 18,
        color: focused ? colors.primary : colors.textMuted,
        fontWeight: '600',
        fontFamily: Platform.select({ web: 'system-ui', default: undefined }),
      }}
    >
      {glyph}
    </Text>
  );
}
