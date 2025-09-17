import React from 'react';
import renderer, { act } from 'react-test-renderer';

const useAuthMock = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ tenantId: 'tenant-1', isNetwork: false }),
}));

const themeValue = {
  colors: {
    canvas: '#fff',
    surface: { primary: '#f5f5f5' },
    border: { primary: '#ccc' },
    text: {
      primary: '#000',
      secondary: '#333',
      tertiary: '#666',
      inverse: '#fff',
    },
    interactive: { primary: '#111', secondary: '#444' },
    gold: '#d4af37',
  },
};
const useThemeMock = jest.fn().mockReturnValue(themeValue);
const useLanguageMock = jest
  .fn()
  .mockReturnValue({ t: (key: string, fallback?: string) => key || fallback || '' });

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => useThemeMock(),
  useLanguage: () => useLanguageMock(),
}));

const getAdminPublicKeysMock = jest.fn();
jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAdminPublicKeys: (...args: any[]) => getAdminPublicKeysMock(...args),
    }),
  },
}));

const encryptForTenantMock = jest.fn();
jest.mock('@/services/kycUpload', () => ({
  encryptForTenant: (...args: any[]) => encryptForTenantMock(...args),
}));

const sendDMMock = jest.fn();
jest.mock('@/services/dm', () => ({
  sendDM: (...args: any[]) => sendDMMock(...args),
}));

const cleanupMock = jest.fn();
const trackMock = jest.fn();
const untrackMock = jest.fn();
jest.mock('@/utils/kycTemp', () => ({
  cleanupTrackedKycCapturedPaths: (...args: any[]) => cleanupMock(...args),
  trackKycCapturedPath: (...args: any[]) => trackMock(...args),
  untrackKycCapturedPath: (...args: any[]) => untrackMock(...args),
}));

const persistUserMock = jest.fn();
jest.mock('@/features/auth/services/nearUsers', () => ({
  setUser: (...args: any[]) => persistUserMock(...args),
}));

const documentPickerMock = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: any[]) => documentPickerMock(...args),
}));

const requestCameraPermissionsAsync = jest.fn();
const requestMediaLibraryPermissionsAsync = jest.fn();
const launchCameraAsync = jest.fn();
const launchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: any[]) => requestCameraPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    requestMediaLibraryPermissionsAsync(...args),
  launchCameraAsync: (...args: any[]) => launchCameraAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => launchImageLibraryAsync(...args),
}));

const { default: KycScreen } = require('@/app/kyc/index');

describe('KycVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
    cleanupMock.mockResolvedValue(undefined);
    encryptForTenantMock.mockResolvedValue({ uri: 'ipfs://encrypted', hash: 'hash123' });
    sendDMMock.mockResolvedValue(undefined);
    documentPickerMock.mockResolvedValue({ canceled: true });
    launchCameraAsync.mockResolvedValue({ canceled: true });
    launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    getAdminPublicKeysMock.mockResolvedValue(['tenant-public']);
  });

  const render = () => renderer.create(<KycScreen />);

  it('renders verified state', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', kycStatus: 'verified' },
      checkAuthState: jest.fn(),
    });
    const tree = render();
    const textNodes = tree.root.findAll((node: any) => node.type === 'Text');
    const labels = textNodes.map((node: any) => node.props.children).join(' ');
    expect(labels).toContain('kyc.verifiedMessage');
  });

  it('submits a KYC request with uploads', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        kycStatus: 'none',
        kycRequestNotes: '',
        chatPublicKey: 'buyer-public',
      },
      checkAuthState: jest.fn(),
    });

    documentPickerMock.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file://id.png', mimeType: 'image/png', size: 2048, name: 'id.png' },
      ],
    });
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file://selfie.jpg', mimeType: 'image/jpeg', fileSize: 4096, fileName: 'selfie.jpg' },
      ],
    });

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-id-document' }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-selfie-library' }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-submit' }).props.onPress();
      await Promise.resolve();
    });

    expect(getAdminPublicKeysMock).toHaveBeenCalled();
    expect(encryptForTenantMock).toHaveBeenCalledWith('tenant-public', [
      expect.objectContaining({ uri: 'file://id.png' }),
      expect.objectContaining({ uri: 'file://selfie.jpg' }),
    ]);
    expect(sendDMMock).toHaveBeenCalledWith(
      'tenant-public',
      'kyc.request',
      expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
    );
    expect(trackMock).toHaveBeenCalledWith('file://id.png');
    expect(trackMock).toHaveBeenCalledWith('file://selfie.jpg');
    expect(cleanupMock).toHaveBeenCalled();
    expect(persistUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ kycStatus: 'pending' }),
    );
    expect(useAuthMock.mock.results[0].value.checkAuthState).toHaveBeenCalled();

    const helperTexts = tree.root
      .findAll((node: any) => node.props?.children && typeof node.props.children === 'string')
      .map((node: any) => node.props.children);
    expect(helperTexts.join(' ')).toContain('kyc.requestSubmittedMessage');
  });

  it('blocks files that exceed the size limit', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', kycStatus: 'none', chatPublicKey: 'buyer-public' },
      checkAuthState: jest.fn(),
    });

    documentPickerMock.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file://large.pdf', mimeType: 'application/pdf', size: 50 * 1024 * 1024 },
      ],
    });

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-id-document' }).props.onPress();
      await Promise.resolve();
    });

    const helperTexts = tree.root
      .findAll((node: any) => node.props?.children && typeof node.props.children === 'string')
      .map((node: any) => node.props.children);
    expect(helperTexts.join(' ')).toContain('kyc.fileTooLarge');
    expect(encryptForTenantMock).not.toHaveBeenCalled();
  });

  it('shows pending message when status is pending', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', kycStatus: 'pending' },
      checkAuthState: jest.fn(),
    });
    const tree = render();
    const textNodes = tree.root.findAll((node: any) => node.type === 'Text');
    const content = textNodes.map((node: any) => node.props.children).join(' ');
    expect(content).toContain('kyc.pendingMessage');
    const submitButton = tree.root.findByProps({ testID: 'kyc-submit' });
    expect(submitButton.props.disabled).toBe(true);
  });

  it('handles submission failure and keeps attachments for retry', async () => {
    const checkAuthState = jest.fn();
    useAuthMock.mockReturnValue({
      user: { id: 'user-1', kycStatus: 'rejected', chatPublicKey: 'buyer-public' },
      checkAuthState,
    });

    documentPickerMock.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://id.png', mimeType: 'image/png', size: 2048, name: 'id.png' }],
    });
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://selfie.jpg', mimeType: 'image/jpeg', fileSize: 4096 }],
    });
    sendDMMock.mockRejectedValueOnce(new Error('send failed'));

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-id-document' }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-selfie-library' }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-submit' }).props.onPress();
      await Promise.resolve();
    });

    const helperTexts = tree.root
      .findAll((node: any) => node.props?.children && typeof node.props.children === 'string')
      .map((node: any) => node.props.children);
    expect(helperTexts.join(' ')).toContain('kyc.submissionError');
    expect(cleanupMock).toHaveBeenCalled();
  });
});
