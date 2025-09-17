import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Switch } from 'react-native';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Card, Heading, Text, Button } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useWallet } from '@/contexts/WalletProvider';
import { useLaunchGate } from '@/features/launchGate';
import { useAppRouter } from '@/services/useAppRouter';
import { useWalletSessions } from '@/auth/wallet';
import SettingsAgent from '@/agents/settings-agent';
import { CHECKOUT_SCOPE, getSession } from '@/services/session';
import type { AdminScope } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';

const BROWSE_SCOPE = 'read';
const ADMIN_SCOPE: AdminScope = 'admin:settings';

export default function WalletSetupScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const { beginEnrollment, ready, pinSet } = useLaunchGate();
  const { replace } = useAppRouter();
  const { loginWithWallet } = useWalletSessions();
  const { sessionToken } = useAuth();
  const [checkoutSelected, setCheckoutSelected] = useState(false);
  const [adminSelected, setAdminSelected] = useState(false);
  const [adminDenied, setAdminDenied] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedScopes, setIssuedScopes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (pinSet) {
      replace('/');
    }
  }, [ready, pinSet, replace]);

  const handleConnect = async () => {
    await connect();
  };

  const handleCreatePin = () => {
    beginEnrollment('first-run');
  };

  const activeScopes = useMemo(() => {
    if (!sessionToken) return [] as string[];
    const session = getSession(sessionToken);
    return Array.isArray(session?.scopes) ? session!.scopes : [];
  }, [sessionToken]);

  const scopeLabels = useMemo(
    () => ({
      browse: t('wallet.scopeBrowse', 'Browse marketplace'),
      checkout: t('wallet.scopeCheckout', 'Checkout & payments'),
      admin: t('wallet.scopeAdmin', 'Admin tools'),
    }),
    [t],
  );

  const describeScopes = useCallback(
    (scopes: string[]): string => {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return t('wallet.noScopes', 'None');
      }
      const unique = Array.from(new Set(scopes));
      return unique
        .map((scope) => {
          if (scope === BROWSE_SCOPE) return scopeLabels.browse;
          if (scope === CHECKOUT_SCOPE) return scopeLabels.checkout;
          if (scope.startsWith('admin:')) return scopeLabels.admin;
          return scope;
        })
        .join(', ');
    },
    [scopeLabels, t],
  );

  const activeScopesSummary = useMemo(() => {
    if (activeScopes.length === 0) return null;
    return describeScopes(activeScopes);
  }, [activeScopes, describeScopes]);

  const issuedScopesSummary = useMemo(() => {
    if (!issuedScopes || issuedScopes.length === 0) return null;
    return describeScopes(issuedScopes);
  }, [describeScopes, issuedScopes]);

  const handleCheckoutToggle = useCallback((value: boolean) => {
    setCheckoutSelected(value);
    setErrorMessage(null);
  }, []);

  const handleAdminToggle = useCallback((value: boolean) => {
    setAdminSelected(value);
    setAdminDenied(false);
    setErrorMessage(null);
  }, []);

  const handleAuthorizeScopes = useCallback(async () => {
    if (!address) {
      setErrorMessage(
        t(
          'wallet.scopeConnectFirst',
          'Connect a wallet before issuing a session token.',
        ),
      );
      return;
    }
    setAuthorizing(true);
    setErrorMessage(null);
    setAdminDenied(false);
    setIssuedScopes(null);
    try {
      const scopes = new Set<string>([BROWSE_SCOPE]);
      if (checkoutSelected) scopes.add(CHECKOUT_SCOPE);
      let includeAdmin = false;
      if (adminSelected) {
        try {
          const allowed = await SettingsAgent.getInstance().hasAdminScope(
            address,
            ADMIN_SCOPE,
          );
          if (allowed) {
            scopes.add(ADMIN_SCOPE);
            includeAdmin = true;
          } else {
            setAdminDenied(true);
          }
        } catch (err) {
          setAdminDenied(true);
        }
      }

      const session = await loginWithWallet(Array.from(scopes));
      setIssuedScopes(session.scopes);
      if (adminSelected && !includeAdmin) {
        setAdminDenied(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === '{E_SCOPE}') {
        setErrorMessage(
          t(
            'wallet.scopeError',
            'The requested permissions are not available for this wallet.',
          ),
        );
      } else if (message === '{E_DEVICE_MISMATCH}') {
        setErrorMessage(
          t(
            'wallet.deviceMismatch',
            'This session belongs to a different device. Reconnect your wallet and try again.',
          ),
        );
      } else {
        setErrorMessage(
          t(
            'wallet.scopeUnknownError',
            'We were unable to issue a session token. Please try again.',
          ),
        );
      }
    } finally {
      setAuthorizing(false);
    }
  }, [
    address,
    adminSelected,
    checkoutSelected,
    loginWithWallet,
    t,
  ]);

  return (
    <ScrollArea backgroundColor={colors.canvas}>
      <Container>
        <Heading size="xl" style={{ color: colors.text.primary }}>
          {t('wallet.setupTitle', 'Secure your account')}
        </Heading>
        <Stack gap="spacer16" style={{ marginTop: 24 }}>
          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('wallet.connectHeading', 'Connect your wallet')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'wallet.connectDescription',
                  'Link your NEAR wallet to verify ownership and unlock the marketplace.',
                )}
              </Text>
              <Button onPress={handleConnect} disabled={Boolean(address)}>
                {address
                  ? t('wallet.connected', 'Wallet connected')
                  : t('wallet.connectCta', 'Connect wallet')}
              </Button>
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('wallet.scopeHeading', 'Authorize session permissions')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'wallet.scopeDescription',
                  'Choose what this device can do. Tokens expire hourly and can be reissued at any time.',
                )}
              </Text>
              <Text style={{ color: colors.text.secondary }}>
                {activeScopesSummary
                  ? t('wallet.currentScopes', { scopes: activeScopesSummary })
                  : t('wallet.noActiveScopes', 'No active session token yet.')}
              </Text>
              <Stack gap="spacer12">
                <ScopeOption
                  label={scopeLabels.browse}
                  description={t(
                    'wallet.scopeBrowseDescription',
                    'Keeps marketplace data available on this device.',
                  )}
                  value
                  disabled
                />
                <ScopeOption
                  label={scopeLabels.checkout}
                  description={t(
                    'wallet.scopeCheckoutDescription',
                    'Required to place orders and sign checkout requests from this device.',
                  )}
                  value={checkoutSelected}
                  onValueChange={handleCheckoutToggle}
                />
                <ScopeOption
                  label={scopeLabels.admin}
                  description={t(
                    'wallet.scopeAdminDescription',
                    'Manage stores and escalations. Requires admin approval.',
                  )}
                  value={adminSelected}
                  onValueChange={handleAdminToggle}
                />
              </Stack>
              {adminDenied && (
                <Text style={{ color: colors.status.warning }}>
                  {t(
                    'wallet.scopeAdminDenied',
                    'Admin access still needs approval. Shopper permissions were issued instead.',
                  )}
                </Text>
              )}
              {errorMessage && (
                <Text style={{ color: colors.status.error }}>{errorMessage}</Text>
              )}
              {issuedScopesSummary && (
                <Text style={{ color: colors.status.success }}>
                  {t('wallet.scopeSuccess', { scopes: issuedScopesSummary })}
                </Text>
              )}
              <Button
                onPress={handleAuthorizeScopes}
                disabled={!address || authorizing}
                loading={authorizing}
              >
                {t('wallet.scopeButton', 'Authorize permissions')}
              </Button>
              {!address && (
                <Text style={{ color: colors.text.secondary }}>
                  {t(
                    'wallet.scopeConnectFirst',
                    'Connect a wallet before issuing a session token.',
                  )}
                </Text>
              )}
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('wallet.pinHeading', 'Create your app PIN')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'wallet.pinDescription',
                  'Create a 6-digit PIN to protect sensitive actions like checkout and admin approvals.',
                )}
              </Text>
              <Button
                onPress={handleCreatePin}
                disabled={!address}
                accessibilityLabel={t('wallet.createPinCta', 'Create PIN')}
              >
                {t('wallet.createPinCta', 'Create PIN')}
              </Button>
              {!address && (
                <Text style={{ color: colors.text.secondary }}>
                  {t('wallet.connectFirst', 'Connect a wallet to enable PIN setup.')}
                </Text>
              )}
            </Stack>
          </Card>
        </Stack>
      </Container>
    </ScrollArea>
  );
}

interface ScopeOptionProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

function ScopeOption({ label, description, value, onValueChange, disabled }: ScopeOptionProps) {
  const { colors } = useTheme();
  return (
    <Stack
      direction="horizontal"
      align="center"
      gap="spacer16"
      style={{ paddingVertical: 12 }}
    >
      <Stack style={{ flex: 1 }} gap="spacer4">
        <Heading size="sm" style={{ color: colors.text.primary }}>
          {label}
        </Heading>
        <Text style={{ color: colors.text.secondary }}>{description}</Text>
      </Stack>
      <Switch
        accessibilityRole="switch"
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.surface.secondary,
          true: colors.interactive.primary,
        }}
        thumbColor={value ? colors.text.inverse : colors.text.secondary}
      />
    </Stack>
  );
}
