import React from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  name: string;
  reputation?: number;
  bannerUri?: string | null;
  avatarUri?: string | null;
  tagline?: string | null;
}

export default function StoreHeader({ name, reputation = 0, bannerUri, avatarUri, tagline }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ width: '100%', height: 160, backgroundColor: colors.surface.secondary }}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
      <View style={{ marginTop: -28, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            overflow: 'hidden',
            backgroundColor: colors.surface.primary,
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 22,
              fontWeight: Platform.OS === 'web' ? ('700' as any) : '700',
            }}
          >
            {name}
          </Text>
          <Text style={{ color: colors.text.secondary }}>Reputation: {reputation.toFixed(1)}</Text>
          {!!tagline && <Text style={{ color: colors.text.tertiary }}>{tagline}</Text>}
        </View>
      </View>
      <View style={{ height: 8 }} />
      <View
        style={{
          height: 2,
          marginHorizontal: 16,
          backgroundColor: colors.gold,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

