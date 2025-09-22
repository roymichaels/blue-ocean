import React, { useEffect, useMemo, useState } from 'react';
import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Portal, Card, Button, Heading } from '@/ui/primitives';
import { spacing, radius } from '@/ui/tokens';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import type { LaunchGateContextValue } from '../LaunchGateContext';

const PIN_LENGTH = 6;
const DIGITS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

type LaunchGateOverlayProps = LaunchGateContextValue & {
  maxFails: number;
};

function PinDisplay({ count }: { count: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pinDisplay}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => {
        const filled = index < count;
        return (
          <View
            key={`pin-slot-${index}`}
            style={[
              styles.pinDot,
              {
                borderColor: colors.border.primary,
                backgroundColor: filled ? colors.text.primary : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function LaunchGateOverlay({
  ready,
  pinSet,
  locked,
  verifying,
  enrolling,
  enrollReason,
  biometricAvailable,
  biometricEnabled,
  failureCount,
  cooldownEndsAt,
  enterPin,
  unlockWithBiometric,
  startPinReset,
  switchWallet,
  beginEnrollment,
  commitPin,
  cancelEnrollment,
  maxFails,
}: LaunchGateOverlayProps): React.ReactElement | null {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [input, setInput] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    if (!cooldownEndsAt) {
      setCooldownRemaining(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCooldownRemaining(remaining);
    };
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [cooldownEndsAt]);

  useEffect(() => {
    if (!locked && !enrolling) {
      setInput('');
      setFirstPin(null);
      setError(null);
      setSubmitting(false);
    }
  }, [locked, enrolling]);

  useEffect(() => {
    if (!pinSet && ready && !enrolling) {
      beginEnrollment('first-run');
    }
  }, [beginEnrollment, enrolling, pinSet, ready]);

  const title = useMemo(() => {
    if (enrolling) {
      if (firstPin === null) {
        return t('launch.createPinTitle', 'Create a 6-digit PIN');
      }
      return t('launch.confirmPinTitle', 'Confirm your new PIN');
    }
    return t('launch.enterPinTitle', 'Unlock with PIN');
  }, [enrolling, firstPin, t]);

  const subtitle = useMemo(() => {
    if (enrolling) {
      if (enrollReason === 'first-run') {
        return t(
          'launch.firstRunSubtitle',
          'Secure your account with a PIN before continuing.',
        );
      }
      if (firstPin === null) {
        return t('launch.resetSubtitle', 'Enter a new 6-digit PIN.');
      }
      return t('launch.confirmResetSubtitle', 'Re-enter your PIN to confirm.');
    }
    return t('launch.enterPinDescription', 'Enter your 6-digit PIN to continue.');
  }, [enrolling, enrollReason, firstPin, t]);

  const shouldShow = ready && ((locked && verifying) || enrolling);
  if (!shouldShow) return null;

  const disableInputs = submitting || (cooldownRemaining > 0 && verifying);

  const handleDigitPress = (digit: string) => {
    if (disableInputs) return;
    setInput((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      return prev + digit;
    });
  };

  const handleDelete = () => {
    if (disableInputs) return;
    setInput((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (disableInputs) return;
    if (input.length !== PIN_LENGTH) return;
    setSubmitting(true);
    try {
      if (enrolling) {
        if (firstPin === null) {
          setFirstPin(input);
          setInput('');
          setError(null);
          return;
        }
        if (firstPin !== input) {
          setError(t('launch.pinMismatch', 'PINs do not match. Try again.'));
          setFirstPin(null);
          setInput('');
          return;
        }
        await commitPin(input);
        setFirstPin(null);
        setInput('');
        setError(null);
        return;
      }
      const result = await enterPin(input);
      if (!result.ok) {
        setError(
          cooldownRemaining > 0
            ? t('launch.cooldownActive', 'Too many attempts. Please wait.')
            : t('launch.invalidPin', 'Incorrect PIN. Try again.'),
        );
        setInput('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometric = async () => {
    if (disableInputs) return;
    setSubmitting(true);
    try {
      await unlockWithBiometric();
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPin = async () => {
    setInput('');
    setFirstPin(null);
    setError(null);
    await startPinReset();
  };

  return (
    <Portal>
      <View style={styles.backdrop}>
        <Card
          style={[styles.sheet, { backgroundColor: colors.surface.primary }]}
          accessibilityRole="dialog"
          accessibilityLabel={title}
        >
          <Heading size="lg" style={{ color: colors.text.primary }}>
            {title}
          </Heading>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {subtitle}
          </Text>
          <PinDisplay count={input.length} />
          {failureCount > 0 && verifying && (
            <Text style={[styles.attempts, { color: colors.text.secondary }]}>
              {t('launch.attemptsLeft', {
                defaultValue: 'Attempts left: {{count}}',
                count: Math.max(0, maxFails - failureCount),
              })}
            </Text>
          )}
          {error && (
            <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
          )}
          {cooldownRemaining > 0 && verifying && (
            <Text style={{ color: colors.text.secondary }}>
              {t('launch.cooldownMessage', {
                defaultValue: 'Try again in {{seconds}}s',
                seconds: cooldownRemaining,
              })}
            </Text>
          )}
          <View style={styles.keypad}>
            {DIGITS.map((digit) => (
              <TouchableOpacity
                key={`digit-${digit}`}
                style={[styles.key, { borderColor: colors.border.secondary }]}
                onPress={() => handleDigitPress(digit)}
                disabled={disableInputs}
                accessibilityLabel={t('launch.digitLabel', {
                  defaultValue: 'Digit {{digit}}',
                  digit,
                })}
                testID={`launch-pin-digit-${digit}`}
              >
                <Text style={[styles.keyText, { color: colors.text.primary }]}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={disableInputs || input.length === 0}
              accessibilityLabel={t('launch.delete', 'Delete digit')}
              style={[styles.secondaryButton, { borderColor: colors.border.primary }]}
              testID="launch-pin-delete"
            >
              <Text style={{ color: colors.text.primary }}>
                {t('launch.delete', 'Delete digit')}
              </Text>
            </TouchableOpacity>
            <Button
              onPress={handleSubmit}
              disabled={disableInputs || input.length !== PIN_LENGTH}
              loading={submitting}
              accessibilityLabel={
                enrolling
                  ? t('launch.savePin', 'Save PIN')
                  : t('launch.submit', 'Submit PIN')
              }
            >
              {enrolling
                ? t('launch.savePin', 'Save PIN')
                : t('launch.submit', 'Submit PIN')}
            </Button>
          </View>
          {biometricAvailable && biometricEnabled && (
            <Button
              onPress={handleBiometric}
              disabled={submitting}
              style={styles.biometricButton}
              accessibilityLabel={t('launch.biometric', 'Use biometric unlock')}
              testID="launch-pin-biometric"
            >
              {t('launch.biometric', 'Use biometric unlock')}
            </Button>
          )}
          <TouchableOpacity
            onPress={handleForgotPin}
            style={styles.link}
            accessibilityRole="button"
            testID="launch-pin-forgot"
          >
            <Text style={[styles.linkText, { color: colors.link }]}>
              {t('launch.forgotPin', 'Forgot PIN?')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchWallet}
            style={styles.link}
            accessibilityRole="button"
            testID="launch-pin-switch"
          >
            <Text style={[styles.linkText, { color: colors.link }]}>
              {t('launch.switchAccount', 'Switch account')}
            </Text>
          </TouchableOpacity>
          {enrolling && pinSet && (
            <TouchableOpacity
              onPress={cancelEnrollment}
              style={styles.link}
              accessibilityRole="button"
              testID="launch-pin-cancel-enroll"
            >
              <Text style={[styles.linkText, { color: colors.text.secondary }]}>
                {t('launch.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spacer20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.md,
    padding: spacing.spacer20,
    gap: spacing.spacer16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  pinDisplay: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    gap: spacing.spacer12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  attempts: {
    textAlign: 'center',
    fontSize: 12,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.spacer12,
  },
  key: {
    width: 72,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  keyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.spacer12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.spacer12,
    alignItems: 'center',
  },
  biometricButton: {
    marginTop: spacing.spacer8,
  },
  link: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
