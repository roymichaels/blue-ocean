import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Text from '@/ui/primitives/Text';
import Button from '@/ui/primitives/Button';
import { Server } from 'lucide-react-native';
import Card from '../Card';
import SettingsAgent from '../../agents/settings-agent';
import { errorLog } from '@/utils/logger';

interface Props {
  colors: any;
}

const RpcSettings: React.FC<Props> = ({ colors }) => {
  const [rpcUrl, setRpcUrl] = useState('');
  const [fallbacks, setFallbacks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { rpcUrl, rpcFallbackUrls } = await SettingsAgent.getInstance().getRpcUrls();
        setRpcUrl(rpcUrl);
        setFallbacks(rpcFallbackUrls.join(', '));
      } catch (err) {
        errorLog('Failed to load RPC URLs:', err);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const urls = fallbacks
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      await SettingsAgent.getInstance().setRpcUrls(rpcUrl.trim(), urls);
    } catch (err) {
      errorLog('Failed to save RPC URLs:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <View style={styles.header}>
        <Server size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>RPC Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Primary RPC URL</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={rpcUrl}
            onChangeText={setRpcUrl}
            placeholder="https://near.example"
            textAlign="left"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Fallback RPC URLs</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border.primary,
                backgroundColor: colors.surface.secondary,
                color: colors.text.primary,
              },
            ]}
            value={fallbacks}
            onChangeText={setFallbacks}
            placeholder="https://near1.example, https://near2.example"
            textAlign="left"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <Button
          title="Save RPC URLs"
          onPress={save}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.gold }]}
          textStyle={[styles.saveButtonText, { color: colors.text.inverse }]}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RpcSettings;
