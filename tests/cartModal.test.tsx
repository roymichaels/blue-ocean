import React from 'react';
import renderer, { act } from 'react-test-renderer';
import CartModal from '@/features/cart/components/CartModal';

let infoModalProps: any[] = [];
jest.mock('@/components/InfoModal', () => (props: any) => {
  infoModalProps.push(props);
  return null;
});

let confirmationModalProps: any[] = [];
jest.mock('@/components/ConfirmationModal', () => (props: any) => {
  confirmationModalProps.push(props);
  return null;
});

jest.mock('@/components/SmartImage', () => 'SmartImage');

const useCartMock = jest.fn();
jest.mock('@/features/cart/hooks/useCart', () => ({ __esModule: true, default: useCartMock }));

const useCartStoresMock = jest.fn();
jest.mock('@/features/cart/hooks/useCartStores', () => ({ __esModule: true, default: useCartStoresMock }));

const useAuthMock = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const useThemeMock = jest.fn();
const useLanguageMock = jest.fn();
jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => useThemeMock(),
  useLanguage: () => useLanguageMock(),
}));

const useCurrencyMock = jest.fn();
jest.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => useCurrencyMock(),
}));

const useNotificationsMock = jest.fn();
jest.mock('@/components/NotificationContext', () => ({
  useNotifications: () => useNotificationsMock(),
}));

const useLaunchGateMock = jest.fn();
jest.mock('@/features/launchGate', () => ({
  useLaunchGate: () => useLaunchGateMock(),
}));

const useAppRouterMock = jest.fn();
jest.mock('@/services', () => ({
  useAppRouter: () => useAppRouterMock(),
}));

const trackMock = jest.fn();
const publishMock = jest.fn();
jest.mock('@/services/eventBus', () => ({
  track: (...args: any[]) => trackMock(...args),
  publish: (...args: any[]) => publishMock(...args),
}));

const getSettingValueMock = jest.fn();
jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getSettingValue: (...args: any[]) => getSettingValueMock(...args),
    }),
  },
}));

const getLastOpenedNotificationIdMock = jest.fn();
jest.mock('@/services/notification', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getLastOpenedNotificationId: (...args: any[]) =>
        getLastOpenedNotificationIdMock(...args),
    }),
  },
}));

const getSessionMock = jest.fn();
const requestScopesMock = jest.fn();
const requestTokenWithConsentMock = jest.fn();
const setSessionCheckoutNonceMock = jest.fn();
const getCheckoutRequestScopesMock = jest.fn();
jest.mock('@/services/session', () => ({
  getSession: (...args: any[]) => getSessionMock(...args),
  requestScopes: (...args: any[]) => requestScopesMock(...args),
  requestTokenWithConsent: (...args: any[]) =>
    requestTokenWithConsentMock(...args),
  setSessionCheckoutNonce: (...args: any[]) =>
    setSessionCheckoutNonceMock(...args),
  getCheckoutRequestScopes: (...args: any[]) =>
    getCheckoutRequestScopesMock(...args),
}));

const persistCheckoutIntentMock = jest.fn();
const clearCheckoutIntentMock = jest.fn();
jest.mock('@/features/cart/services/orderIntent', () => ({
  persistCheckoutIntent: (...args: any[]) =>
    persistCheckoutIntentMock(...args),
  clearCheckoutIntent: (...args: any[]) => clearCheckoutIntentMock(...args),
}));

const getCacheHitRatioMock = jest.fn();
jest.mock('@/services/warmCache', () => ({
  getCacheHitRatio: (...args: any[]) => getCacheHitRatioMock(...args),
}));

const getDocsUrlMock = jest.fn();
jest.mock('@/hooks/config', () => ({
  getDocsUrl: (...args: any[]) => getDocsUrlMock(...args),
}));

const uuidMock = jest.fn();
jest.mock('@/utils/uuid', () => ({
  uuid: () => uuidMock(),
  default: () => uuidMock(),
}));

jest.mock('@/features/payments', () => ({
  __esModule: true,
  MoonPayButton: () => null,
  MOONPAY_DISABLED_LABEL: 'MoonPay disabled',
  MOONPAY_DISABLED_TOOLTIP: 'MoonPay tooltip',
}));

