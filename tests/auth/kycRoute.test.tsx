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
const getSettingValueMock = jest.fn();
jest.mock('@/agents/settings-agent', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getAdminPublicKeys: (...args: any[]) => getAdminPublicKeysMock(...args),
      getSettingValue: (...args: any[]) => getSettingValueMock(...args),
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

const recordAsyncMock = jest.fn();
const requestExpoCameraPermissionMock = jest.fn(() => Promise.resolve({ status: 'granted' }));
jest.mock('expo-camera', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    CameraType: { front: 'front', back: 'back' },
    Constants: { Type: { front: 'front', back: 'back' }, VideoQuality: { '480p': '480p' } },
    requestCameraPermissionsAsync: (...args: any[]) => requestExpoCameraPermissionMock(...args),
    Camera: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        recordAsync: (...recordArgs: any[]) => recordAsyncMock(...recordArgs),
      }));
      return React.createElement(View, props, props.children);
    }),
  };
});

const requestCameraPermissionsAsync = jest.fn();
const requestMediaLibraryPermissionsAsync = jest.fn();
const launchCameraAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: any[]) => requestCameraPermissionsAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    requestMediaLibraryPermissionsAsync(...args),
  launchCameraAsync: (...args: any[]) => launchCameraAsync(...args),
}));

const { default: KycScreen } = require('@/app/kyc/index');

describe('KycVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
    cleanupMock.mockResolvedValue(undefined);
    recordAsyncMock.mockResolvedValue({ uri: 'file://liveness.mp4', durationMs: 4000 });
    requestExpoCameraPermissionMock.mockResolvedValue({ status: 'granted' });
    encryptForTenantMock.mockResolvedValue({
      document: { uri: 'ipfs://encrypted', hash: 'hash123' },
      artifacts: [
        {
          type: 'selfie-video',
          uri: 'ipfs://encrypted',
          hash: 'videohash',
          ts: 1700,
          nonce: 'nonce-video',
        },
      ],
      ts: 1700,
      nonce: 'bundle-nonce',
      sig: 'sig',
    });
    sendDMMock.mockResolvedValue(undefined);
    launchCameraAsync.mockResolvedValue({ canceled: true });
    getAdminPublicKeysMock.mockResolvedValue(['tenant-public']);
    getSettingValueMock.mockImplementation((key: string) => {
      if (key === 'appName') return 'Blue Ocean';
      return 'off';
    });
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

    launchCameraAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'file://id-front.jpg', mimeType: 'image/jpeg', fileName: 'front.jpg', fileSize: 2048 },
        ],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'file://id-back.jpg', mimeType: 'image/jpeg', fileName: 'back.jpg', fileSize: 2048 },
        ],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'file://selfie-id.jpg', mimeType: 'image/jpeg', fileName: 'selfie-id.jpg', fileSize: 4096 },
        ],
      });
    recordAsyncMock.mockResolvedValue({ uri: 'file://liveness.mp4', durationMs: 3800 });

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-id-front' }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-id-back' }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-selfie-id' }).props.onPress();
      await Promise.resolve();
    });

    const startButtons = tree.root.findAll(
      (node: any) => node.props?.title === 'התחל/י הקלטה',
    );
    expect(startButtons.length).toBeGreaterThan(0);

    await act(async () => {
      startButtons[0].props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-submit' }).props.onPress();
      await Promise.resolve();
    });

    expect(getAdminPublicKeysMock).toHaveBeenCalled();
    expect(encryptForTenantMock).toHaveBeenCalled();
    const filesArg = encryptForTenantMock.mock.calls[0][1];
    expect(filesArg).toHaveLength(4);
    expect(filesArg[0]).toMatchObject({ uri: 'file://id-front.jpg', artifactType: 'id-front' });
    expect(filesArg[1]).toMatchObject({ uri: 'file://id-back.jpg', artifactType: 'id-back' });
    expect(filesArg[2]).toMatchObject({ uri: 'file://selfie-id.jpg', artifactType: 'selfie-with-id' });
    expect(filesArg[3]).toMatchObject({ uri: 'file://liveness.mp4', artifactType: 'selfie-video' });
    expect(sendDMMock).toHaveBeenCalledWith(
      'tenant-public',
      'kyc.request',
      expect.objectContaining({
        userId: 'user-1',
        tenantId: 'tenant-1',
        bundle: expect.objectContaining({ artifacts: expect.any(Array), document: expect.any(Object) }),
      }),
    );
    expect(trackMock).toHaveBeenCalledWith('file://id-front.jpg');
    expect(trackMock).toHaveBeenCalledWith('file://liveness.mp4');
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

    launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://too-large.jpg',
          mimeType: 'image/jpeg',
          fileName: 'too-large.jpg',
          fileSize: 50 * 1024 * 1024,
        },
      ],
    });

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-id-front' }).props.onPress();
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

    launchCameraAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://id-front.jpg', mimeType: 'image/jpeg', fileName: 'front.jpg', fileSize: 2048 }],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://id-back.jpg', mimeType: 'image/jpeg', fileName: 'back.jpg', fileSize: 2048 }],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://selfie-id.jpg', mimeType: 'image/jpeg', fileName: 'selfie-id.jpg', fileSize: 4096 }],
      });
    recordAsyncMock.mockResolvedValue({ uri: 'file://liveness.mp4', durationMs: 3600 });
    sendDMMock.mockRejectedValueOnce(new Error('send failed'));

    const tree = render();

    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-id-front' }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-id-back' }).props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'kyc-capture-selfie-id' }).props.onPress();
      await Promise.resolve();
    });
    const startButtons = tree.root.findAll((node: any) => node.props?.title === 'התחל/י הקלטה');
    await act(async () => {
      startButtons[0].props.onPress();
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
