import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '@/constants/tokens';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Spinner({
  size = 'large',
  color,
  label,
  style,
}: SpinnerProps) {
  const { getColor } = useTheme();
  const spinnerColor = color || getColor('gold');

  return (
    <View style={[styles.container, { backgroundColor: getColor('background') }, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {label ? (
        <Text style={[styles.label, { color: getColor('text.primary') }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer20,
  },
  label: {
    marginTop: spacing.spacer12,
  },
});
