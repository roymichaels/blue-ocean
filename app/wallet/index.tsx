import React, { useEffect } from 'react';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Card, Heading, Text, Button } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useWallet } from '@/contexts/WalletProvider';
import { useLaunchGate } from '@/features/launchGate';
import { useAppRouter } from '@/services/useAppRouter';

export default function WalletSetupScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const { beginEnrollment, ready, pinSet } = useLaunchGate();
  const { replace } = useAppRouter();

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
