import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useWallet } from '@/contexts/WalletProvider';
import { chainAdapter } from '@/services/chain';
import { Heading, Text, Card, Button } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { routes } from '@/utils/routes';
import { listStores } from '@/features/stores/services/nearStores';
import { Store } from '@/types';
import { useNotificationActions } from '@/components/NotificationContext';
import { prefetchStoreBundle } from '@/features/stores/services/prefetch';
import { useAppRouter } from '@/src/services/useAppRouter';

function formatNearYocto(yocto: string): string {
  // Format a yoctoNEAR string to NEAR with 5 decimals using string math only (Hermes-safe)
  if (!yocto) return '0.00000';
  const s = String(yocto).replace(/^0+/, '') || '0';
  const decimals = 24;
  const show = 5;
  if (s === '0') return '0.00000';
  if (s.length <= decimals) {
    const frac = s.padStart(decimals, '0').slice(0, show);
    return `0.${frac}`;
  }
  const whole = s.slice(0, s.length - decimals) || '0';
  const fracFull = s.slice(s.length - decimals).padEnd(decimals, '0');
  const frac = fracFull.slice(0, show);
  return `${whole}.${frac}`;
}

export default function ProfileOverview() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const { push /*, replace */ } = useAppRouter();
  const { showNotification } = useNotificationActions();

  const [balance, setBalance] = useState<string>('0');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const amt = await chainAdapter.getBalance(address);
      setBalance(amt);
      const all = await listStores('default');
      setStores(all.filter((s) => s.owner === address));
      // NFTs: disabled by default to avoid web bundle issues. Enable behind a flag in the future.
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) void load();
  }, [address, load]);

  const repAvg = useMemo(() => {
    if (stores.length === 0) return 0;
    const sum = stores.reduce((acc, s) => acc + (s.reputation || 0), 0);
    return Math.round((sum / stores.length) * 10) / 10; // 1 decimal
  }, [stores]);

  if (!address) {
    return (
      <Card>
        <Stack gap="spacer8">
          <Heading size="md">{t('profile.guest', 'Guest')}</Heading>
          <Text>{t('auth.not_connected', 'Not connected')}</Text>
          <TouchableOpacity
            onPress={connect}
            style={[styles.btn, { backgroundColor: colors.gold }]}
          >
            <Text style={{ color: colors.text.inverse }}>
              {t('auth.login', 'Login')}
            </Text>
          </TouchableOpacity>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="spacer16">
      <Card>
        <Stack gap="spacer8">
          <Heading size="md">{t('profile.wallet', 'Wallet')}</Heading>
          <Text>{address}</Text>
          <Text>
            {t('profile.balance', 'Balance')}: {formatNearYocto(balance)} NEAR
          </Text>
          <TouchableOpacity
            onPress={load}
            style={[
              styles.btn,
              {
                backgroundColor: colors.surface.secondary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Text style={{ color: colors.text.primary }}>
              {t('common.reload', 'Reload')}
            </Text>
          </TouchableOpacity>
        </Stack>
      </Card>

      <Card>
        <Stack gap="spacer8">
          <Heading size="md">{t('profile.reputation', 'Reputation')}</Heading>
          <Text>
            {t('profile.reputationScore', 'Average store reputation')}:{' '}
            {repAvg.toFixed(1)}
          </Text>
        </Stack>
      </Card>

      <Card>
        <Stack gap="spacer8">
          <Heading size="md">{t('profile.myStores', 'My Stores')}</Heading>
          {stores.length === 0 ? (
            <Text>{t('profile.noStores', 'No stores yet')}</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {stores.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => push(`/store/${s.id}/admin`)}
                  onPressIn={() => prefetchStoreBundle(s.id)}
                  // @ts-ignore RNW
                  onMouseEnter={() => prefetchStoreBundle(s.id)}
                  style={[
                    styles.storeRow,
                    { borderColor: colors.border.primary },
                  ]}
                >
                  <Text style={{ color: colors.text.primary, flex: 1 }}>
                    {s.name} ({s.id})
                  </Text>
                  <Text style={{ color: colors.gold }}>
                    {(s.reputation || 0).toFixed?.(1) ?? s.reputation}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {process.env.NODE_ENV !== 'production' && (
            <TouchableOpacity
              onPress={() => {
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    const toRemove: string[] = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                      const k = window.localStorage.key(i);
                      if (!k) continue;
                      if (k.startsWith('kv:')) toRemove.push(k);
                    }
                    toRemove.forEach((k) => window.localStorage.removeItem(k));
                    showNotification(
                      'Dev Data',
                      'Local KV cleared. Reload to apply.',
                      'info'
                    );
                  }
                } catch {}
              }}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.surface.secondary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <Text style={{ color: colors.text.primary }}>
                {t('profile.resetDevData', 'Reset Dev Data')}
              </Text>
            </TouchableOpacity>
          )}
        </Stack>
      </Card>
      <Card>
        <Stack gap="spacer8">
          <Heading size="md">{t('profile.quickActions', 'Quick actions')}</Heading>
          <Button title={t('navigation.orders', 'Orders')} onPress={handleViewOrders} />
          <Button title={t('navigation.settings', 'Settings')} onPress={handleOpenSettings} />
          {primaryStore ? (
            <Button title={t('admin.dashboard', 'Store admin')} onPress={handleManageStore} />
          ) : null}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  storeRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
