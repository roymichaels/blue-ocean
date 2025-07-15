import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../components/AuthContext';
import { router } from 'expo-router';

export default function PINLoginScreen() {
  const { colors } = useTheme();
  const { verifyPin } = useAuth();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === 6) {
      handleComplete(pin);
    }
  }, [pin]);

  const handleComplete = async (completed: string) => {
    const success = await verifyPin(completed);
    if (success) {
      router.replace('/');
    } else {
      setPin('');
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const renderCircle = (filled: boolean, index: number) => (
    <View
      key={index}
      style={[
        styles.circle,
        {
          borderColor: colors.border.primary,
          backgroundColor: filled ? colors.interactive.primary : 'transparent',
        },
      ]}
    />
  );

  const renderButton = (
    label: string,
    onPress: () => void,
    key: string | number
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.keyButton, { backgroundColor: colors.surface.secondary }]}
      onPress={onPress}
    >
      <Text style={[styles.keyText, { color: colors.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['<', '0', 'OK'],
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.circlesContainer}>
        {Array.from({ length: 6 }).map((_, i) => renderCircle(i < pin.length, i))}
      </View>
      <View style={styles.keypad}>
        {rows.map((row, rIndex) => (
          <View key={rIndex} style={styles.keyRow}>
            {row.map((label, cIndex) => {
              if (label === '<') {
                return renderButton(label, handleDelete, `${rIndex}-${cIndex}`);
              }
              if (label === 'OK') {
                return renderButton(
                  label,
                  () => {
                    if (pin.length === 6) handleComplete(pin);
                  },
                  `${rIndex}-${cIndex}`
                );
              }
              return renderButton(label, () => handleDigit(label), `${rIndex}-${cIndex}`);
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    maxWidth: 300,
    marginBottom: 40,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  keypad: {
    width: '80%',
    maxWidth: 400,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keyButton: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 10,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
});

