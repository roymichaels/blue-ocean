import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppRouter from 'hooks/useAppRouter';
import ProofUploader from '../../components/ProofUploader';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import usersAgent from '../../agents/users-agent';
import ErrorBoundary from '@shared/ErrorBoundary';

export default function KycScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [docUri, setDocUri] = useState('');
  const { back } = useAppRouter();

  const submit = async () => {
    if (!user || !docUri) return;
    await usersAgent.handleMessage({
      type: 'kyc.request',
      payload: { userId: user.id, documentUri: docUri },
    });
    back();
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>KYC Verification</Text>
          <Text style={[styles.description, { color: colors.text.secondary }]}>Upload a document for verification.</Text>
          <ProofUploader jobId={`kyc_${user?.id || 'unknown'}`} onUploaded={setDocUri} />
          <Button
            title="Submit"
            onPress={submit}
            disabled={!docUri}
            style={{ marginTop: 24, paddingHorizontal: 24 }}
          />
        </View>
      </SafeAreaView>
    </ErrorBoundary>
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
});