const createOrdersFromCartMock = jest.fn();
jest.mock('@/services/orders', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      createOrdersFromCart: (...args: any[]) => createOrdersFromCartMock(...args),
    }),
  },
}));

type Rendered = renderer.ReactTestRenderer;

let requireUnlockMock: jest.Mock;
let showNotificationMock: jest.Mock;

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function findTouchablesByText(root: Rendered, text: string) {
  return root.root.findAll(
    (node) =>
      node.type === 'TouchableOpacity' &&
      node
        .findAll((child: any) => child.type === 'Text' && child.props.children === text)
        .length > 0,
  );
}

async function pressTouchableByText(root: Rendered, text: string) {
  const buttons = findTouchablesByText(root, text);
  if (!buttons.length) {
    throw new Error(`Touchable with text "${text}" not found`);
  }
  await act(async () => {
    buttons[0].props.onPress();
  });
  await flushPromises();
}

async function goToPayment(root: Rendered) {
  await pressTouchableByText(root, 'cart.proceedToPayment');
  const inputs = root.root.findAll((node: any) => node.type === 'TextInput');
  if (inputs.length >= 4) {
    await act(async () => {
      inputs[0].props.onChangeText('User Name');
      inputs[1].props.onChangeText('1234567');
      inputs[2].props.onChangeText('Main Street 1');
      inputs[3].props.onChangeText('Tel Aviv');
    });
  }
  await flushPromises();
  await pressTouchableByText(root, 'cart.proceedToPayment');
}

