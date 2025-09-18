import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useWallet } from '@/contexts/WalletProvider';
import { useAppRouter } from '@/services/useAppRouter';
import { useNotificationActions } from '@/components/NotificationContext';
import { sessionEvents } from '@/services/session';
import { queryClient } from '@/providers/queryClient';
import {
  clearSessionState,
  enableBiometric as persistBiometric,
  getLastActiveAt,
  getPinHash,
  hashPin,
  isBiometricEnabled as loadBiometricEnabled,
  setLastActiveAt,
  setPinHash,
  verifyPin,
} from './keystore';
import LaunchGateOverlay from './components/LaunchGateOverlay';

export const MAX_FAILS = 5;
export const COOLDOWN_MS = 30_000;
export const IDLE_MS = 30 * 60_000;
const STEP_UP_WINDOW_MS = 5 * 60_000;

export type StepUpAction =
  | 'checkout'
  | 'admin.approval'
  | 'order.cancel'
  | 'order.fulfill'
  | 'billing.viewFees';

type EnrollReason = 'first-run' | 'reset' | null;

export interface LaunchGateContextValue {
  ready: boolean;
  pinSet: boolean;
  locked: boolean;
  verifying: boolean;
  enrolling: boolean;
  enrollReason: EnrollReason;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  failureCount: number;
  cooldownEndsAt: number | null;
  lastUnlockAt: number | null;
  requireUnlock: (action: StepUpAction) => Promise<void>;
  recordActivity: () => void;
  enterPin: (pin: string) => Promise<{ ok: boolean }>;
  unlockWithBiometric: () => Promise<boolean>;
  startPinReset: () => Promise<'reset.started'>;
  switchWallet: () => Promise<void>;
  enableBiometric: (enabled: boolean) => Promise<void>;
  beginEnrollment: (reason?: 'first-run' | 'reset') => void;
  commitPin: (pin: string) => Promise<void>;
  cancelEnrollment: () => void;
}

const LaunchGateContext = createContext<LaunchGateContextValue | undefined>(
  undefined,
);

function useLaunchGateInternal(): LaunchGateContextValue {
  const ctx = useContext(LaunchGateContext);
  if (!ctx) {
    throw new Error('useLaunchGate must be used within LaunchGateProvider');
  }
  return ctx;
}

export function useLaunchGate(): LaunchGateContextValue {
  return useLaunchGateInternal();
}

function isAuthModuleAvailable() {
  return (
    typeof LocalAuthentication?.hasHardwareAsync === 'function' &&
    typeof LocalAuthentication?.isEnrolledAsync === 'function'
  );
}

async function detectBiometricAvailability(): Promise<boolean> {
  if (!isAuthModuleAvailable()) return false;
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return Boolean(hardware && enrolled);
  } catch {
    return false;
  }
}

