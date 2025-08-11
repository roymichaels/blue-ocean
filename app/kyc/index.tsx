import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ProofUploader from '../../components/ProofUploader';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import usersAgent from '../../agents/users-agent';

export default function KycScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [docUri, setDocUri] = useState('');

  const submit = async () => {
    if (!user || !docUri) return;
    await usersAgent.requestKyc(user.id, docUri);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>KYC Verification</Text>
        <Text style={[styles.description, { color: colors.text.secondary }]}>Upload a document for verification.</Text>
        <ProofUploader jobId={`kyc_${user?.id || 'unknown'}`} onUploaded={setDocUri} />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.gold }]}
          onPress={submit}
          disabled={!docUri}
        >
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
