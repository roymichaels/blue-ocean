import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AuroraSphere from './AuroraSphere';
import VoiceService from '../services/voice';

interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface OnboardingFlowProps {
  messages: Message[];
}

export default function OnboardingFlow({ messages }: OnboardingFlowProps) {
  const [amplitude, setAmplitude] = useState(0);
  const [spokenIndex, setSpokenIndex] = useState(-1);
  const voice = VoiceService.getInstance();

  useEffect(() => {
    const nextIndex = messages.findIndex(
      (m, i) => i > spokenIndex && m.role === 'ai'
    );
    if (nextIndex !== -1) {
      voice.speak(messages[nextIndex].text, {
        onAmplitude: setAmplitude,
        onDone: () => {
          setAmplitude(0);
          setSpokenIndex(nextIndex);
        },
      });
    }
  }, [messages, spokenIndex]);

  useEffect(() => {
    return () => {
      voice.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <AuroraSphere amplitude={amplitude} />
      <View style={styles.messages}>
        {messages.map((m) => (
          <Text key={m.id} style={styles.messageText}>
            {m.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
});
