import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useOnboarding } from '../hooks/useOnboardingMachine';

export default function OnboardingFlow() {
  const { history, send, step, loading } = useOnboarding();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [history]);

  if (loading) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messages} ref={scrollRef}>
        {history.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.message,
              msg.sender === 'aurora' ? styles.aurora : styles.user,
            ]}
          >
            <Text style={styles.text}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>
      {step !== 'complete' && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your response"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messages: {
    flex: 1,
    padding: 16,
  },
  message: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  aurora: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  text: {
    color: '#000',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#007aff',
    borderRadius: 4,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
  },
});

