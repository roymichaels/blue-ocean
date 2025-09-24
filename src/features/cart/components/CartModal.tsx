// TODO:CORE-002 call OrderService.deployOrderPayment instead of legacy helper
// TODO:CORE-004 per-submit nonce; prevent double-tap (disable button, replay guard)
// TODO:CORE-019 anonymous analytics begin/success/fail on tenant topic

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import {
  X,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  MapPin,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { CartItem, ShippingAddress, Store } from '@/types';
import chain from '@/services/chain';
import useCart from '../hooks/useCart';
import useCartStores from '../hooks/useCartStores';

let getStore:
  | ((storeId: string, id: string) => Promise<Store | null>)
  | undefined;
if (chain === 'near') {
  const nearStores = require('@/features/stores/services/nearStores');
  const service = nearStores.createStoreService(
    nearStores.createDefaultStoreServiceDeps(),
  );
  getStore = service.selectStore;
}

import OrderService from '@/services/orders';
import eventBus from '@/services/eventBus';
import { Button, Spinner } from '@/ui/primitives';
import { getCacheHitRatio } from '@/services/warmCache';
import { isMoonPayEnabled } from '@/config/featureFlags';
const {
  MoonPayButton,
  MOONPAY_DISABLED_LABEL,
  MOONPAY_DISABLED_TOOLTIP,
} = require('@/features/payments');
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/ui/ThemeProvider';
import commonStyles from '@/constants/styles';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotifications } from '@/components/NotificationContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { useLaunchGate } from '@/features/launchGate';
import { useAppRouter } from '@/hooks';
import InfoModal from '@/components/InfoModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
  getCheckoutRequestScopes,
  getSession,
  requestScopes,
  requestTokenWithConsent,
  setSessionCheckoutNonce,
} from '@/services/session';
import { uuid } from '@/utils/uuid';
import NotificationService from '@/services/notification';
import SettingsAgent from '@/agents/settings-agent';
import { errorLog } from '@/utils/logger';
import { persistCheckoutIntent, clearCheckoutIntent } from '../services/orderIntent';
import { getDocsUrl } from '@/hooks/config';

const PRODUCT_CACHE_TOPIC = '/blue-ocean/products/1';

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);

function parseBooleanSetting(value: string | null): boolean | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) return true;
  if (BOOLEAN_FALSE_VALUES.has(normalized)) return false;
  return null;
}

type InfoModalState = {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  buttonText?: string;
  onConfirm?: () => void;
  autoClose?: boolean;
};

