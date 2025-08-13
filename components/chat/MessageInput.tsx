import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

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
        textAlign="end"
      />
      <TouchableOpacity onPress={onSend} style={[styles.button, { backgroundColor: colors.gold }]}> 
        <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Send</Text>
      </TouchableOpacity>
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
  button: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageInput;