describe('CartModal checkout flows', () => {
  beforeEach(() => {
    infoModalProps = [];
    confirmationModalProps = [];
    trackMock.mockClear();
    publishMock.mockClear();
    getSettingValueMock.mockReset();
    getLastOpenedNotificationIdMock.mockReset();
    getSessionMock.mockReset();
    requestScopesMock.mockReset();
    requestTokenWithConsentMock.mockReset();
    setSessionCheckoutNonceMock.mockReset();
    getCheckoutRequestScopesMock.mockReset();
    persistCheckoutIntentMock.mockReset();
    clearCheckoutIntentMock.mockReset();
    getCacheHitRatioMock.mockReset();
    getDocsUrlMock.mockReset();
    uuidMock.mockReset();
    createOrdersFromCartMock.mockReset();

    const ReactNative = require('react-native');
    ReactNative.Linking = { openURL: jest.fn(() => Promise.resolve(true)) };

    uuidMock.mockReturnValue('nonce-123');
    getDocsUrlMock.mockReturnValue('https://docs.example');
    getCacheHitRatioMock.mockReturnValue(0.75);

    useCartMock.mockReturnValue({
      cartItems: [
        {
          id: 'item-1',
          productId: 'prod-1',
          product: {
            id: 'prod-1',
            name: 'Test Product',
            price: 5,
            description: 'd',
            category: 'c',
            images: [],
            rating: 0,
            reviews: 0,
            storeId: 'store-1',
            stock: 5,
          },
          quantity: 1,
          addedAt: '',
        },
      ],
      updateQuantity: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      getTotal: jest.fn(() => 5),
    });

    useCartStoresMock.mockReturnValue({ 'store-1': { id: 'store-1', name: 'Store One' } });

    const colors = {
      gold: '#d4af37',
      text: { primary: '#111', secondary: '#333', inverse: '#fff', tertiary: '#777' },
      surface: { primary: '#fff', secondary: '#f5f5f5' },
      border: { primary: '#ccc', focus: '#000' },
      interactive: { secondary: '#222', disabled: '#999' },
      background: '#fdfdfd',
      status: { success: '#0f0' },
    };
    useThemeMock.mockReturnValue({ colors });
    useLanguageMock.mockReturnValue({
      currentLanguage: 'he',
      isRTL: true,
      t: (key: string, fallback?: any) =>
        typeof fallback === 'string' ? fallback : key,
    });
    useCurrencyMock.mockReturnValue({ currencySymbol: '₪' });

    showNotificationMock = jest.fn();
    useNotificationsMock.mockReturnValue({ showNotification: showNotificationMock });

    requireUnlockMock = jest.fn().mockResolvedValue(undefined);
    useLaunchGateMock.mockReturnValue({ requireUnlock: requireUnlockMock });

    useAppRouterMock.mockReturnValue({ push: jest.fn() });

    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      user: { id: 'user-1', displayName: 'User', kycStatus: 'verified' },
      sessionToken: 'auth-token',
    });

    getSettingValueMock.mockResolvedValue('false');
    getSessionMock.mockImplementation((token: string) =>
      token === 'auth-token'
        ? { scopes: ['checkout'], checkoutNonce: null }
        : null,
    );
    requestScopesMock.mockResolvedValue({ token: 'scope-token', scopes: ['checkout'] });
    requestTokenWithConsentMock.mockResolvedValue({
      token: 'session-token',
      scopes: ['checkout'],
    });
    getCheckoutRequestScopesMock.mockReturnValue(['checkout']);
    setSessionCheckoutNonceMock.mockResolvedValue(undefined);

    createOrdersFromCartMock.mockResolvedValue([]);
  });

  async function renderModal() {
    let root: Rendered;
    await act(async () => {
      root = renderer.create(<CartModal visible onClose={jest.fn()} />);
    });
    await flushPromises();
    return root!;
  }

  it('prompts for checkout scope and disables payment CTA when scope missing', async () => {
    getSessionMock.mockImplementation((token: string) =>
      token === 'auth-token'
        ? { scopes: ['read'], checkoutNonce: null }
        : null,
    );
    requestScopesMock.mockResolvedValueOnce({ token: 'issued-token', scopes: [] });

    const root = await renderModal();
    await goToPayment(root);

    const scopeCalls = trackMock.mock.calls.filter(
      ([event]) => event === 'checkout.scopePrompt',
    );
    const statuses = scopeCalls.map(([, payload]) => payload.status);
    expect(statuses).toEqual(expect.arrayContaining(['requested', 'failed']));

    const info = infoModalProps.find((props) => props.visible);
    expect(info?.message).toBe(
      'Checkout authorization is required before completing your order.',
    );

    const completeButtons = findTouchablesByText(root, 'cart.completeOrder');
    expect(completeButtons[0].props.disabled).toBe(true);
  });

  it('shows verification prompt when tenant enforces KYC', async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      user: { id: 'user-1', displayName: 'User', kycStatus: 'none' },
      sessionToken: 'auth-token',
    });
    getSettingValueMock.mockResolvedValueOnce('true');

    const root = await renderModal();
    await pressTouchableByText(root, 'cart.proceedToPayment');

    const confirm = confirmationModalProps.find((props) => props.visible);
    expect(confirm).toBeDefined();
    expect(confirm?.message).toBe('kyc.requiredForOrders');

    const header = root.root.find(
      (node: any) => node.type === 'Text' && node.props.children === 'cart.cartTitle',
    );
    expect(header).toBeDefined();
  });

  it('allows checkout flow to continue when KYC requirement disabled', async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      user: { id: 'user-1', displayName: 'User', kycStatus: 'none' },
      sessionToken: 'auth-token',
    });
    getSettingValueMock.mockResolvedValueOnce('false');

    const root = await renderModal();
    await pressTouchableByText(root, 'cart.proceedToPayment');

    const shippingTitleNodes = root.root.findAll(
      (node: any) => node.type === 'Text' && node.props.children === 'cart.shippingDetails',
    );
    expect(shippingTitleNodes.length).toBeGreaterThan(0);
    expect(confirmationModalProps.some((props) => props.visible)).toBe(false);
  });

  it('surfaces duplicate nonce warning on repeated submissions', async () => {
    requestScopesMock.mockResolvedValue({ token: 'scope-token', scopes: ['checkout'] });
    requestTokenWithConsentMock.mockResolvedValue({
      token: 'session-token',
      scopes: ['checkout'],
    });
    createOrdersFromCartMock.mockRejectedValueOnce(new Error('ERR_DUPLICATE_NONCE'));

    const root = await renderModal();
    await goToPayment(root);

    const completeButton = findTouchablesByText(root, 'cart.completeOrder')[0];
    await act(async () => {
      completeButton.props.onPress();
    });
    await flushPromises();

    expect(requireUnlockMock).toHaveBeenCalledWith('checkout');
    const warning = infoModalProps.find(
      (props) => props.visible && props.message === 'cart.paymentAlreadyProcessing',
    );
    expect(warning).toBeDefined();
    expect(warning?.type).toBe('warning');
  });
});
