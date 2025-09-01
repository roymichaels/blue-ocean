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
import { spacing } from '../../constants/tokens';

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
  const { colors } = useTheme();
  const spinnerColor = color || colors.gold;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {label ? (
        <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
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
