import React, { forwardRef, useImperativeHandle } from 'react';
import renderer, { act } from 'react-test-renderer';
import { I18nManager } from 'react-native';
import { LaunchGateProvider, useLaunchGate, COOLDOWN_MS, IDLE_MS } from '@/features/launchGate';
import WalletContext from '@/contexts/WalletProvider';
import { hashPin, setPinHash, enableBiometric as persistBiometric } from '@/features/launchGate/keystore';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuth from 'expo-local-authentication';

const walletValue = {
  address: 'tester.near',
  connect: jest.fn(async () => {}),
  disconnect: jest.fn(async () => {}),
  sign: jest.fn(async () => 'signature'),
  fetchRole: jest.fn(async () => null),
};

const Harness = forwardRef((_, ref) => {
  const ctx = useLaunchGate();
  useImperativeHandle(ref, () => ctx, [ctx]);
  return null;
});
Harness.displayName = 'LaunchGateHarness';

function renderLaunchGate(ref: React.RefObject<ReturnType<typeof useLaunchGate>>) {
  return renderer.create(
    <WalletContext.Provider value={walletValue as any}>
      <LaunchGateProvider>
        <Harness ref={ref} />
      </LaunchGateProvider>
    </WalletContext.Provider>,
  );
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitForReady(ref: React.RefObject<ReturnType<typeof useLaunchGate>>) {
  const start = Date.now();
  while (!ref.current?.ready) {
    if (Date.now() - start > 2000) {
      throw new Error('LaunchGate did not become ready');
    }
    await flushMicrotasks();
  }
}

describe('LaunchGateProvider', () => {
  beforeEach(() => {
    (SecureStore as any).__reset?.();
    (LocalAuth as any).__reset?.();
    jest.useRealTimers();
    walletValue.sign.mockClear();
  });

  it('handles PIN failures and engages cooldown on fifth attempt', async () => {
    jest.useFakeTimers();
    const hashed = await hashPin('123456');
    await setPinHash(hashed);
    const ref = React.createRef<ReturnType<typeof useLaunchGate>>();
    const tree = renderLaunchGate(ref);
    await waitForReady(ref);

    expect(ref.current?.locked).toBe(true);

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        const result = await ref.current!.enterPin('000000');
        expect(result.ok).toBe(false);
      });
    }
    expect(ref.current?.cooldownEndsAt).toBeNull();

    await act(async () => {
      const result = await ref.current!.enterPin('000000');
      expect(result.ok).toBe(false);
    });
    expect(ref.current?.cooldownEndsAt).not.toBeNull();

    const cooldownTarget = ref.current?.cooldownEndsAt ?? 0;
    await act(async () => {
      const result = await ref.current!.enterPin('123456');
      expect(result.ok).toBe(false);
    });

    jest.advanceTimersByTime(COOLDOWN_MS);
    await flushMicrotasks();

    expect(ref.current?.cooldownEndsAt).toBeNull();
    expect(ref.current?.failureCount).toBeGreaterThan(0);

    await act(async () => {
      const result = await ref.current!.enterPin('123456');
      expect(result.ok).toBe(true);
    });
    expect(ref.current?.locked).toBe(false);
    expect(ref.current?.lastUnlockAt).toBeGreaterThanOrEqual(cooldownTarget);

    tree.unmount();
    jest.useRealTimers();
  });

  it('auto locks after idle period', async () => {
    jest.useFakeTimers();
    const hashed = await hashPin('654321');
    await setPinHash(hashed);
    const ref = React.createRef<ReturnType<typeof useLaunchGate>>();
    const tree = renderLaunchGate(ref);
    await waitForReady(ref);

    await act(async () => {
      await ref.current!.enterPin('654321');
    });
    expect(ref.current?.locked).toBe(false);

    ref.current?.recordActivity();
    jest.advanceTimersByTime(IDLE_MS - 1000);
    expect(ref.current?.locked).toBe(false);

    jest.advanceTimersByTime(2000);
    await flushMicrotasks();
    expect(ref.current?.locked).toBe(true);

    tree.unmount();
    jest.useRealTimers();
  });

  it('starts pin reset via biometrics and falls back to wallet signature', async () => {
    const hashed = await hashPin('111222');
    await setPinHash(hashed);
    await persistBiometric(true);
    (LocalAuth as any).__queueAuthenticate?.({ success: true });

    const ref = React.createRef<ReturnType<typeof useLaunchGate>>();
    const tree = renderLaunchGate(ref);
    await waitForReady(ref);

    await act(async () => {
      const result = await ref.current!.startPinReset();
      expect(result).toBe('reset.started');
    });
    expect(ref.current?.enrolling).toBe(true);
    tree.unmount();

    (SecureStore as any).__reset?.();
    (LocalAuth as any).__reset?.();
    await setPinHash(hashed);
    await persistBiometric(true);
    (LocalAuth as any).__queueAuthenticate?.({ success: false });

    const wallet = {
      ...walletValue,
      address: 'tester.near',
      sign: jest.fn(async () => 'signature'),
    };

    const secondRef = React.createRef<ReturnType<typeof useLaunchGate>>();
    const secondTree = renderer.create(
      <WalletContext.Provider value={wallet as any}>
        <LaunchGateProvider>
          <Harness ref={secondRef} />
        </LaunchGateProvider>
      </WalletContext.Provider>,
    );
    await waitForReady(secondRef);

    await act(async () => {
      const result = await secondRef.current!.startPinReset();
      expect(result).toBe('reset.started');
    });
    expect(wallet.sign).toHaveBeenCalled();
    secondTree.unmount();
  });

  it('renders keypad in RTL order with accessible labels', async () => {
    const originalRTL = I18nManager.isRTL;
    I18nManager.isRTL = true;
    const hashed = await hashPin('222333');
    await setPinHash(hashed);
    const ref = React.createRef<ReturnType<typeof useLaunchGate>>();
    const tree = renderLaunchGate(ref);
    await waitForReady(ref);

    await act(async () => {
      ref.current!.beginEnrollment('reset');
    });
    await flushMicrotasks();

    const nodes = tree.root.findAll((node) =>
      typeof node.props?.testID === 'string' && node.props.testID.startsWith('launch-pin-digit-'),
    );
    const digitOrder = nodes.map((node) => node.props.testID.replace('launch-pin-digit-', ''));
    expect(digitOrder).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    const labels = nodes.map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual([
      'Digit 1',
      'Digit 2',
      'Digit 3',
      'Digit 4',
      'Digit 5',
      'Digit 6',
      'Digit 7',
      'Digit 8',
      'Digit 9',
      'Digit 0',
    ]);

    tree.unmount();
    I18nManager.isRTL = originalRTL;
  });
});
