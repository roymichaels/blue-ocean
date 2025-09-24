import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/ui/ThemeProvider';

type Props = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

const LabeledInput = forwardRef<TextInput, Props>(function LabeledInput(
  { label, containerStyle, labelStyle, style, multiline, placeholderTextColor, textAlign, ...inputProps },
  ref,
) {
  const { colors } = useTheme();

  const resolvedPlaceholderColor = placeholderTextColor ?? colors.text.tertiary;
  const resolvedTextAlign = textAlign ?? 'right';

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.text.primary }, labelStyle]}>{label}</Text>
      <TextInput
        ref={ref}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary,
            color: colors.text.primary,
          },
          multiline && styles.textArea,
          style,
        ]}
        placeholderTextColor={resolvedPlaceholderColor}
        textAlign={resolvedTextAlign}
        multiline={multiline}
        {...inputProps}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default LabeledInput;
