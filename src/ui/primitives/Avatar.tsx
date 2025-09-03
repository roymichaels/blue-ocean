import React from 'react';
import {
  Image,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { radius } from '../tokens';
import Text from './Text';

interface AvatarProps {
  uri?: string | null;
  initials?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

export default function Avatar({
  uri,
  initials,
  size = 40,
  style,
  onPress,
  testID,
}: AvatarProps) {
  const Component = onPress ? Pressable : View;

  return (
    <Component
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      testID={testID}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : initials ? (
        <Text style={{ fontWeight: 'bold' }}>{initials}</Text>
      ) : null}
    </Component>
  );
}