function isInsufficientFundsError(error: unknown): boolean {
  const patterns = [
    'insufficient funds',
    'insufficient balance',
    'insufficient account balance',
    'not enough balance',
    'not enough to cover',
    'does not have enough',
    'requires attached deposit',
    'attach more near',
  ];
  const codes = new Set([
    'INSUFFICIENT_FUNDS',
    'ERR_INSUFFICIENT_FUNDS',
    'INSUFFICIENT_BALANCE',
    'NOTENOUGHBALANCE',
    'LACKBALANCE',
  ]);

  const checkString = (value?: string): boolean => {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return patterns.some((pattern) => normalized.includes(pattern));
  };

  if (!error) return false;

  if (typeof error === 'string') {
    return checkString(error);
  }

  if (error instanceof Error) {
    if (checkString(error.message)) return true;
    const cause = error.cause as unknown;
    if (cause && typeof cause === 'object') {
      const causeObj = cause as Record<string, unknown>;
      if (checkString(typeof causeObj.message === 'string' ? causeObj.message : undefined)) {
        return true;
      }
      if (checkString(typeof causeObj.ExecutionError === 'string' ? causeObj.ExecutionError : undefined)) {
        return true;
      }
      if (
        typeof causeObj.kind === 'object' &&
        causeObj.kind &&
        checkString(String((causeObj.kind as Record<string, unknown>).ExecutionError || ''))
      ) {
        return true;
      }
    }
  }

  if (typeof error !== 'object') {
    return false;
  }

  const errObj = error as Record<string, any>;

  const codeLike = [errObj.code, errObj.type, errObj.kind]
    .map((value) => (typeof value === 'string' ? value.toUpperCase() : undefined))
    .filter(Boolean) as string[];
  if (codeLike.some((value) => codes.has(value))) {
    return true;
  }

  const actionError = errObj.data?.status?.Failure?.ActionError?.kind;
  if (actionError && (actionError.LackBalance || actionError.NotEnoughBalance)) {
    return true;
  }

  const nestedStrings: string[] = [];
  const maybeStrings = [
    errObj.message,
    errObj.reason,
    errObj.error,
    errObj.data?.message,
    errObj.data?.errorMessage,
    errObj.data?.ExecutionError,
    errObj.data?.errorCause,
    errObj.kind?.ExecutionError,
    errObj.cause?.message,
    errObj.cause?.ExecutionError,
    errObj.cause?.kind?.ExecutionError,
  ];
  for (const value of maybeStrings) {
    if (typeof value === 'string') {
      nestedStrings.push(value);
    }
  }

  if (nestedStrings.some((value) => checkString(value))) {
    return true;
  }

  try {
    const serialized = JSON.stringify(errObj);
    if (checkString(serialized)) {
      return true;
    }
  } catch (err) {
    // ignore serialization issues
  }

  return false;
}

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CartModal({ visible, onClose }: CartModalProps) {
  const { cartItems, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const stores = useCartStores(cartItems);
  const [checkoutStep, setCheckoutStep] = useState<
    'cart' | 'shipping' | 'payment' | 'confirmation'
  >('cart');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [checkoutNonce, setCheckoutNonce] = useState<string | null>(null);
  const { isLoggedIn, user, sessionToken: authSessionToken } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const { showNotification } = useNotifications();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { requireUnlock } = useLaunchGate();
  const moonPayEnabled = useMemo(() => isMoonPayEnabled(), []);

  const openTopUpInstructions = useCallback(() => {
    setInfoModal((prev) => ({ ...prev, visible: false }));
    const docsBase = getDocsUrl();
    const fallbackUrl = 'https://docs.near.org/tools/wallets/fiat-onramps';
    const target = docsBase
      ? `${docsBase.replace(/\/$/, '')}/wallet/top-up`
      : fallbackUrl;
    void Linking.openURL(target).catch(() => {
      showNotification(
        t('common.error'),
        t(
          'cart.topUpLinkError',
          'Unable to open the top-up instructions. Please try again.',
        ),
        'error',
      );
    });
  }, [showNotification, t]);

  // Info/confirm modals
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    autoClose: true,
  });
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    action: () => {},
  });

  const [checkoutSessionToken, setCheckoutSessionToken] = useState<string | null>(null);
  const [checkoutScopeGranted, setCheckoutScopeGranted] = useState(false);
  const [checkoutScopePending, setCheckoutScopePending] = useState(false);
  const [kycRequired, setKycRequired] = useState<boolean | null>(null);

  const ensureSessionToken = async (): Promise<string> => {
    if (checkoutSessionToken) return checkoutSessionToken;
    const { token, scopes } = await requestTokenWithConsent(
      getCheckoutRequestScopes(),
      () => uuid(),
    );
    setCheckoutSessionToken(token);
    if (scopes.includes('checkout')) {
      setCheckoutScopeGranted(true);
    }
    return token;
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const setting = await SettingsAgent.getInstance().getSettingValue('kyc.required');
        if (cancelled) return;
        setKycRequired(parseBooleanSetting(setting));
      } catch (err) {
        errorLog('Failed to load kyc.required setting', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);


  useEffect(() => {
    if (!visible) {
      setCheckoutScopePending(false);
      return;
    }
    if (!isLoggedIn) {
      setCheckoutScopeGranted(false);
      setCheckoutScopePending(false);
      return;
    }

    const activeScopes = new Set<string>();
    const tokens = [authSessionToken, checkoutSessionToken].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    for (const token of tokens) {
      const session = getSession(token);
      if (!session) continue;
      for (const scope of session.scopes) {
        activeScopes.add(scope);
      }
    }

    if (activeScopes.has('checkout')) {
      setCheckoutScopeGranted(true);
      setCheckoutScopePending(false);
      return;
    }

    let cancelled = false;
    setCheckoutScopePending(true);

    (async () => {
      try {
        void eventBus.track('checkout.scopePrompt', { status: 'requested' });
        const issued = await requestScopes(['checkout'], () => uuid());
        if (cancelled) return;
        setCheckoutSessionToken(issued.token);
        if (issued.scopes.includes('checkout')) {
          setCheckoutScopeGranted(true);
          void eventBus.track('checkout.scopePrompt', { status: 'granted' });
        } else {
          throw new Error('checkout scope missing');
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        void eventBus.track('checkout.scopePrompt', { status: 'failed', message });
        errorLog('Checkout scope request failed', err);
        setCheckoutScopeGranted(false);
        setInfoModal({
          visible: true,
          title: t('common.error'),
          message: t(
            'cart.checkoutScopeRequired',
            'Checkout authorization is required before completing your order.',
          ),
          type: 'error',
        });
      } finally {
        if (!cancelled) {
          setCheckoutScopePending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    isLoggedIn,
    authSessionToken,
    checkoutSessionToken,
    t,
  ]);


  useEffect(() => {
    if (visible) {
      // reset flow
      setCheckoutStep('cart');
      setOrderPlaced(false);
      setOrderIds([]);
      if (isLoggedIn && user) {
        setShippingAddress((prev) => ({ ...prev, name: user.displayName || '' }));
      }
    }
  }, [visible, isLoggedIn, user]);

  useEffect(() => {
    // Scroll to top when changing steps
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [checkoutStep]);

  const groupedItems = useMemo(() => {
    return cartItems.reduce<Record<string, CartItem[]>>((acc, item) => {
      const storeId = item.product.storeId;
      (acc[storeId] ||= []).push(item);
      return acc;
    }, {});
  }, [cartItems]);

  const getGroupTotal = (items: CartItem[]) =>
    items.reduce(
      (total, item) =>
        total + (item.unitPrice ?? item.product.price) * item.quantity,
      0
    );

  const goToShipping = () => {
    if (!isLoggedIn) {
      setInfoModal({
        visible: true,
        title: t('cart.loginRequiredTitle'),
        message: t('cart.loginRequiredMessage'),
        type: 'info',
      });
      return;
    }
    if (!cartItems.length) {
      setInfoModal({
        visible: true,
        title: t('cart.emptyCartTitle'),
        message: t('cart.emptyCartMessage'),
        type: 'warning',
      });
      return;
    }

    const overstock = cartItems.find(
      (i) => (i.effectiveQty ?? i.quantity) > (i.product.stock ?? Infinity)
    );
    if (overstock) {
      setInfoModal({
        visible: true,
        title: t('cart.outOfStockTitle'),
        message: t('cart.outOfStockMessage'),
        type: 'warning',
      });
      return;
    }

    // KYC gate
    if (kycRequired !== false && user && user.kycStatus !== 'verified') {
      let message = '';
      switch (user.kycStatus) {
        case 'none':
          message = t('kyc.requiredForOrders');
          break;
        case 'pending':
          message = t('kyc.pendingOrdersMessage');
          break;
        case 'rejected':
          message = t('kyc.rejectedOrdersMessage');
          break;
        default:
          message = t('kyc.requiredForOrders');
      }
      if (user.kycStatus === 'none' || user.kycStatus === 'rejected') {
        setConfirmModal({
          visible: true,
          title: t('kyc.verification'),
          message,
          confirmText: t('kyc.goToKyc'),
          cancelText: t('common.cancel'),
          action: () => {
            void persistCheckoutIntent(cartItems, getTotal(), {
              step: 'shipping',
              returnPath: { pathname: '/', params: { showCart: 'true' } },
            });
            onClose();
            push('/kyc');
          },
        });
      } else {
        setInfoModal({
          visible: true,
          title: t('kyc.verification'),
          message,
          type: 'warning',
        });
      }
      return;
    }

    void clearCheckoutIntent();
    eventBus.track('checkout.start', { items: cartItems.length, total: getTotal() });
    setCheckoutStep('shipping');
  };

  const goToPayment = () => {
    if (!validateShippingAddress()) return;
    setCheckoutStep('payment');
  };

  const goToConfirmation = () => setCheckoutStep('confirmation');

  const goBack = () => {
    switch (checkoutStep) {
      case 'shipping':
        setCheckoutStep('cart');
        break;
      case 'payment':
        setCheckoutStep('shipping');
        break;
      case 'confirmation':
        setCheckoutStep('payment');
        break;
      default:
        onClose();
    }
  };

  const validateShippingAddress = (): boolean => {
    if (!shippingAddress.name.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterFullName'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterPhone'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.street.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterStreet'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.city.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterCity'),
        type: 'error',
      });
      return false;
    }
    return true;
  };

  // TODO:CORE-002 replace nearDeployEscrow -> OrderService.deployOrderPayment(orderDraft,{nonce})
  // TODO:KYC-001 if tenant.requireKyc === true, block checkout until verifyKycReceipt() passes
  const placeOrder = async () => {
    if (!validateShippingAddress()) return;
    try {
      await requireUnlock('checkout');
      void eventBus.track('checkout.stepUp', { status: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void eventBus.track('checkout.stepUp', { status: 'failed', message });
      errorLog('Checkout step-up failed', error);
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t(
          'cart.checkoutStepUpFailed',
          'Unlock verification is required before completing your order.',
        ),
        type: 'warning',
      });
      return;
    }

    const token = await ensureSessionToken();
    let nonce = checkoutNonce;
    if (!nonce) {
      nonce = uuid();
      setCheckoutNonce(nonce);
      setSessionCheckoutNonce(token, nonce);
    }

    setLoading(true);
    let resetNonce = false;
    try {
      // TODO:CORE-024 Angle 1 - Display the Angle 1 checkout timeline once the orchestrator feeds status updates into the UI.
      const orders = await OrderService.getInstance().createOrdersFromCart(
        user?.id || 'guest',
        cartItems,
        shippingAddress,
        'near',
        token,
        nonce,
      );
      resetNonce = true;
      eventBus.track('checkout.complete', {
        orderIds: orders.map((o) => o.id),
        total: getTotal(),
        cacheHitRatio: getCacheHitRatio(PRODUCT_CACHE_TOPIC),
        sourceNotificationId: NotificationService.getInstance().getLastOpenedNotificationId(),
      });
      setOrderIds(orders.map((o) => o.id));
      setOrderPlaced(true);
      await clearCart();
      await clearCheckoutIntent();

      showNotification(
        t('cart.orderReceived'),
        t('cart.ordersCreated', { count: orders.length }),
        'success'
      );

      setTimeout(() => onClose(), 5000);
    } catch (error: any) {
      if (error?.message === 'ERR_DUPLICATE_NONCE') {
        setInfoModal({
          visible: true,
          title: t('common.error'),
          message: t('cart.paymentAlreadyProcessing'),
          type: 'warning',
        });
      } else if (isInsufficientFundsError(error)) {
        setInfoModal({
          visible: true,
          title: t('cart.insufficientFundsTitle', 'Insufficient funds'),
          message: t(
            'cart.insufficientFundsMessage',
            'Your wallet does not have enough NEAR to deploy the escrow. Follow the top-up guide and try again.',
          ),
          type: 'error',
          buttonText: t('cart.viewTopUpInstructions', 'View top-up instructions'),
          onConfirm: openTopUpInstructions,
          autoClose: false,
        });
      } else if (error?.message === '{E_EXPIRED}' || error?.message === '{E_SCOPE}') {
        setInfoModal({
          visible: true,
          title: t('common.error'),
          message: t('cart.invalidSession'),
          type: 'error',
        });
      } else {
        setInfoModal({
          visible: true,
          title: t('common.error'),
          message: t('cart.orderCreationError'),
          type: 'error',
        });
      }
      if (error?.message !== 'ERR_DUPLICATE_NONCE') {
        resetNonce = true;
      }
    } finally {
      setLoading(false);
      if (resetNonce) {
        setCheckoutNonce(null);
        setSessionCheckoutNonce(token, null);
      }
    }
  };

  const renderCartItem = (item: CartItem) => (
    <View
      key={item.id}
      style={[
        styles.cartItem,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <SmartImage
        uri={item.product.images?.[0] || ''}
        width={60}
        height={60}
        style={styles.productImage}
        contentFit="cover"
      />

      <View style={styles.productInfo}>
        <Text
          style={[styles.productName, { color: colors.text.primary }]}
          numberOfLines={2}
        >
          {item.product.name}
        </Text>

        <Text style={[styles.productPrice, { color: colors.gold }]}>
          {currencySymbol}
          {(item.unitPrice ?? item.product.price).toFixed(2)}
        </Text>
        {item.tierName && (
          <Text style={[styles.tierInfo, { color: colors.text.secondary }]}>
            {'\n'}
            {item.tierName} • EQ {item.effectiveQty}
          </Text>
        )}
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={[
            styles.quantityButton,
            item.quantity === 1 && styles.quantityButtonDisabled,
            {
              backgroundColor: colors.surface.secondary,
              borderColor: colors.border.primary,
            },
          ]}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity === 1}
        >
          <Minus
            size={16}
            color={
              item.quantity === 1
                ? colors.interactive.disabled
                : colors.text.primary
            }
          />
        </TouchableOpacity>

        <Text style={[styles.quantity, { color: colors.text.primary }]}>
          {item.quantity}
        </Text>

        <TouchableOpacity
          style={[
            styles.quantityButton,
            item.quantity >= (item.product.stock || 99) &&
              styles.quantityButtonDisabled,
            {
              backgroundColor: colors.surface.secondary,
              borderColor: colors.border.primary,
            },
          ]}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= (item.product.stock || 99)}
        >
          <Plus
            size={16}
            color={
              item.quantity >= (item.product.stock || 99)
                ? colors.interactive.disabled
                : colors.text.primary
            }
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}>
        <Trash2 size={16} color={colors.status.error} />
      </TouchableOpacity>
    </View>
  );

  const renderShippingForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkoutHeader}>
          <MapPin size={24} color={colors.gold} />
          <Text style={[styles.checkoutTitle, { color: colors.text.primary }]}>
            {t('cart.shippingAddress')}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.fullName')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.name}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, name: text })}
            placeholder={t('cart.fullNamePlaceholder')}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.phone')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.phone}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, phone: text })}
            placeholder={t('cart.phonePlaceholder')}
            keyboardType="phone-pad"
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.streetAddress')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.street}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, street: text })}
            placeholder={t('cart.streetAddressPlaceholder')}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroupHalf}>
            <Text style={[styles.formLabel, { color: colors.text.primary }]}>
              {t('cart.city')}
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                  color: colors.text.primary,
                },
              ]}
              value={shippingAddress.city}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
              placeholder={t('cart.cityPlaceholder')}
              textAlign="right"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.formGroupHalf}>
            <Text style={[styles.formLabel, { color: colors.text.primary }]}>
              {t('cart.postalCode')}
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                  color: colors.text.primary,
                },
              ]}
              value={shippingAddress.postalCode}
              onChangeText={(text) =>
                setShippingAddress({ ...shippingAddress, postalCode: text })
              }
              placeholder={t('cart.postalCodePlaceholder')}
              keyboardType="numeric"
              textAlign="right"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.notes')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              styles.textArea,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.notes}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, notes: text })}
            placeholder={t('cart.notesPlaceholder')}
            multiline
            numberOfLines={3}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
            {t('cart.orderSummary')}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.productsTotal')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {cartItems.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.itemsTotal')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}>
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}>
            {t('cart.backToCart')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.gold }]}
          onPress={goToPayment}
        >
          <Text style={[styles.nextButtonText, { color: colors.text.inverse }]}>
            {t('cart.proceedToPayment')}
          </Text>
          <ChevronLeft size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderPaymentForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkoutHeader}>
          <CreditCard size={24} color={colors.gold} />
          <Text style={[styles.checkoutTitle, { color: colors.text.primary }]}>
            {t('cart.paymentMethods')}
          </Text>
        </View>

        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.selectedPaymentOption,
              { backgroundColor: colors.interactive.secondary, borderColor: colors.gold },
            ]}
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>💰</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.cashOnDelivery')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.cashOnDeliveryDesc')}
              </Text>
            </View>
            <View style={styles.paymentOptionCheck}>
              <Check size={20} color={colors.gold} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.disabledPaymentOption,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
            disabled
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>💳</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.creditCard')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.comingSoon')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.disabledPaymentOption,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
            disabled
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>📱</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.paymentApps')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.comingSoon')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {moonPayEnabled ? (
          <MoonPayButton usdAmount={getTotal()} />
        ) : (
          <Button
            title={MOONPAY_DISABLED_LABEL}
            disabled
            tooltip={MOONPAY_DISABLED_TOOLTIP}
            style={styles.moonPayDisabledButton}
          />
        )}

        <View
          style={[
            styles.shippingAddressSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.shippingAddress')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('shipping')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.addressText, { color: colors.text.primary }]}>
            {shippingAddress.name}
            {'\n'}
            {shippingAddress.street}
            {'\n'}
            {shippingAddress.city} {shippingAddress.postalCode}
            {'\n'}
            {shippingAddress.phone}
          </Text>
          {!!shippingAddress.notes && (
            <Text style={[styles.notesText, { color: colors.text.secondary }]}> 
              {t('cart.notes')}: {shippingAddress.notes}
            </Text>
          )}
        </View>

        {Object.entries(groupedItems).map(([storeId, items]) => (
          <View
            key={storeId}
            style={[
              styles.orderSummary,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}> 
              {stores[storeId]?.name || t('cart.storeFallback')}
            </Text>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={[styles.summaryItemName, { color: colors.text.primary }]}>
                  {item.product.name} x{item.quantity}
                </Text>
                <Text style={[styles.summaryItemPrice, { color: colors.gold }]}>
                  {currencySymbol}
                  {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.summaryRow,
                styles.summaryTotal,
                { borderTopColor: colors.border.primary },
              ]}
            >
              <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
                {t('cart.storeTotal')}
              </Text>
              <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
                {currencySymbol}
                {getGroupTotal(items).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}> 
            {t('cart.backToAddress')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.gold }]}
          onPress={goToConfirmation}
        >
          <Text style={[styles.nextButtonText, { color: colors.text.inverse }]}> 
            {t('cart.proceedToSummary')}
          </Text>
          <ChevronLeft size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderOrderConfirmation = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.confirmationHeader}>
          <Text style={[styles.confirmationTitle, { color: colors.text.primary }]}> 
            {t('cart.orderConfirmation')}
          </Text>
          <Text style={[styles.confirmationSubtitle, { color: colors.text.secondary }]}> 
            {t('cart.reviewOrderMessage')}
          </Text>
        </View>

        <View
          style={[
            styles.shippingAddressSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.shippingAddress')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('shipping')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.addressText, { color: colors.text.primary }]}> 
            {shippingAddress.name}
            {'\n'}
            {shippingAddress.street}
            {'\n'}
            {shippingAddress.city} {shippingAddress.postalCode}
            {'\n'}
            {shippingAddress.phone}
          </Text>
          {!!shippingAddress.notes && (
            <Text style={[styles.notesText, { color: colors.text.secondary }]}> 
              {t('cart.notes')}: {shippingAddress.notes}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.paymentMethodSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.paymentMethods')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('payment')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodEmoji}>💰</Text>
            <Text style={[styles.paymentMethodText, { color: colors.text.primary }]}> 
              {t('cart.cashOnDelivery')}
            </Text>
          </View>
        </View>

        {Object.entries(groupedItems).map(([storeId, items]) => (
          <View
            key={storeId}
            style={[
              styles.orderSummary,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
                {t('cart.itemsFromStore', { store: stores[storeId]?.name || '' })}
              </Text>
              <TouchableOpacity onPress={() => setCheckoutStep('cart')}>
                <Text style={[styles.editLink, { color: colors.gold }]}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
            </View>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={[styles.summaryItemName, { color: colors.text.primary }]}>
                  {item.product.name} x{item.quantity}
                </Text>
                <Text style={[styles.summaryItemPrice, { color: colors.gold }]}>
                  {currencySymbol}
                  {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.summaryRow,
                styles.summaryTotal,
                { borderTopColor: colors.border.primary },
              ]}
            >
              <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
                {t('cart.storeTotal')}
              </Text>
              <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
                {currencySymbol}
                {getGroupTotal(items).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}> 
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}> 
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}> 
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, { color: colors.text.tertiary }]}> 
            {t('cart.termsNotice')}{'\n'}{t('cart.cashOnDeliveryNotice')}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}> 
            {t('cart.backToPayment')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.completeOrderButton,
            { backgroundColor: colors.gold },
            (loading || checkoutScopePending || !checkoutScopeGranted) && styles.buttonDisabled,
          ]}
          onPress={placeOrder}
          disabled={loading || checkoutScopePending || !checkoutScopeGranted}
        >
          {loading || checkoutScopePending ? (
            <Spinner size="small" color={colors.text.inverse} />
          ) : (
            <Text style={[styles.completeOrderText, { color: colors.text.inverse }]}>
              {t('cart.completeOrder')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderOrderSuccess = () => (
    <View style={styles.successContainer}>
      <View
        style={[
          styles.successIconContainer,
          { backgroundColor: colors.status.success },
        ]}
      >
        <Check size={60} color={colors.text.inverse} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text.primary }]}> 
        {t('cart.orderSuccessTitle')}
      </Text>
      <Text style={[styles.successOrderId, { color: colors.gold }]}>
        {orderIds.length === 1
          ? t('cart.orderNumber', { id: orderIds[0].slice(-6) })
          : t('cart.orderNumbers', {
              ids: orderIds.map((id) => `#${id.slice(-6)}`).join(', '),
            })}
      </Text>
      <Text style={[styles.successMessage, { color: colors.text.secondary }]}>
        {t('cart.orderSuccessMessage')}{'\n'}
        {t('cart.orderSuccessFollowUp')}
      </Text>
      <TouchableOpacity
        style={[styles.successButton, { backgroundColor: colors.gold }]}
        onPress={onClose}
      >
        <Text style={[styles.successButtonText, { color: colors.text.inverse }]}> 
          {t('common.close')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (orderPlaced) return renderOrderSuccess();

    switch (checkoutStep) {
      case 'shipping':
        return renderShippingForm();
      case 'payment':
        return renderPaymentForm();
      case 'confirmation':
        return renderOrderConfirmation();
      default:
        return (
          <>
            {cartItems.length > 0 ? (
              <>
                <ScrollView style={styles.cartList}>
                  {cartItems.map(renderCartItem)}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
                  <View style={styles.totalContainer}>
                    <Text style={[styles.totalText, { color: colors.text.primary }]}>
                      {t('cart.total')} {currencySymbol}
                      {getTotal().toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: colors.gold }]}
                    onPress={goToShipping}
                  >
                    <ShoppingCart size={20} color={colors.text.inverse} />
                    <Text
                      style={[
                        styles.checkoutButtonText,
                        { color: colors.text.inverse },
                      ]}
                    >
                      {t('cart.proceedToPayment')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyCart}>
                <ShoppingCart size={80} color={colors.interactive.disabled} />
                <Text style={[styles.emptyTitle, { color: colors.text.primary }]}> 
                  {t('cart.emptyCartTitle')}
                </Text>
                <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}> 
                  {t('cart.emptyCartMessage')}
                </Text>
              </View>
            )}
          </>
        );
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}> 
              {orderPlaced
                ? t('cart.orderComplete')
                : checkoutStep === 'cart'
                ? t('cart.cartTitle')
                : checkoutStep === 'shipping'
                ? t('cart.shippingDetails')
                : checkoutStep === 'payment'
                ? t('cart.paymentMethod')
                : t('cart.orderConfirmation')}
            </Text>
            {!orderPlaced && (
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress indicator */}
          {checkoutStep !== 'cart' && !orderPlaced && (
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    styles.progressDotActive,
                    { backgroundColor: colors.gold },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    styles.progressTextActive,
                    { color: colors.gold },
                  ]}
                >
                  {t('cart.stepCart')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: colors.gold },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    { backgroundColor: colors.gold },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    { color: colors.gold },
                  ]}
                >
                  {t('cart.stepShipping')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                    ? { backgroundColor: colors.gold }
                    : { backgroundColor: colors.interactive.disabled },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                      ? { backgroundColor: colors.gold }
                      : { backgroundColor: colors.interactive.disabled },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                      ? { color: colors.gold }
                      : { color: colors.text.secondary },
                  ]}
                >
                  {t('cart.stepPayment')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  checkoutStep === 'confirmation'
                    ? { backgroundColor: colors.gold }
                    : { backgroundColor: colors.interactive.disabled },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    checkoutStep === 'confirmation'
                      ? { backgroundColor: colors.gold }
                      : { backgroundColor: colors.interactive.disabled },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    checkoutStep === 'confirmation'
                      ? { color: colors.gold }
                      : { color: colors.text.secondary },
                  ]}
                >
                  {t('cart.stepConfirmation')}
                </Text>
              </View>
            </View>
          )}

          {renderContent()}
        </View>
      </Modal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        buttonText={infoModal.buttonText}
        onConfirm={infoModal.onConfirm}
        autoClose={infoModal.autoClose ?? true}
        onClose={() => setInfoModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || t('common.confirm')}
        cancelText={confirmModal.cancelText || t('common.cancel')}
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({ ...confirmModal, visible: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 4 },
  progressDotActive: { backgroundColor: '#D4AF37' },
  progressText: { fontSize: 12 },
  progressTextActive: { fontWeight: '600' },
  progressLine: { height: 2, flex: 1 },
  cartList: { flex: 1, padding: 16 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  productImage: { borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  productPrice: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  tierInfo: { fontSize: 12, textAlign: 'right' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityButtonDisabled: { opacity: 0.5 },
  quantity: { fontSize: 16, fontWeight: '600', marginHorizontal: 12 },
  removeButton: { padding: 8 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalContainer: { flex: 1 },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  checkoutButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  checkoutButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyMessage: { fontSize: 16, textAlign: 'center' },
  checkoutForm: { flex: 1, padding: 16 },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'center' },
  checkoutTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroupHalf: { flex: 1 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, textAlign: 'right' },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  orderSummary: { borderRadius: 12, padding: 16, marginVertical: 24, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryItemName: { fontSize: 14, flex: 1, textAlign: 'right' },
  summaryItemPrice: { fontSize: 14, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryTotal: { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  summaryTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  summaryTotalValue: { fontSize: 18, fontWeight: 'bold' },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  backButtonText: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  nextButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  completeOrderButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', minWidth: 180 },
  completeOrderText: { fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  moonPayDisabledButton: { marginTop: 16 },
  paymentOptions: { marginBottom: 24 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedPaymentOption: { borderWidth: 2 },
  disabledPaymentOption: { opacity: 0.6 },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentOptionEmoji: { fontSize: 20 },
  paymentOptionInfo: { flex: 1 },
  paymentOptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  paymentOptionDescription: { fontSize: 12, textAlign: 'right' },
  paymentOptionCheck: { marginLeft: 12 },
  shippingAddressSummary: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editLink: { fontSize: 14, fontWeight: '500' },
  addressText: { fontSize: 14, lineHeight: 20, textAlign: 'right' },
  notesText: { fontSize: 12, marginTop: 8, fontStyle: 'italic', textAlign: 'right' },
  paymentMethodSummary: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  paymentMethodInfo: { flexDirection: 'row', alignItems: 'center' },
  paymentMethodEmoji: { fontSize: 20, marginRight: 12 },
  paymentMethodText: { fontSize: 14, fontWeight: '500' },
  confirmationHeader: { alignItems: 'center', marginBottom: 24 },
  confirmationTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  confirmationSubtitle: { fontSize: 14, textAlign: 'center' },
  termsContainer: { marginBottom: 24 },
  termsText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  successOrderId: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  successMessage: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  successButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, minWidth: 150, alignItems: 'center' },
  successButtonText: { fontSize: 16, fontWeight: '600' },
});
