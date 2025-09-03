import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Button from '@/ui/primitives/Button';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  colors: any;
}

const MessageInput: React.FC<Props> = ({ value, onChange, onSend, colors }) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.secondary }]}
        value={value}
        onChangeText={onChange}
        placeholder="Type a message"
        placeholderTextColor={colors.text.tertiary}
        textAlign="right"
      />
      <Button
        title="Send"
        onPress={onSend}
        style={{ marginLeft: 8 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
});

export default MessageInput;