export function LaunchGateProvider({
  children,
}: React.PropsWithChildren): React.ReactElement {
  const [ready, setReady] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<'verify' | 'enroll' | null>(null);
  const [enrollReason, setEnrollReason] = useState<EnrollReason>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lastUnlockAt, setLastUnlockAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  const pinHashRef = useRef<string | null>(null);
  const lastActiveRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingResolvers = useRef<(() => void)[]>([]);
  const lockedRef = useRef(false);
  const cooldownRef = useRef<number | null>(null);
  const lastUnlockRef = useRef<number | null>(null);

  const { address, connect, disconnect, sign } = useWallet();
  const { replace } = useAppRouter();
  const { showNotification } = useNotificationActions();

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    cooldownRef.current = cooldownEndsAt;
  }, [cooldownEndsAt]);

  const recordActivity = useCallback(() => {
    if (!pinHashRef.current) return;
    const now = Date.now();
    lastActiveRef.current = now;
    void setLastActiveAt(now);
    // trigger renders relying on derived values
    forceTick((value) => value + 1);
  }, []);

  const applyLock = useCallback(
    (reason: 'idle' | 'manual' | 'step-up' | 'launch' | 'switch-wallet') => {
      if (!pinHashRef.current) return;
      if (!lockedRef.current) {
        sessionEvents.emit('session.locked', { reason });
      }
      setLocked(true);
      setMode('verify');
    },
    [],
  );

  const completeUnlock = useCallback(() => {
    const now = Date.now();
    setLocked(false);
    setMode(null);
    setFailureCount(0);
    setCooldownEndsAt(null);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    lastUnlockRef.current = now;
    setLastUnlockAt(now);
    sessionEvents.emit('session.unlocked', { timestamp: now });
    lastActiveRef.current = now;
    void setLastActiveAt(now);
    pendingResolvers.current.forEach((resolve) => resolve());
    pendingResolvers.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hash, biometricFlag, lastActive] = await Promise.all([
        getPinHash(),
        loadBiometricEnabled(),
        getLastActiveAt(),
      ]);
      if (cancelled) return;
      pinHashRef.current = hash;
      setPinSet(Boolean(hash));
      setBiometricEnabled(biometricFlag);
      if (typeof lastActive === 'number') {
        lastActiveRef.current = lastActive;
      }
      if (hash) {
        const now = Date.now();
        if (!lastActive || now - lastActive >= IDLE_MS) {
          applyLock('launch');
        } else {
          lastUnlockRef.current = lastActive;
          setLastUnlockAt(lastActive);
        }
      }
      const available = await detectBiometricAvailability();
      if (!cancelled) setBiometricAvailable(available);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [applyLock]);

  useEffect(() => {
    if (!pinHashRef.current) return undefined;
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    idleTimerRef.current = setInterval(() => {
      if (!pinHashRef.current) return;
      if (lockedRef.current) return;
      const lastActive = lastActiveRef.current;
      if (!lastActive) return;
      const now = Date.now();
      if (now - lastActive >= IDLE_MS) {
        applyLock('idle');
      }
    }, 1000);
    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [applyLock]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        const lastActive = lastActiveRef.current;
        const now = Date.now();
        if (pinHashRef.current && lastActive && now - lastActive >= IDLE_MS) {
          applyLock('idle');
        }
      } else if (state === 'background') {
        if (pinHashRef.current) {
          recordActivity();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [applyLock, recordActivity]);

  const enterPin = useCallback(
    async (pin: string) => {
      if (!pinHashRef.current) {
        return { ok: false };
      }
      const now = Date.now();
      const cooldownActive = cooldownRef.current && now < cooldownRef.current;
      if (cooldownActive) {
        return { ok: false };
      }
      const ok = await verifyPin(pin);
      if (ok) {
        completeUnlock();
        return { ok: true };
      }
      setFailureCount((current) => {
        const next = current + 1;
        if (next >= MAX_FAILS) {
          const until = Date.now() + COOLDOWN_MS;
          setCooldownEndsAt(until);
          if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
          cooldownTimerRef.current = setTimeout(() => {
            setCooldownEndsAt(null);
            cooldownTimerRef.current = null;
          }, COOLDOWN_MS);
        }
        return next;
      });
      sessionEvents.emit('session.locked', { reason: 'failed-pin' });
      return { ok: false };
    },
    [completeUnlock],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!biometricEnabled || !biometricAvailable) return false;
    if (!isAuthModuleAvailable()) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Blue Ocean',
        disableDeviceFallback: false,
      });
      if (result.success) {
        completeUnlock();
        return true;
      }
    } catch {}
    return false;
  }, [biometricAvailable, biometricEnabled, completeUnlock]);

  const beginEnrollment = useCallback((reason: 'first-run' | 'reset' = 'reset') => {
    setEnrollReason(reason);
    setMode('enroll');
    setLocked(false);
  }, []);

  const commitPin = useCallback(
    async (pin: string) => {
      const hash = await hashPin(pin);
      await setPinHash(hash);
      pinHashRef.current = hash;
      setPinSet(true);
      setEnrollReason(null);
      completeUnlock();
    },
    [completeUnlock],
  );

  const cancelEnrollment = useCallback(() => {
    setEnrollReason(null);
    if (pinHashRef.current) {
      applyLock('manual');
    } else {
      setMode(null);
    }
  }, [applyLock]);

  const startPinReset = useCallback(async (): Promise<'reset.started'> => {
    if (!pinHashRef.current) {
      beginEnrollment('reset');
      return 'reset.started';
    }
    if (biometricEnabled && biometricAvailable && isAuthModuleAvailable()) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify to reset PIN',
          disableDeviceFallback: false,
        });
        if (result.success) {
          beginEnrollment('reset');
          return 'reset.started';
        }
      } catch {}
    }
    try {
      if (!address) {
        await connect();
      }
      await sign(`blue-ocean:reset-pin:${Date.now()}`);
      beginEnrollment('reset');
      return 'reset.started';
    } catch (err) {
      showNotification(
        'Security',
        'Wallet signature required to reset PIN.',
        'error',
      );
      throw err;
    }
  }, [
    address,
    biometricAvailable,
    biometricEnabled,
    beginEnrollment,
    connect,
    showNotification,
    sign,
  ]);

  const switchWallet = useCallback(async () => {
    try {
      await disconnect();
    } catch {}
    queryClient.clear();
    pendingResolvers.current = [];
    await clearSessionState();
    lastActiveRef.current = null;
    lastUnlockRef.current = null;
    setLastUnlockAt(null);
    if (pinHashRef.current) {
      applyLock('switch-wallet');
    }
    try {
      replace('/wallet');
    } catch {}
  }, [applyLock, disconnect, replace]);

  const enableBiometric = useCallback(
    async (enabled: boolean) => {
      if (enabled && !biometricAvailable) {
        throw new Error('Biometric authentication not available');
      }
      await persistBiometric(enabled);
      setBiometricEnabled(enabled);
    },
    [biometricAvailable],
  );

  const requireUnlock = useCallback(
    async (action: StepUpAction) => {
      if (!pinHashRef.current) return;
      const now = Date.now();
      const last = lastUnlockRef.current;
      if (!lockedRef.current && last && now - last <= STEP_UP_WINDOW_MS) {
        return;
      }
      if (lockedRef.current) {
        await new Promise<void>((resolve) => {
          pendingResolvers.current.push(resolve);
        });
        return;
      }
      await new Promise<void>((resolve) => {
        pendingResolvers.current.push(resolve);
        applyLock('step-up');
      });
    },
    [applyLock],
  );

  const contextValue = useMemo<LaunchGateContextValue>(
    () => ({
      ready,
      pinSet,
      locked,
      verifying: mode === 'verify',
      enrolling: mode === 'enroll',
      enrollReason,
      biometricAvailable,
      biometricEnabled,
      failureCount,
      cooldownEndsAt,
      lastUnlockAt,
      requireUnlock,
      recordActivity,
      enterPin,
      unlockWithBiometric,
      startPinReset,
      switchWallet,
      enableBiometric,
      beginEnrollment,
      commitPin,
      cancelEnrollment,
    }),
    [
      ready,
      pinSet,
      locked,
      mode,
      enrollReason,
      biometricAvailable,
      biometricEnabled,
      failureCount,
      cooldownEndsAt,
      lastUnlockAt,
      requireUnlock,
      recordActivity,
      enterPin,
      unlockWithBiometric,
      startPinReset,
      switchWallet,
      enableBiometric,
      beginEnrollment,
      commitPin,
      cancelEnrollment,
    ],
  );

  return (
    <LaunchGateContext.Provider value={contextValue}>
      {children}
      <LaunchGateOverlay {...contextValue} maxFails={MAX_FAILS} />
    </LaunchGateContext.Provider>
  );
}

export default LaunchGateProvider;

