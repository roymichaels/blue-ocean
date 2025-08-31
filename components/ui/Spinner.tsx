import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  label?: string;
  style?: any;
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
    <View style={[styles.container, style]}> 
      <ActivityIndicator size={size} color={spinnerColor} />
      {label ? (
        <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    marginTop: 12,
  },
});
