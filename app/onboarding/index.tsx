import React, { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfig } from '../../contexts/ConfigContext';
import InfoModal from '../../components/InfoModal';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { config, setValue } = useConfig();
  const [tenant, setTenant] = useState('thecongress');
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logo, setLogo] = useState('');
  const [pinataJwt, setPinataJwt] = useState('');
  const [pinataApiKey, setPinataApiKey] = useState('');
  const [pinataSecret, setPinataSecret] = useState('');
  const [moonpayKey, setMoonpayKey] = useState('');
  const [chatSecret, setChatSecret] = useState('');
  const [wakuSecret, setWakuSecret] = useState('');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const { refreshOnboardingStatus } = useOnboarding();

  useEffect(() => {
    if (!config.EXPO_PUBLIC_JWT_SECRET) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const secret = Buffer.from(bytes).toString('hex');
      setValue('EXPO_PUBLIC_JWT_SECRET', secret);
    }
  }, []);

  const handleSubmit = async () => {
    if (!appName) {
      setInfo({
        visible: true,
        title: 'Error',
        message: 'App name is required',
        type: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      setValue('EXPO_PUBLIC_TENANT', tenant);
      if (user?.username) {
        setValue('EXPO_PUBLIC_ADMIN_USERNAME', user.username);
      }
      setValue('APP_NAME', appName);
      setValue('PRIMARY_COLOR', primaryColor);
      if (logo) setValue('APP_LOGO', logo);
      if (pinataJwt) setValue('EXPO_PUBLIC_PINATA_JWT', pinataJwt);
      if (pinataApiKey) setValue('EXPO_PUBLIC_PINATA_API_KEY', pinataApiKey);
      if (pinataSecret) setValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', pinataSecret);
      if (moonpayKey) setValue('MOONPAY_KEY', moonpayKey);
      if (chatSecret) setValue('EXPO_PUBLIC_CHAT_SECRET', chatSecret);
      if (wakuSecret) setValue('EXPO_PUBLIC_WAKU_SECRET', wakuSecret);

      setValue('ONBOARD_COMPLETE', 'true');
      await refreshOnboardingStatus();
      setInfo({
        visible: true,
        title: 'Success',
        message: 'Setup complete',
        type: 'success',
      });
    } catch (e) {
      console.error('Onboarding failed', e);
      setInfo({
        visible: true,
        title: 'Error',
        message: 'Failed to save settings',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onCloseModal = () => {
    setInfo({ ...info, visible: false });
    if (info.type === 'success') {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Initial Setup</Text>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>App Name *</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={appName} onChangeText={setAppName} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Tenant ID (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border.primary,
                  color: colors.text.primary,
                  backgroundColor: colors.surface.primary,
                },
              ]}
              value={tenant}
              onChangeText={setTenant}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Primary Color (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={primaryColor} onChangeText={setPrimaryColor} placeholder="#B99C5A" />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Logo URL (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={logo} onChangeText={setLogo} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Pinata JWT (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={pinataJwt} onChangeText={setPinataJwt} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Pinata API Key (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={pinataApiKey} onChangeText={setPinataApiKey} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Pinata Secret Key (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={pinataSecret} onChangeText={setPinataSecret} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>MoonPay Key (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={moonpayKey} onChangeText={setMoonpayKey} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Chat Secret (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={chatSecret} onChangeText={setChatSecret} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Waku Secret (optional)</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={wakuSecret} onChangeText={setWakuSecret} />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Admin</Text>
            <Text style={{ color: colors.text.primary, textAlign: 'right' }}>{user?.username}</Text>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.gold }, loading && { backgroundColor: colors.interactive.disabled }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.text.inverse }]}>Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        <InfoModal
          visible={info.visible}
          title={info.title}
          message={info.message}
          type={info.type}
          onClose={onCloseModal}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { fontSize: 18, fontWeight: '600' },
});
