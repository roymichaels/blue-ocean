import React, { useState } from 'react';
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
import bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';
import { getPublicKey, utils as edUtils } from '@noble/ed25519';
import { useTheme } from '../../contexts/ThemeContext';
import { saveConfigValue } from '../../utils/config';
import { store } from '../../lib/memoryStore';
import InfoModal from '../../components/InfoModal';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function OnboardingScreen() {
  const { colors } = useTheme();
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
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const { refreshOnboardingStatus } = useOnboarding();

  const handleSubmit = async () => {
    if (!appName || !adminUser || !adminPass) {
      setInfo({
        visible: true,
        title: 'Error',
        message: 'App name, admin username and password are required',
        type: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await saveConfigValue('EXPO_PUBLIC_TENANT', tenant);
      await saveConfigValue('EXPO_PUBLIC_ADMIN_USERNAME', adminUser);
      await saveConfigValue('APP_NAME', appName);
      await saveConfigValue('PRIMARY_COLOR', primaryColor);
      if (logo) await saveConfigValue('APP_LOGO', logo);
      if (pinataJwt) await saveConfigValue('EXPO_PUBLIC_PINATA_JWT', pinataJwt);
      if (pinataApiKey)
        await saveConfigValue('EXPO_PUBLIC_PINATA_API_KEY', pinataApiKey);
      if (pinataSecret)
        await saveConfigValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', pinataSecret);
      if (moonpayKey) await saveConfigValue('MOONPAY_KEY', moonpayKey);
      if (chatSecret) await saveConfigValue('EXPO_PUBLIC_CHAT_SECRET', chatSecret);
      if (wakuSecret) await saveConfigValue('EXPO_PUBLIC_WAKU_SECRET', wakuSecret);

      const hash = await bcrypt.hash(adminPass, 10);
      const id = `admin_${Date.now()}`;
      const priv = edUtils.randomPrivateKey();
      const pub = await getPublicKey(priv);
      await SecureStore.setItemAsync('ed25519_private_key', edUtils.bytesToHex(priv));
      store.users.set(id, {
        id,
        username: adminUser,
        passwordHash: hash,
        displayName: 'Admin',
        role: 'admin',
        publicKey: edUtils.bytesToHex(pub),
      });
      store.userProfiles.set(id, {
        id,
        tenant_id: tenant,
        username: adminUser,
        displayName: 'Admin',
        role: 'admin',
        publicKey: edUtils.bytesToHex(pub),
      });

      await saveConfigValue('ONBOARD_COMPLETE', 'true');
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
            <Text style={[styles.label, { color: colors.text.primary }]}>Admin Username *</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={adminUser} onChangeText={setAdminUser} autoCapitalize="none" />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text.primary }]}>Admin Password *</Text>
            <TextInput style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.surface.primary }]} value={adminPass} onChangeText={setAdminPass} secureTextEntry autoCapitalize="none" />
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
